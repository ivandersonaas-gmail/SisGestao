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
  onProgress?.('Registrando documento no repositório...')
  const doc = await uploadDocument(file)

  onProgress?.('Enviando para o Motor de IA (LlamaParse)...')
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_id', doc.id);
  formData.append('document_name', doc.name);

  try {
    const response = await fetch('http://127.0.0.1:8000/api/process_document', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao iniciar processamento no backend');
    }

    const data = await response.json();
    const jobId = data.job_id;

    // Polling job status
    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`http://127.0.0.1:8000/api/job_status/${jobId}`);
      if (!statusRes.ok) throw new Error('Falha ao checar status do processamento');
      
      const statusData = await statusRes.json();
      
      if (statusData.status === 'failed') {
        throw new Error(statusData.error || 'Erro interno ao extrair texto do PDF');
      }
      
      if (statusData.status === 'completed') {
        onProgress?.('Chunking Semântico concluído com sucesso!');
        break;
      }
      
      onProgress?.(`Processando (Alta Fidelidade): ${statusData.progress || 0}%...`);
    }

    return { document: doc };
  } catch (err) {
    console.error("Erro no backend:", err);
    throw new Error(`Erro na IA do Backend: ${err.message}`);
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
