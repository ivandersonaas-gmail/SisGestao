import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Badge } from '../../components/UI/Badge';

export function Armario() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [arm, setArm] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAnalyst = user.role === 'analyst';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.armario();
      setArm(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssumir = async (id) => {
    try {
      await api.updateProcess(id, { assigned_to: user.id });
      await api.addMovement(id, 'EM_ANALISE', `Processo assumido por ${user.name}.`, user);
      await api.log('ASSUMIDO', `Processo`, `Analista: ${user.name}`, user);
      navigate(`/proc/${id}`);
    } catch(e) {
      alert('Erro: ' + e.message);
    }
  };

  const filteredArm = arm.filter(p => {
    const q = search.toLowerCase();
    return p.protocol.toLowerCase().includes(q) || p.requester.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="alert alert-info" style={{marginBottom: '13px'}}>
        Processos recebidos no setor aguardando analista.
        {isAnalyst && <span> Clique em <strong>Assumir</strong> para iniciar sua análise.</span>}
      </div>
      
      {arm.length > 0 && (
        <div className="fca gap6" style={{marginBottom: '14px'}}>
          <input 
            type="text" 
            placeholder="🔍 Pesquisar protocolo ou requerente no armário..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{flex: 1, fontSize: '14px', padding: '9px', borderRadius: 'var(--r)', border: '1px solid var(--border)'}} 
          />
        </div>
      )}

      {loading ? (
        <div className="card"><div className="empty">Carregando armário...</div></div>
      ) : arm.length === 0 ? (
        <div className="card"><div className="empty">Nenhum processo no armário no momento.</div></div>
      ) : filteredArm.length === 0 ? (
        <div className="card"><div className="empty">Nenhum resultado para a busca.</div></div>
      ) : filteredArm.map(p => (
        <div key={p.id} className="arm-item">
          <div style={{flex: 1, minWidth: 0}}>
            <div className="fca gap8" style={{marginBottom: '4px'}}>
              <span className="mono" style={{fontSize: '14px', fontWeight: 500}}>{p.protocol}</span>
              <Badge statusId={p.current_status} />
            </div>
            <div style={{fontSize: '13px', fontWeight: 500}}>{p.requester}</div>
            <div style={{fontSize: '12px', color: 'var(--text3)'}}>{p.type}</div>
            <div style={{fontSize: '11px', color: 'var(--text3)', marginTop: '3px'}}>
              Entrada: {new Date(p.created_at).toLocaleDateString('pt-BR')} · Recebido: {new Date(p.updated_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <div className="fca gap6" style={{flexShrink: 0}}>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/proc/${p.id}`)}>Ver</button>
            {isAnalyst && <button className="btn btn-amber btn-sm" onClick={() => handleAssumir(p.id)}>Assumir</button>}
          </div>
        </div>
      ))}
    </>
  );
}
