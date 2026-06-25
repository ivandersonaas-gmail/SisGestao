import { supabase } from './supabaseClient'
import { GoogleGenAI } from '@google/genai'

const VITE_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: VITE_GEMINI_API_KEY });

export async function askRAG(question) {
  try {
    // 1. Gerar o Embedding da Pergunta via SDK oficial (@google/genai)
    const response = await ai.models.embedContent({ 
        model: 'gemini-embedding-001', 
        contents: question,
        config: { outputDimensionality: 384 }
    });
    
    if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error("Erro API Gemini: Nenhuma matriz de embedding retornada.");
    }
    
    const queryEmbedding = response.embeddings[0].values;

    // 2. Busca Híbrida no Supabase via RPC
    const { data: matchedChunks, error: rpcError } = await supabase.rpc('match_rag_chunks_hybrid', {
      query_embedding: queryEmbedding,
      query_text: question,
      match_threshold: 0.3,
      match_count: 10
    });

    if (rpcError) throw rpcError;

    if (!matchedChunks || matchedChunks.length === 0) {
      return {
        answer: "Não encontrei informações relevantes nos documentos da base para responder à sua pergunta. Verifique se os documentos foram devidamente processados e indexados com embeddings.",
        grounded: false,
        sources: [],
        token_usage: null
      };
    }

    // 3. Montar Contexto Parcial com os Top-K
    let contextText = '';
    const sourcesMap = new Set();

    matchedChunks.forEach((chunk, i) => {
      const docName = chunk.metadata?.source_file || 'Documento Desconhecido';
      sourcesMap.add(docName);
      contextText += `[Trecho ${i + 1} - Origem: ${docName} - Similaridade (Score): ${(chunk.similarity * 100).toFixed(1)}%]\n`;
      contextText += `${chunk.content}\n\n`;
    });

    const sources = Array.from(sourcesMap);

    // 4. Prompt para a LLM (Gemini 2.5 Flash)
    const systemPrompt = `Você é um consultor técnico urbanístico especialista e analista sênior do sistema SisGestão.
Você ajudará a responder dúvidas sobre processos, legislações, pareceres técnicos e diretrizes urbanas municipais.
Instruções Ouro:
- Responda SEMPRE com base estrita nos trechos fornecidos no contexto.
- Se a pergunta se referir a artigos, cite-os textualmente com precisão cirúrgica.
- Não invente nem extrapole nenhuma informação. Se não constar no contexto, diga claramente.
- Seja sempre profissional, claro, estruturado e técnico.`;

    const promptWithContext = `--- CONTEXTO RECUPERADO DA BASE (TOP-K) ---
${contextText}
---- FIM DO CONTEXTO ---

Pergunta do usuário: ${question}`;

    // 5. Chamada à API do Gemini para gerar a resposta final via SDK
    const geminiRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${promptWithContext}`
    });

    const answer = geminiRes.text || 'Nenhuma resposta gerada.';
    let token_usage = null;

    if (geminiRes.usageMetadata) {
      token_usage = {
        prompt_tokens: geminiRes.usageMetadata.promptTokenCount || 0,
        response_tokens: geminiRes.usageMetadata.candidatesTokenCount || 0,
        total_tokens: geminiRes.usageMetadata.totalTokenCount || 0
      };
    }

    return {
      answer,
      grounded: true,
      sources,
      token_usage
    };

  } catch (error) {
    console.error("Falha geral no serviço RAG (Busca Híbrida):", error);
    throw new Error("Os serviços de IA estão indisponíveis ou ocorreu um erro de conexão. Tente novamente mais tarde.");
  }
}

export async function getAuditHistory() { return [] }


