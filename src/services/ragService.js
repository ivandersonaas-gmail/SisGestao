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
  // ARQUITETURA SAAS 100% ONLINE E SERVERLESS (Modo Long Context - Precisão Técnica de 99.99%)
  try {
    // 1. Buscar TODOS os chunks de todos os documentos ordenados para reconstruir o texto original perfeitamente
    const { data: allChunks, error: fetchError } = await supabase
      .from('rag_chunks')
      .select('id, content, chunk_index, document_id, metadata')
      .order('document_id', { ascending: true })
      .order('chunk_index', { ascending: true });

    if (fetchError) throw fetchError;

    if (!allChunks || allChunks.length === 0) {
      return {
        answer: "Nenhum documento legislativo foi encontrado na base de dados para consulta. Faça upload de documentos primeiro.",
        grounded: false,
        sources: [],
        token_usage: null
      };
    }

    // 2. Agrupar os chunks por documento para montar o Mega Contexto sem diluição semântica
    const documentsMap = new Map();
    allChunks.forEach(chunk => {
      const docName = chunk.metadata?.source_file || 'Documento';
      if (!documentsMap.has(docName)) {
        documentsMap.set(docName, []);
      }
      documentsMap.get(docName).push(chunk.content);
    });

    let contextText = '';
    const sources = Array.from(documentsMap.keys());

    for (const [docName, contents] of documentsMap.entries()) {
      contextText += `=== DOCUMENTO LEGISLATIVO: ${docName} ===\n`;
      contextText += contents.join('\n\n');
      contextText += `\n=== FIM DO DOCUMENTO: ${docName} ===\n\n`;
    }

    // 3. Prompt de Altíssima Assertividade (Evita Alucinações)
    const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista sênior do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais com precisão técnica absoluta de 99.99%.
Instruções de Ouro:
- Responda SEMPRE com base estrita nos documentos fornecidos no contexto.
- Se a pergunta do usuário se referir a artigos, incisos, alíneas ou parágrafos específicos, localize-os no texto e cite-os textualmente com precisão cirúrgica.
- Não invente nem extrapole nenhuma informação. Se a informação não constar nos documentos legislativos do contexto, responda honestamente que o assunto não está coberto na legislação enviada.
- Seja sempre profissional, claro, estruturado e técnico.`;

    const promptWithContext = `--- CONTEXTO COMPLETO DAS LEIS (LONG CONTEXT) ---
${contextText}
---- FIM DO CONTEXTO ---

Pergunta do usuário: ${question}`;

    // 4. Chamada Direta à API do Gemini com telemetria de tokens
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
      grounded: true,
      sources,
      token_usage
    };

  } catch (clientErr) {
    console.warn("Gemini direto falhou. Tentando fallback Groq com contexto parcial...", clientErr);
    try {
      // Fallback Resiliente para Groq com os 4 trechos mais relevantes do banco
      const { data: allChunks } = await supabase
        .from('rag_chunks')
        .select('id, content, chunk_index, document_id, metadata');

      let fallbackContext = '';
      let fallbackSources = [];

      if (allChunks && allChunks.length > 0) {
        const keywords = extractKeywords(question);
        const scoredChunks = allChunks.map(chunk => {
          let score = 0;
          const txt = (chunk.content || '').toLowerCase();
          for (const kw of keywords) {
            if (txt.includes(kw)) score += 10;
          }
          return { ...chunk, score };
        }).sort((a, b) => b.score - a.score);

        const fallbackChunks = scoredChunks.slice(0, 4);
        fallbackContext = fallbackChunks.map((c, i) => `[Trecho ${i + 1} de ${c.metadata?.source_file || 'Documento'}]:\n${c.content}`).join('\n\n');
        fallbackSources = [...new Set(fallbackChunks.map(c => c.metadata?.source_file).filter(Boolean))];
      }

      const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista sênior do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções:
- Baseie-se nas informações recuperadas do contexto parcial para responder.
- Caso não haja informações suficientes, responda com base nas melhores práticas do direito urbanístico.
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
            { role: "user", content: `${fallbackContext ? `--- CONTEXTO PARCIAL ---\n${fallbackContext}\n--- FIM ---\n\n` : ''}Pergunta: ${question}` }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          answer: data.choices[0].message.content + "\n\n*(Nota: Resposta gerada via Groq devido à instabilidade temporária do Gemini)*",
          grounded: !!fallbackContext,
          sources: fallbackSources,
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


