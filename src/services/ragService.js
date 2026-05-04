import { supabase } from './supabaseClient'

export async function askRAG(question) {
  try {
    // 1. Busca textual de contexto no Supabase
    const { data: chunks, error } = await supabase
      .from('rag_chunks')
      .select('content, metadata')
      .textSearch('fts', question, {
        type: 'websearch',
        config: 'portuguese'
      })
      .limit(6)

    if (error) console.error('Erro na busca textual (RAG):', error)

    let contextText = ''
    if (chunks && chunks.length > 0) {
      contextText = chunks.map((c, i) => {
        const file = c.metadata?.source_file || 'Documento'
        return `[Trecho ${i + 1} de ${file}]:\n${c.content}`
      }).join('\n\n')
    }

    // 2. Constrói o Prompt Mestre
    const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções:
- Baseie-se SEMPRE nas informações recuperadas do contexto para responder.
- Caso não haja informações suficientes no contexto, informe que não encontrou referências exatas mas responda com base nas melhores práticas do direito urbanístico.
- Seja sempre profissional, claro, estruturado e técnico.`

    const promptWithContext = `--- CONTEXTO RECUPERADO (RAG) ---
${contextText || 'Nenhuma informação legislativa ou documento específico encontrado no contexto.'}
--- FIM DO CONTEXTO ---

Pergunta do usuário: ${question}`

    // 3. Chamada direta para a API do Gemini
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyBOIAKkn7hWAZl2xZlw6O5Pm7faD48Px5g'
    if (!GEMINI_API_KEY) {
      throw new Error('A chave de API do Gemini (VITE_GEMINI_API_KEY) não foi configurada.')
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

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
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(`Erro na API do Gemini: ${response.status} - ${errData?.error?.message || 'Erro desconhecido'}`)
    }

    const resData = await response.json()
    const answer = resData?.candidates?.[0]?.content?.parts?.[0]?.text || 'Nenhuma resposta gerada pela IA.'

    return {
      answer,
      grounded: !!contextText,
      sources: chunks ? [...new Set(chunks.map(c => c.metadata?.source_file).filter(Boolean))] : []
    }
  } catch (err) {
    console.error('Erro no askRAG:', err)
    throw err
  }
}

export async function getAuditHistory() {
  return []
}
