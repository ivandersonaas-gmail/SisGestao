import { supabase } from './supabaseClient'

const VITE_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

function extractKeywords(q) {
  return q.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(k => k.length > 2 && !['para', 'como', 'onde', 'qual', 'quem', 'diga', 'sobre', 'artigo', 'plano', 'diretor', 'codigo', 'obras'].includes(k));
}

function expandTerms(q) {
  let expanded = q;
  const match = q.match(/(artigo|art\.?)\s*(\d+)/i);
  if (match) {
    const num = match[2];
    expanded = `("artigo ${num}" OR "art. ${num}" OR "art ${num}")`;
  }
  return expanded;
}

export async function askRAG(question) {
  // ARQUITETURA SAAS 100% ONLINE E SERVERLESS (Executada direto no navegador do cliente)
  try {
    const keywords = extractKeywords(question);
    const mainKw = keywords.find(k => k.length > 4);
    const digits = question.match(/\b\d+\b/g);
    const candidateChunksMap = new Map();

    // Busca Multi-Estratégia direto no Supabase
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

    // Algoritmo de Ranqueamento Avançado
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

    // Blocos Vizinhos
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

    // Prompt do Oráculo
    const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções:
- Baseie-se SEMPRE nas informações recuperadas do contexto para responder.
- Caso não haja informações suficientes no contexto, responda com base nas melhores práticas do direito urbanístico.
- Seja sempre profissional, claro, estruturado e técnico.`;

    const promptWithContext = `--- CONTEXTO RECUPERADO (RAG) ---
${contextText || 'Nenhuma informação legislativa encontrada no contexto.'}
---- FIM DO CONTEXTO ---

Pergunta do usuário: ${question}`;

    // Chamada Direta ao Gemini com cálculo de tokens
    let answer = '';
    let token_usage = null;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${VITE_GEMINI_API_KEY}`, {
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

    if (geminiRes.ok) {
      const data = await geminiRes.json();
      answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada.';
      if (data.usageMetadata) {
        token_usage = {
          prompt_tokens: data.usageMetadata.promptTokenCount || 0,
          response_tokens: data.usageMetadata.candidatesTokenCount || 0,
          total_tokens: data.usageMetadata.totalTokenCount || 0
        };
      }
    } else {
      throw new Error(`Erro Gemini: ${geminiRes.status}`);
    }

    return {
      answer,
      grounded: !!contextText,
      sources: uniqueChunks ? [...new Set(uniqueChunks.map(c => c.metadata?.source_file).filter(Boolean))] : [],
      token_usage
    };

  } catch (clientErr) {
    console.warn("Gemini direto falhou. Tentando fallback Groq...", clientErr);
    try {
      const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções:
- Baseie-se SEMPRE nas informações recuperadas do contexto para responder.
- Caso não haja informações suficientes no contexto, responda com base nas melhores práticas do direito urbanístico.
- Seja sempre profissional, claro, estruturado e técnico.`;
      
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
            { role: "user", content: question }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.choices[0].message.content + "\n\n*(Nota: Resposta gerada via Groq devido à instabilidade do Gemini)*",
          grounded: false,
          sources: [],
          token_usage: data.usage ? {
            prompt_tokens: data.usage.prompt_tokens || 0,
            response_tokens: data.usage.completion_tokens || 0,
            total_tokens: data.usage.total_tokens || 0
          } : null
        };
      }
    } catch (groqErr) {
      console.error("Todos os serviços falharam:", groqErr);
    }
    
    throw new Error("Os serviços de IA estão com demanda muito alta no momento. Por favor, tente novamente em alguns segundos.");
  }
}

export async function getAuditHistory() { return [] }


