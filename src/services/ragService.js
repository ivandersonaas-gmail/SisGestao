import { supabase } from './supabaseClient'

function extractKeywords(query) {
  const stopwords = ['qual', 'é', 'a', 'o', 'que', 'diga', 'define', 'significa', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'os', 'as', 'existe', 'algum', 'tipo', 'sobre', 'diga', 'artigo', 'descreve', 'descreve-o', 'compõem'];
  const cleaned = query.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => (w.length > 2 || /\d+/.test(w)) && !stopwords.includes(w));
  return words.length > 0 ? words : [query];
}

function expandTerms(query) {
  const match = query.match(/(artigo|art\.?)\s*(\d+)/i)
  if (match) {
    const num = match[2]
    return `${query} OR "artigo ${num}" OR "art. ${num}" OR "art ${num}"`
  }
  return query
}

export async function askRAG(question) {
  try {
    const keywords = extractKeywords(question);
    const mainKw = keywords.find(k => k.length > 4);

    // Identificação de dígitos/números de artigos citados na pergunta
    const digits = question.match(/\b\d+\b/g);

    // Armazenamento unificado de chunks candidatos para ranqueamento
    const candidateChunksMap = new Map();

    // 1. Técnica A: Busca via Full-Text Search (pergunta inteira expandida)
    const { data: chunksA } = await supabase
      .from('rag_chunks')
      .select('id, content, metadata, chunk_index, document_id')
      .textSearch('fts', expandTerms(question), {
        type: 'websearch',
        config: 'portuguese'
      })
      .limit(40);

    if (chunksA) {
      chunksA.forEach(c => candidateChunksMap.set(c.id, c));
    }

    // 2. Técnica B: Busca via Full-Text Search flexível por palavras-chave
    const broadSearch = keywords.join(' OR ');
    const { data: chunksB } = await supabase
      .from('rag_chunks')
      .select('id, content, metadata, chunk_index, document_id')
      .textSearch('fts', broadSearch, {
        type: 'websearch',
        config: 'portuguese'
      })
      .limit(40);

    if (chunksB) {
      chunksB.forEach(c => candidateChunksMap.set(c.id, c));
    }

    // 3. Técnica C: Busca exata via ILIKE para o principal termo
    if (mainKw) {
      const { data: chunksC } = await supabase
        .from('rag_chunks')
        .select('id, content, metadata, chunk_index, document_id')
        .ilike('content', `%${mainKw}%`)
        .limit(25);

      if (chunksC) {
        chunksC.forEach(c => candidateChunksMap.set(c.id, c));
      }
    }

    // 4. Técnica D: Busca específica por números se houver dígitos (ex: 81 para Art. 81)
    if (digits && digits.length > 0) {
      for (const num of digits) {
        const { data: chunksD } = await supabase
          .from('rag_chunks')
          .select('id, content, metadata, chunk_index, document_id')
          .ilike('content', `%${num}%`)
          .limit(20);

        if (chunksD) {
          chunksD.forEach(c => candidateChunksMap.set(c.id, c));
        }
      }
    }

    let candidateChunks = Array.from(candidateChunksMap.values());

    // 5. Algoritmo Avançado de Ranqueamento de Relevância
    if (candidateChunks && candidateChunks.length > 0) {
      candidateChunks.forEach(chunk => {
        let score = 0;
        const txt = (chunk.content || '').toLowerCase();

        // Critério 1: Proximidade e contagem de palavras-chave da busca
        for (const kw of keywords) {
          const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = txt.match(regex);
          if (matches) score += matches.length * 3;
        }

        // Critério 2: Menção exata a artigos caso o usuário tenha digitado um número
        if (digits && digits.length > 0) {
          for (const num of digits) {
            if (new RegExp(`art\\.?\\s*${num}\\b|artigo\\s*${num}\\b`, 'i').test(txt)) {
              score += 35; // Altíssimo bônus para o artigo exato
            } else if (new RegExp(`\\b${num}\\b`).test(txt)) {
              score += 10; // Bônus por conter o número
            }
          }
        }

        // Critério 3: Identificação de conceitos e definições
        const isDefinitionQuery = /definição|definir|conceito|o que é|entende-se|considera-se|descrição|descreve/i.test(question);
        if (isDefinitionQuery) {
          if (/considera-se|entende-se|conceito|definição|objetivo|compreende/i.test(txt)) {
            score += 20;
          }
          if (mainKw && new RegExp(`considera-se\\s+.*${mainKw}`, 'i').test(txt)) {
            score += 25; // Super bônus por definição direta
          }
        }

        // Critério 4: Relevância adicional por palavras importantes
        if (/petrolina|plano diretor/i.test(txt)) {
          score += 2;
        }

        chunk.score = score;
      });

      // Ordena por score decrescente
      candidateChunks.sort((a, b) => b.score - a.score);
      candidateChunks = candidateChunks.slice(0, 4); // Fica com os 4 melhores chunks
    }

    // 6. Busca dos blocos vizinhos para trazer o artigo completo sem cortes
    const allChunks = [];
    if (candidateChunks && candidateChunks.length > 0) {
      for (const chunk of candidateChunks) {
        if (chunk.document_id && typeof chunk.chunk_index === 'number') {
          const { data: neighbors } = await supabase
            .from('rag_chunks')
            .select('id, content, metadata, chunk_index, document_id')
            .eq('document_id', chunk.document_id)
            .gte('chunk_index', Math.max(0, chunk.chunk_index - 1))
            .lte('chunk_index', chunk.chunk_index + 1)
            .order('chunk_index', { ascending: true });

          if (neighbors && neighbors.length > 0) {
            allChunks.push(...neighbors);
          } else {
            allChunks.push(chunk);
          }
        } else {
          allChunks.push(chunk);
        }
      }
    }

    // 7. Remove blocos duplicados preservando a ordem
    const uniqueChunks = [];
    const seen = new Set();
    for (const c of allChunks) {
      const key = `${c.document_id}_${c.chunk_index}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueChunks.push(c);
      }
    }

    let contextText = '';
    if (uniqueChunks && uniqueChunks.length > 0) {
      contextText = uniqueChunks.map((c, i) => {
        const file = c.metadata?.source_file || 'Documento'
        return `[Trecho ${i + 1} de ${file}]:\n${c.content}`;
      }).join('\n\n');
    }

    // 8. Constrói o Prompt Mestre
    const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções:
- Baseie-se SEMPRE nas informações recuperadas do contexto para responder.
- Caso não haja informações suficientes no contexto, responda com base nas melhores práticas do direito urbanístico.
- Seja sempre profissional, claro, estruturado e técnico.`;

    const promptWithContext = `--- CONTEXTO RECUPERADO (RAG) ---
${contextText || 'Nenhuma informação legislativa ou documento específico encontrado no contexto.'}
--- FIM DO CONTEXTO ---

Pergunta do usuário: ${question}`;

    // 9. Chamada direta para a API do Gemini
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!GEMINI_API_KEY) {
      throw new Error('A chave de API do Gemini (VITE_GEMINI_API_KEY) não foi configurada.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${promptWithContext}` }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(`Erro na API do Gemini: ${response.status} - ${errData?.error?.message || 'Erro desconhecido'}`);
    }

    const resData = await response.json();
    const answer = resData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada pela IA.';

    return {
      answer,
      grounded: !!contextText,
      sources: uniqueChunks ? [...new Set(uniqueChunks.map(c => c.metadata?.source_file).filter(Boolean))] : []
    };
  } catch (err) {
    console.error('Erro no askRAG:', err);
    throw err;
  }
}

export async function getAuditHistory() {
  return []
}
