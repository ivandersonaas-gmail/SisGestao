import { supabase } from './supabaseClient'

export async function uploadDocument(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${Date.now()}_${safeName}`
  const storagePath = `documents/${fileName}`
  
  const { error: storageError } = await supabase.storage
    .from('rag-documents')
    .upload(storagePath, file)
    
  if (storageError) throw new Error(`Erro no upload para o Storage: ${storageError.message}`)
  
  const { data: doc, error: dbError } = await supabase
    .from('rag_documents')
    .insert({ name: file.name, type: file.type, size: file.size, storage_path: storagePath })
    .select().single()
    
  if (dbError) throw new Error(`Erro ao registrar no banco: ${dbError.message}`)
  
  // Gatilho Local: Avisar o processador_pdf.py imediatamente!
  try {
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record: doc })
    });
  } catch (err) {
    console.warn("Aviso: O processador_pdf.py local parece estar desligado.", err);
  }
  
  return doc
}

export async function ingestDocument(file, onProgress) {
  try {
    onProgress?.('Enviando documento para o servidor...')
    const doc = await uploadDocument(file)
    onProgress?.('Documento enviado com sucesso! Aguardando processamento pelo backend.')
    return { document: doc };
  } catch (err) {
    console.error("Erro na ingestão:", err);
    throw new Error(`Erro ao transferir arquivo: ${err.message}`);
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
