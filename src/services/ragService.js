const BACKEND_URL = import.meta.env.MODE === 'development' ? '/api' : 'https://sisgestao.onrender.com'

export async function askRAG(question) {
  const response = await fetch(`${BACKEND_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Erro: ${response.status} - ${err.detail || err.traceback || ''}`)
  }
  return await response.json()
}

export async function getAuditHistory() { return [] }
