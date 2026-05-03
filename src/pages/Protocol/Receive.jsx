import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Scan } from 'lucide-react';

export function Receive() {
  const { user } = useAuth();
  const [protocol, setProtocol] = useState('');
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState({text:'', type:''});
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState([]);

  const loadPending = async () => {
    try {
      const data = await api.getProcesses(user.role, user.id, {status: 'ENC_ANALISE'});
      setPending(data);
    } catch(e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    loadPending();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReceive = async (e) => {
    e.preventDefault();
    if(!protocol.trim()) return;
    setLoading(true);
    setMsg({text:'', type:''});
    try {
      const procs = await api.getProcesses('admin', '', {search: protocol.trim()});
      const pMatch = procs.find(x => x.protocol === protocol.trim().toUpperCase());
      
      if(!pMatch) {
        setMsg({text:`Processo ${protocol} não encontrado no sistema.`, type:'err'});
      } else if(pMatch.current_status !== 'ENC_ANALISE') {
        setMsg({text:`O processo ${protocol} consta como '${pMatch.current_status}' e não 'Enviado ao Setor de Análise'.`, type:'warn'});
      } else {
        await api.updateProcess(pMatch.id, { current_status: 'RECEBIDO_SETOR' });
        await api.addMovement(pMatch.id, 'RECEBIDO_SETOR', obs || `Recebimento registrado no setor de análise.`, user);
        setMsg({text:`Processo ${protocol} (#${pMatch.id}) registrado! Disponível no armário.`, type:'ok'});
        loadPending(); // recarrega a lista
      }
    } catch(err) {
      setMsg({text:'Erro: ' + err.message, type:'err'});
    } finally {
      setProtocol('');
      setObs('');
      setLoading(false);
      setTimeout(() => document.getElementById('scinput')?.focus(), 100);
    }
  };

  return (
    <>
    <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
      <div className="card-title">Registrar Recebimento de Processos no Setor</div>
      <div className="alert alert-info fca gap10" style={{marginBottom: '16px'}}>
        <Scan size={32} />
        <div>
          Utilize o <strong>leitor de código de barras</strong> (scanner usb) na capa do processo. 
          O cursor deve estar no campo abaixo.
        </div>
      </div>
      
      <form onSubmit={handleReceive}>
        <div style={{marginBottom: '16px'}}>
          <input 
            id="scinput"
            type="text" 
            value={protocol} 
            onChange={e => setProtocol(e.target.value.toUpperCase())} 
            placeholder="Código do protocolo" 
            autoFocus 
            style={{fontSize: '24px', textAlign: 'center', padding: '16px', fontWeight: 'bold'}}
          />
        </div>
        <div className="fg" style={{marginBottom: '13px'}}>
          <label>Observação (opcional)</label>
          <textarea 
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Ex: Recebido junto com 3 processos da entrega das 14h..."
            rows={2}
          ></textarea>
        </div>
        <button type="submit" className="btn btn-success btn-full" disabled={loading} style={{minHeight: '48px', fontSize: '15px'}}>
          {loading ? 'Processando...' : 'Confirmar recebimento no setor'}
        </button>
      </form>
      
      {msg.text && (
        <div className={`alert alert-${msg.type}`} style={{marginTop: '16px'}}>
          {msg.text}
        </div>
      )}
    </div>

    <div className="card" style={{maxWidth: '600px', margin: '16px auto 0'}}>
      <div className="card-title"><span>Aguardando recebimento ({pending.length})</span></div>
      {pending.length === 0 ? (
        <div className="empty" style={{padding: '16px'}}>Nenhum processo aguardando.</div>
      ) : (
        pending.map(p => (
          <div key={p.id} className="fca gap10" style={{padding: '10px 0', borderBottom: '.5px solid var(--border)'}}>
            <div style={{flex: 1}}>
              <div className="mono" style={{fontWeight: 500}}>{p.protocol}</div>
              <div style={{fontSize: '12px', color: 'var(--text3)'}}>{p.requester}</div>
            </div>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => {
                setProtocol(p.protocol);
                setTimeout(() => document.getElementById('scinput')?.focus(), 100);
              }}
            >
              Selecionar
            </button>
          </div>
        ))
      )}
    </div>
    </>
  );
}
