import { supabase } from './supabaseClient'

const BACKEND_URL = import.meta.env.MODE === 'development' ? '/api' : 'https://sisgestao.onrender.com'

export async function generateEmbedding(text) {
  const response = await fetch(`${BACKEND_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  if (!response.ok) throw new Error('Erro ao gerar embedding')
  const data = await response.json()
  return data.embedding
}

async function extractText(file) {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${BACKEND_URL}/extract`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) throw new Error('Erro ao extrair texto do PDF')
    const data = await response.json()
    return data.text
  }
  if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length === 0) return ''
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    return lines.slice(1).map(row => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''))
      return headers.map((h, i) => `${h}: ${values[i] || ''}`).join(' | ')
    }).join('\n')
  }
  return await file.text()
}

function chunkText(text, documentName) {
  const CHUNK_SIZE = 150
  const CHUNK_OVERLAP = 30
  const sections = text.split(/\n{2,}|\[Página \d+\]/).map(s => s.trim()).filter(s => s.length > 50)
  const chunks = []
  let index = 0
  for (const section of sections) {
    const words = section.split(' ')
    for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const content = words.slice(i, i + CHUNK_SIZE).join(' ')
      if (content.length < 100) continue
      chunks.push({
        content,
        chunk_index: index++,
        metadata: { source_file: documentName, section: section.substring(0, 60) }
      })
    }
  }
  return chunks
}

export async function uploadDocument(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${Date.now()}_${safeName}`
  const storagePath = `documents/${fileName}`
  const { error: storageError } = await supabase.storage
    .from('rag-documents')
    .upload(storagePath, file)
  if (storageError) throw new Error(`Erro no upload: ${storageError.message}`)
  const { data: doc, error: dbError } = await supabase
    .from('rag_documents')
    .insert({ name: file.name, type: file.type, size: file.size, storage_path: storagePath })
    .select().single()
  if (dbError) throw new Error(`Erro ao registrar: ${dbError.message}`)
  return doc
}

export async function ingestDocument(file, onProgress) {
  onProgress?.('Fazendo upload para o repositório...')
  const doc = await uploadDocument(file)

  onProgress?.('Iniciando processamento (Backend)...')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_id', doc.id)
  formData.append('document_name', file.name)
  
  const response = await fetch(`${BACKEND_URL}/process_document`, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro interno no backend ao processar documento')
  }
  
  const result = await response.json()
  const jobId = result.job_id

  // Polling de progresso e status do job em tempo real
  let progress = 0
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    const statusResponse = await fetch(`${BACKEND_URL}/job_status/${jobId}`)
    if (!statusResponse.ok) {
      throw new Error('Erro ao consultar o status de processamento do documento')
    }
    const jobData = await statusResponse.json()
    if (jobData.status === 'completed') {
      onProgress?.('Concluído!')
      return { document: doc, chunks_count: jobData.chunks_count || 0 }
    }
    if (jobData.status === 'failed') {
      throw new Error(jobData.error || 'Falha no processamento em segundo plano do documento')
    }
    progress = jobData.progress || 0
    onProgress?.(`Vetorizando e salvando (${progress}%)`)
  }
}

export async function listDocuments() {
  const { data, error } = await supabase.from('rag_documents')
    .select('id, name, type, size, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export async function deleteDocument(documentId) {
  const { error } = await supabase.from('rag_documents').delete().eq('id', documentId)
  if (error) throw new Error(error.message)
}
