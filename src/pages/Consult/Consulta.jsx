import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Badge } from '../../components/UI/Badge';
import { Avatar } from '../../components/UI/Avatar';
import { Search } from 'lucide-react';
import RAGChat from '../../components/RAGChat/RAGChat';

export function Consulta() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const cq = searchParams.get('cq') || '';
  
  const [searchQuery, setSearchQuery] = useState(cq);
  const [loading, setLoading] = useState(false);
  const [resultHTML, setResultHTML] = useState(null);

  const performSearch = async (query) => {
    setLoading(true);
    try {
      if (query) {
        const found = await api.getProcesses('admin', '', { search: query });
        if (!found.length) {
          setResultHTML(<div className="card"><div className="empty">Nenhum processo encontrado para "<strong>{query}</strong>".</div></div>);
        } else {
          setResultHTML(
            <div className="card" style={{padding: 0, overflow: 'hidden'}}>
              <div style={{padding: '13px 17px 0'}}><div className="card-title" style={{marginBottom: 0}}><span>{found.length} resultado(s)</span></div></div>
              <table className="rt">
                <thead><tr><th>Protocolo</th><th>Requerente</th><th>Com quem está</th><th>Status</th></tr></thead>
                <tbody>
                  {found.map(p => (
                    <tr key={p.id} className="clickable" onClick={() => navigate(`/proc/${p.id}`)}>
                      <td data-label="Protocolo"><span className="mono">{p.protocol}</span></td>
                      <td data-label="Requerente" style={{fontSize: '12px'}}>{p.requester}</td>
                      <td data-label="Com quem">{p.analyst_name ? <span style={{fontWeight: 500}}>{p.analyst_name}</span> : <Badge statusId={p.current_status} />}</td>
                      <td data-label="Status"><Badge statusId={p.current_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      } else {
        const [analysts, allProcs] = await Promise.all([
          api.getAnalysts(),
          api.getProcesses('admin', '')
        ]);
        
        setResultHTML(
          <>
            <div style={{fontSize: '12px', color: 'var(--text3)', marginBottom: '12px'}}>Clique no analista para ver seus processos ativos.</div>
            {analysts.map(a => {
              const mine = allProcs.filter(p => p.assigned_to === a.id && !['FINALIZADO','ARQUIVADO','ANUENCIA_SOLO','ASSINADO','DISP_RETIRADA'].includes(p.current_status));
              return <AnalystCard key={a.id} analyst={a} processes={mine} onNav={(id) => navigate(`/proc/${id}`)} />;
            })}
          </>
        );
      }
    } catch(err) {
      console.error(err);
      setResultHTML(<div className="alert alert-err">Erro na busca.</div>);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(cq);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cq]);

  const handleSearchClick = () => {
    const next = new URLSearchParams(searchParams);
    if(searchQuery) next.set('cq', searchQuery);
    else next.delete('cq');
    setSearchParams(next);
  };

  return (
    <>
      <div className="card" style={{marginBottom: '14px'}}>
        <div className="card-title">Buscar processo</div>
        <div className="fca gap8">
          <input 
            type="text" 
            placeholder="Protocolo ou requerente..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchClick()}
            style={{flex: 1, fontFamily: 'monospace', fontSize: '15px'}} 
          />
          <button className="btn btn-primary" onClick={handleSearchClick}><Search size={16} /></button>
          {cq && (
            <button 
              className="btn btn-outline" 
              onClick={() => {
                setSearchQuery('');
                setSearchParams({});
              }}
            >Limpar</button>
          )}
        </div>
      </div>
      
      {loading ? <div className="card"><div className="empty">Buscando...</div></div> : resultHTML}

      <div style={{ marginTop: '24px' }}>
        <div className="card-title" style={{ marginBottom: '12px' }}>Consulta Inteligente de Documentos</div>
        <RAGChat />
      </div>
    </>
  );
}

function AnalystCard({ analyst, processes, onNav }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="consulta-card">
      <div className="fca gap10" style={{cursor: 'pointer'}} onClick={() => setOpen(!open)}>
        <Avatar user={analyst} size={34} />
        <div style={{flex: 1}}>
          <div style={{fontSize: '14px', fontWeight: 500}}>{analyst.name}</div>
          <div style={{fontSize: '12px', color: 'var(--text3)'}}>{processes.length} processo(s) ativo(s)</div>
        </div>
        <span className={`badge ${processes.length > 0 ? 'b-amber' : 'b-gray'}`}>{processes.length}</span>
      </div>
      {open && (
        <div style={{display: 'block'}}>
          {processes.length === 0 ? (
            <div style={{fontSize: '12px', color: 'var(--text3)', padding: '10px 0', borderTop: '.5px solid var(--border)', marginTop: '10px'}}>Nenhum processo ativo.</div>
          ) : (
            <div style={{marginTop: '10px', borderTop: '.5px solid var(--border)'}}>
              {processes.map(p => (
                <div key={p.id} className="fca gap10" style={{padding: '9px 0', borderBottom: '.5px solid var(--border)', cursor: 'pointer'}} onClick={() => onNav(p.id)}>
                  <span className="mono" style={{fontWeight: 500, minWidth: '110px'}}>{p.protocol}</span>
                  <span style={{fontSize: '12px', flex: 1, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.requester}</span>
                  <Badge statusId={p.current_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
