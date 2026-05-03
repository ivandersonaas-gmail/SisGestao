export async function askRAG(question) {
  const response = await fetch('/api/ask', {
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
