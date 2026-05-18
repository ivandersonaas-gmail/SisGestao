import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Upload, Send, FileText, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { askRAG } from '../../services/ragService'
import { ingestDocument, listDocuments, deleteDocument } from '../../services/documentService'
import styles from './RAGChat.module.css'

const WELCOME_MESSAGE = {
  id: 'welcome', role: 'assistant',
  content: 'Olá! Sou o assistente de análise de documentos do SisGestão. Faça upload de um ou mais documentos (PDF, CSV, TXT) e me faça perguntas. Responderei com base exclusivamente no conteúdo enviado.',
  grounded: true, timestamp: new Date(),
}

export default function RAGChat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [documents, setDocuments] = useState([])
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => { loadDocuments() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadDocuments() {
    try { setDocuments(await listDocuments()) } catch (e) { console.error(e) }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true); setError(null)
    try {
      for (const file of files) {
        await ingestDocument(file, msg => setUploadMsg(`${file.name}: ${msg}`))
        setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'system', content: `✅ Documento "${file.name}" processado com sucesso!`, timestamp: new Date() }])
      }
      await loadDocuments()
    } catch (err) { setError(`Erro ao processar documento: ${err.message}`) }
    finally { setUploading(false); setUploadMsg(''); e.target.value = '' }
  }

  async function handleSend() {
    const q = question.trim()
    if (!q || loading) return
    if (documents.length === 0) { setError('Faça upload de pelo menos um documento antes de fazer perguntas.'); return }
    setQuestion(''); setError(null)
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: q, timestamp: new Date() }])
    setLoading(true)
    try {
      const result = await askRAG(q)
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: result.answer, grounded: result.grounded, sources: result.sources, token_usage: result.token_usage, timestamp: new Date() }])
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'error', content: `Erro: ${err.message}`, timestamp: new Date() }])
    } finally { setLoading(false) }
  }

  async function handleDelete(docId, docName) {
    if (!confirm(`Remover "${docName}"?`)) return
    try { await deleteDocument(docId); await loadDocuments() } catch (err) { setError(`Erro ao remover: ${err.message}`) }
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}><FileText size={16} /><span>Documentos ({documents.length})</span></div>
        <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload size={14} />{uploading ? uploadMsg || 'Processando...' : 'Adicionar documentos'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.csv,.md" multiple onChange={handleUpload} style={{ display: 'none' }} />
        <div className={styles.docList}>
          {documents.length === 0 && <p className={styles.emptyDocs}>Nenhum documento ainda</p>}
          {documents.map(doc => (
            <div key={doc.id} className={styles.docItem}>
              <FileText size={13} />
              <span className={styles.docName} title={doc.name}>{doc.name.length > 28 ? doc.name.substring(0, 26) + '…' : doc.name}</span>
              <button className={styles.deleteBtn} onClick={() => handleDelete(doc.id, doc.name)} title="Remover"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </aside>
      <main className={styles.chat}>
        <div className={styles.messages}>
          {messages.map(msg => (
            <div key={msg.id} className={[styles.message, styles[`message_${msg.role}`]].join(' ')}>
              {msg.role === 'assistant' && (
                <div className={styles.msgHeader}>
                  <MessageCircle size={13} /><span>Assistente IA</span>
                  {msg.grounded !== undefined && (msg.grounded
                    ? <span className={styles.groundedOk}><CheckCircle size={11} /> Baseado nos documentos</span>
                    : <span className={styles.groundedWarn}><AlertCircle size={11} /> Verificar fontes</span>)}
                </div>
              )}
              <p className={styles.msgContent}>{msg.content}</p>
              {msg.sources?.length > 0 && (
                <div className={styles.sources}>
                  <span>Fontes:</span>
                  {msg.sources.map((s, i) => <span key={i} className={styles.sourceTag}>{s}</span>)}
                </div>
              )}
              {msg.token_usage && (() => {
                const oneMinuteAgo = new Date(msg.timestamp.getTime() - 60000);
                const tokensLastMin = messages
                  .filter(m => m.timestamp >= oneMinuteAgo && m.timestamp <= msg.timestamp && m.token_usage)
                  .reduce((sum, m) => sum + m.token_usage.total_tokens, 0);
                const remaining = Math.max(0, 1000000 - tokensLastMin);
                
                return (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#888', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                    <span>📊 <b>Custo desta Pergunta:</b> {msg.token_usage.total_tokens.toLocaleString('pt-BR')} tokens</span>
                    <br/>
                    <span>⏱️ <b>Gasto no último minuto:</b> {tokensLastMin.toLocaleString('pt-BR')} tokens</span>
                    <br/>
                    <span style={{color: remaining < 100000 ? '#d32f2f' : '#2e7d32'}}>
                      🔋 <b>Saldo Gratuito Restante:</b> {remaining.toLocaleString('pt-BR')} / 1.000.000 tokens
                    </span>
                  </div>
                );
              })()}
              <span className={styles.msgTime}>{msg.timestamp?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
          {loading && <div className={[styles.message, styles.message_assistant].join(' ')}><div className={styles.typing}><span /><span /><span /></div></div>}
          <div ref={messagesEndRef} />
        </div>
        {error && <div className={styles.errorBar}><AlertCircle size={14} />{error}<button onClick={() => setError(null)}>✕</button></div>}
        <div className={styles.inputArea}>
          <textarea className={styles.input} value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Faça uma pergunta sobre os documentos... (Enter para enviar)" rows={2} disabled={loading || uploading} />
          <button className={styles.sendBtn} onClick={handleSend} disabled={loading || uploading || !question.trim()}><Send size={16} /></button>
        </div>
        <p className={styles.disclaimer}>As respostas são baseadas exclusivamente nos documentos carregados.</p>
      </main>
    </div>
  )
}
