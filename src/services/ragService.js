export async function askRAG(question) {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, use_cache: true }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(`Erro na API do Oráculo Avançado: ${errBody.error || response.statusText}`);
    }

    const data = await response.json();
    
    // Retorna a resposta limpa e formatada do Backend Python
    return {
      answer: data.answer,
      grounded: data.grounded,
      sources: data.sources || [],
      token_usage: data.token_usage || null
    };
  } catch (err) {
    console.error('Erro de comunicação com o Backend (askRAG):', err);
    throw err;
  }
}

export async function getAuditHistory() { return [] }
