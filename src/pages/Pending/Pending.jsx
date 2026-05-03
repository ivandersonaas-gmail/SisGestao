import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Badge } from '../../components/UI/Badge';

export function Pending() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);

  const r = user.role;

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.pending(r);
        setProcs(data);
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [r]);

  const titleText = r === 'secretary' 
    ? 'Processos encaminhados pelo analista aguardando sua assinatura.' 
    : 'Processos que retornaram ao protocolo e aguardam sua ação.';

  return (
    <>
      <div className="alert alert-warn" style={{marginBottom: '13px'}}>
        {titleText}
      </div>

      {loading ? (
        <div className="card"><div className="empty">Carregando...</div></div>
      ) : procs.length === 0 ? (
        <div className="card"><div className="empty">Nenhum processo aguardando.</div></div>
      ) : (
        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
          <table className="rt">
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Requerente</th>
                <th>Status</th>
                <th className="hide-mobile">Analista</th>
                <th className="hide-mobile">Desde</th>
              </tr>
            </thead>
            <tbody>
              {procs.map(p => (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/proc/${p.id}`)}>
                  <td data-label="Protocolo"><span className="mono">{p.protocol}</span></td>
                  <td data-label="Requerente" style={{fontSize: '12px'}}>{p.requester}</td>
                  <td data-label="Status"><Badge statusId={p.current_status} /></td>
                  <td data-label="Analista" className="hide-mobile" style={{fontSize: '12px'}}>{p.analyst_name || '—'}</td>
                  <td data-label="Desde" className="hide-mobile" style={{fontSize: '11px', color: 'var(--text3)'}}>
                    {new Date(p.updated_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
