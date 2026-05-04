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

// Função auxiliar para chamada de IA com resiliência (Retry + Fallback)
async function callAIWithResilience(systemPrompt, promptWithContext) {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
  
  // 1. TENTATIVA COM GEMINI (Com 2 retentativas em caso de erro 503/429)
  for (let i = 0; i < 2; i++) {
    try {
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

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.',
          provider: 'Gemini'
        };
      }
      
      // Se for erro de demanda/servidor, espera um pouco e tenta de novo
      if (response.status === 503 || response.status === 429 || response.status >= 500) {
        console.warn(`Gemini instável (${response.status}). Tentativa ${i + 1} de 2...`);
        await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
        continue;
      }
      
      const errBody = await response.json().catch(() => ({}));
      throw new Error(`Erro Gemini: ${response.status} - ${errBody?.error?.message || 'Erro desconhecido'}`);
    } catch (e) {
      console.error(`Falha na tentativa ${i + 1} do Gemini:`, e);
      if (i === 1) break; // Sai do loop após a última tentativa
    }
  }

  // 2. FALLBACK PARA GROQ (Se Gemini falhar ou estiver sobrecarregado)
  if (GROQ_API_KEY) {
    try {
      console.info("Acionando fallback para Groq...");
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-specdec",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: promptWithContext }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const answer = data.choices[0].message.content;
        return {
          answer: answer + "\n\n*(Nota: Esta resposta foi gerada via backup Groq devido à instabilidade temporária nos servidores principais)*",
          provider: 'Groq'
        };
      }
    } catch (e) {
      console.error("Fallback Groq também falhou:", e);
    }
  }

  throw new Error("Os serviços de IA estão com demanda muito alta no momento. Por favor, tente novamente em alguns segundos.");
}

export async function askRAG(question) {
  try {
    const keywords = extractKeywords(question);
    const mainKw = keywords.find(k => k.length > 4);
    const digits = question.match(/\b\d+\b/g);
    const candidateChunksMap = new Map();

    // 1. Buscas Multi-Estratégia (FTS Expandido, OR, ILIKE, Números)
    const [resA, resB] = await Promise.all([
      supabase.from('rag_chunks').select('id, content, metadata, chunk_index, document_id')
        .textSearch('fts', expandTerms(question), { type: 'websearch', config: 'portuguese' }).limit(40),
      supabase.from('rag_chunks').select('id, content, metadata, chunk_index, document_id')
        .textSearch('fts', keywords.join(' OR '), { type: 'websearch', config: 'portuguese' }).limit(40)
    ]);

    if (resA.data) resA.data.forEach(c => candidateChunksMap.set(c.id, c));
    if (resB.data) resB.data.forEach(c => candidateChunksMap.set(c.id, c));

    if (mainKw) {
      const { data: chunksC } = await supabase.from('rag_chunks').select('id, content, metadata, chunk_index, document_id')
        .ilike('content', `%${mainKw}%`).limit(25);
      if (chunksC) chunksC.forEach(c => candidateChunksMap.set(c.id, c));
    }

    if (digits) {
      for (const num of digits) {
        const { data: chunksD } = await supabase.from('rag_chunks').select('id, content, metadata, chunk_index, document_id')
          .ilike('content', `%${num}%`).limit(20);
        if (chunksD) chunksD.forEach(c => candidateChunksMap.set(c.id, c));
      }
    }

    let candidateChunks = Array.from(candidateChunksMap.values());

    // 2. Algoritmo de Ranqueamento
    if (candidateChunks.length > 0) {
      candidateChunks.forEach(chunk => {
        let score = 0;
        const txt = (chunk.content || '').toLowerCase();
        for (const kw of keywords) {
          const matches = txt.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
          if (matches) score += matches.length * 3;
        }
        if (digits) {
          for (const num of digits) {
            if (new RegExp(`art\\.?\\s*${num}\\b|artigo\\s*${num}\\b`, 'i').test(txt)) score += 35;
            else if (new RegExp(`\\b${num}\\b`).test(txt)) score += 10;
          }
        }
        if (/definição|definir|conceito|o que é|entende-se|considera-se|descrição|descreve/i.test(question)) {
          if (/considera-se|entende-se|conceito|definição|objetivo|compreende/i.test(txt)) score += 20;
          if (mainKw && new RegExp(`considera-se\\s+.*${mainKw}`, 'i').test(txt)) score += 25;
        }
        chunk.score = score;
      });
      candidateChunks.sort((a, b) => b.score - a.score);
      candidateChunks = candidateChunks.slice(0, 4);
    }

    // 3. Blocos Vizinhos
    const allChunks = [];
    for (const chunk of candidateChunks) {
      if (chunk.document_id && typeof chunk.chunk_index === 'number') {
        const { data: neighbors } = await supabase.from('rag_chunks').select('id, content, metadata, chunk_index, document_id')
          .eq('document_id', chunk.document_id)
          .gte('chunk_index', Math.max(0, chunk.chunk_index - 1))
          .lte('chunk_index', chunk.chunk_index + 1)
          .order('chunk_index', { ascending: true });
        if (neighbors) allChunks.push(...neighbors);
        else allChunks.push(chunk);
      } else {
        allChunks.push(chunk);
      }
    }

    const uniqueChunks = [];
    const seen = new Set();
    for (const c of allChunks) {
      const key = `${c.document_id}_${c.chunk_index}`;
      if (!seen.has(key)) { seen.add(key); uniqueChunks.push(c); }
    }

    const contextText = uniqueChunks.map((c, i) => `[Trecho ${i + 1} de ${c.metadata?.source_file || 'Documento'}]:\n${c.content}`).join('\n\n');

    // 4. Prompt e Chamada Resiliente
    const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções:
- Baseie-se SEMPRE nas informações recuperadas do contexto para responder.
- Caso não haja informações suficientes no contexto, responda com base nas melhores práticas do direito urbanístico.
- Seja sempre profissional, claro, estruturado e técnico.`;

    const promptWithContext = `--- CONTEXTO RECUPERADO (RAG) ---
${contextText || 'Nenhuma informação legislativa encontrada no contexto.'}
--- FIM DO CONTEXTO ---

Pergunta do usuário: ${question}`;

    const { answer, provider } = await callAIWithResilience(systemPrompt, promptWithContext);

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

export async function getAuditHistory() { return [] }
