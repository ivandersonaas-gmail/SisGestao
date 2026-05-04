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

    // Passo A: Busca usando a pergunta inteira expandida (Padrão SGLU)
    let { data: chunks, error } = await supabase
      .from('rag_chunks')
      .select('id, content, metadata, chunk_index, document_id')
      .textSearch('fts', expandTerms(question), {
        type: 'websearch',
        config: 'portuguese'
      })
      .limit(10);

    if (error) console.error('Erro na busca inicial:', error);

    // Passo B: Busca flexível por OR com palavras-chave
    if (!chunks || chunks.length === 0) {
      const broadSearch = keywords.join(' OR ');
      const { data: flexChunks, error: flexErr } = await supabase
        .from('rag_chunks')
        .select('id, content, metadata, chunk_index, document_id')
        .textSearch('fts', broadSearch, {
          type: 'websearch',
          config: 'portuguese'
        })
        .limit(10);

      if (flexErr) console.error('Erro na busca flexível:', flexErr);
      if (flexChunks && flexChunks.length > 0) {
        chunks = flexChunks;
      }
    }

    // Passo C: Fallback com ILIKE
    if (!chunks || chunks.length === 0) {
      const mainKeyword = keywords[0] || question;
      const { data: fallbackChunks } = await supabase
        .from('rag_chunks')
        .select('id, content, metadata, chunk_index, document_id')
        .ilike('content', `%${mainKeyword}%`)
        .limit(10);

      if (fallbackChunks && fallbackChunks.length > 0) {
        chunks = fallbackChunks;
      }
    }

    // Algoritmo de Ranqueamento de Relevância por Palavras-Chave (Simulação Semântica)
    if (chunks && chunks.length > 0) {
      chunks.forEach(chunk => {
        let score = 0;
        const txt = (chunk.content || '').toLowerCase();
        for (const kw of keywords) {
          const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          const matches = txt.match(regex);
          if (matches) score += matches.length;
        }
        // Bônus para trechos conceituais e de definição
        if (/considera-se|entende-se|definição|conceito|objetivo|compreende/i.test(txt)) {
          score += 5;
        }
        chunk.score = score;
      });

      chunks.sort((a, b) => b.score - a.score);
      chunks = chunks.slice(0, 3); // Fica com os 3 chunks de maior relevância
    }

    // 2. Busca dos blocos vizinhos para trazer o artigo completo sem cortes
    const allChunks = [];
    if (chunks && chunks.length > 0) {
      for (const chunk of chunks) {
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

    // 3. Remove blocos duplicados
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

    // 4. Constrói o Prompt Mestre
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

    // 5. Chamada direta para a API do Gemini
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
