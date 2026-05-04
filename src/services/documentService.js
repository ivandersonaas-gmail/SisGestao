import { supabase } from './supabaseClient'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '5.7.284'}/pdf.worker.min.js`

export async function generateEmbedding(text) {
  return new Array(384).fill(0)
}

async function extractText(file) {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map(item => item.str).join(' ')
        fullText += pageText + '\n'
      }
      return fullText
    } catch (err) {
      console.error('Error extracting text from PDF:', err)
      throw new Error('Falha ao extrair o texto do PDF no navegador.')
    }
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

  onProgress?.('Extraindo texto do documento (Navegador)...')
  const text = await extractText(file)

  onProgress?.('Processando e salvando trechos...')
  const chunks = chunkText(text, file.name)
  
  const chunksToInsert = chunks.map(c => ({
    document_id: doc.id,
    content: c.content,
    chunk_index: c.chunk_index,
    metadata: c.metadata,
    embedding: new Array(384).fill(0)
  }))

  // Insere em lotes de 50
  for (let i = 0; i < chunksToInsert.length; i += 50) {
    const { error } = await supabase
      .from('rag_chunks')
      .insert(chunksToInsert.slice(i, i + 50))
    if (error) throw new Error(`Erro ao salvar trechos no Supabase: ${error.message}`)
  }

  onProgress?.('Concluído!')
  return { document: doc, chunks_count: chunksToInsert.length }
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
