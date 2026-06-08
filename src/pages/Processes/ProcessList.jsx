import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { STATUSES } from '../../config/constants';
import { Badge } from '../../components/UI/Badge';
import { Avatar } from '../../components/UI/Avatar';

export function ProcessList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [procs, setProcs] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const statusFilter = searchParams.get('status') || '';
  const analystFilter = searchParams.get('analyst') || '';
  const typeFilter = searchParams.get('type') || '';
  const searchFilter = searchParams.get('search') || '';
  const [tempSearch, setTempSearch] = useState(searchFilter);

  const canAll = user.role === 'admin' || user.role === 'secretary';
  const canNew = user.role !== 'analyst';

  const loadProcs = async () => {
    setLoading(true);
    try {
      const [fetchedProcs, fetchedAnalysts, fetchedTypes] = await Promise.all([
        api.getProcesses(user.role, user.id, {
          status: statusFilter,
          assignedTo: analystFilter,
          type: typeFilter,
          search: searchFilter
        }),
        canAll ? api.getAnalysts() : Promise.resolve([]),
        api.getProcessTypes()
      ]);

      const myProcs = user.role === 'analyst' ? fetchedProcs.filter(p => p.assigned_to === user.id) : fetchedProcs;
      setProcs(myProcs);
      setAnalysts(fetchedAnalysts);
      setTypes(fetchedTypes);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, analystFilter, typeFilter, searchFilter, canAll]);

  const handleSearch = () => {
    const next = new URLSearchParams(searchParams);
    if(tempSearch) next.set('search', tempSearch);
    else next.delete('search');
    setSearchParams(next);
  };

  const handleClearSearch = () => {
    setTempSearch('');
    const next = new URLSearchParams(searchParams);
    next.delete('search');
    setSearchParams(next);
  };

  return (
    <>
      {/* Cabeçalho exclusivo para impressão */}
      <div className="print-only" style={{display: 'none', marginBottom: '20px'}}>
        <div style={{textAlign: 'center'}}>
          <h2 style={{margin: 0}}>SisGestão - Relatório de Processos</h2>
          <p style={{color: '#555', margin: '4px 0'}}>
            Filtros aplicados: {typeFilter === 'Comercial' ? 'Tipo: Comercial (Todos)' : typeFilter ? `Tipo: ${typeFilter}` : 'Todos os tipos'}
            {statusFilter ? ` | Status: ${STATUSES.find(s => s.id === statusFilter)?.label || statusFilter}` : ''}
            {analystFilter ? ` | Analista: ${analysts.find(a => a.username === analystFilter)?.name || analystFilter}` : ''}
            {searchFilter ? ` | Busca: "${searchFilter}"` : ''}
          </p>
          {analysts.length > 0 && (
            <div style={{fontSize: '11px', color: '#555', marginTop: '6px', textAlign: 'center'}}>
              <strong>Legenda de Analistas:</strong> {analysts.map((a, idx) => {
                const initials = (a.initials || (a.name ? a.name.slice(0, 2) : a.username.slice(0, 2))).toUpperCase();
                return (
                  <span key={a.id}>
                    {idx > 0 ? ' | ' : ''}
                    {initials}: {a.name}
                  </span>
                );
              })}
            </div>
          )}
          <div style={{fontSize: '11px', color: '#777', marginTop: '4px'}}>
            Gerado em: {new Date().toLocaleString('pt-BR')} | Total: {procs.length} processo(s)
          </div>
          <hr style={{border: 0, borderBottom: '1px solid #ccc', margin: '15px 0'}} />
        </div>
      </div>

      <div className="fca gap6 no-print" style={{flexWrap: 'wrap', marginBottom: '12px'}}>
        <div className="fca gap4">
          <input 
            type="text" 
            placeholder="Protocolo ou requerente..." 
            value={tempSearch}
            onChange={e => setTempSearch(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') handleSearch(); }}
            style={{maxWidth: '220px', fontSize: '14px'}} 
          />
          <button className="btn btn-outline" style={{padding: '0 8px', height: '34px'}} onClick={handleSearch}>🔍</button>
          {searchFilter && <button className="btn btn-outline" style={{padding: '0 8px', height: '34px'}} onClick={handleClearSearch}>Limpar</button>}
        </div>
        
        <select 
          value={statusFilter}
          onChange={e => {
            const next = new URLSearchParams(searchParams);
            if(e.target.value) next.set('status', e.target.value);
            else next.delete('status');
            setSearchParams(next);
          }} 
          style={{width: 'auto', fontSize: '13px'}}
        >
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        
        <select 
          value={typeFilter}
          onChange={e => {
            const next = new URLSearchParams(searchParams);
            if(e.target.value) next.set('type', e.target.value);
            else next.delete('type');
            setSearchParams(next);
          }} 
          style={{width: 'auto', fontSize: '13px'}}
        >
          <option value="">Todos os tipos</option>
          <option value="Comercial">Comercial (Todos)</option>
          {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        
        {canAll && (
          <select 
            value={analystFilter}
            onChange={e => {
              const next = new URLSearchParams(searchParams);
              if(e.target.value) next.set('analyst', e.target.value);
              else next.delete('analyst');
              setSearchParams(next);
            }} 
            style={{width: 'auto', fontSize: '13px'}}
          >
            <option value="">Todos analistas</option>
            {analysts.map(a => <option key={a.id} value={a.username}>{a.name}</option>)}
          </select>
        )}

        <button 
          className="btn btn-success btn-sm" 
          onClick={() => window.print()}
          style={{height: '34px', minHeight: '34px', padding: '0 12px'}}
        >
          🖨️ Gerar Relatório
        </button>

        <span style={{fontSize: '12px', color: 'var(--text3)', marginLeft: 'auto'}}>{procs.length} processo(s)</span>
      </div>

      <div className="card" style={{padding: 0, overflow: 'hidden', breakInside: 'auto', pageBreakInside: 'auto'}}>
        <table className="rt">
          <thead>
            <tr>
              <th>Protocolo</th>
              <th>Requerente</th>
              <th className="hide-mobile">Tipo</th>
              {canAll && <th className="hide-mobile">Analista</th>}
              <th>Status</th>
              <th className="hide-mobile">Movim.</th>
            </tr>
          </thead>
          <tbody>
            {!loading && procs.length > 0 && procs.map(p => {
              const an = p.analyst_name ? { name: p.analyst_name, username: p.analyst_username, initials: p.analyst_initials } : null;
              return (
                <tr key={p.id} className="clickable" onClick={() => navigate(`/proc/${p.id}`)}>
                  <td data-label="Protocolo"><span className="mono">{p.protocol}</span></td>
                  <td data-label="Requerente" style={{maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{p.requester}</td>
                  <td data-label="Tipo" className="hide-mobile" style={{fontSize: '11px', color: 'var(--text2)'}}>{p.type}</td>
                  {canAll && (
                    <td data-label="Analista" className="hide-mobile">
                      {an ? (
                        <>
                          <div className="fca gap6 no-print">
                            <Avatar user={an} size={22} />
                            <span style={{fontSize: '12px'}}>{an.name.split(' ')[0]}</span>
                          </div>
                          <span className="print-only" style={{display: 'none', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold'}}>
                            {(an.initials || an.name.slice(0, 2)).toUpperCase()}
                          </span>
                        </>
                      ) : <span style={{color: 'var(--text3)'}}>—</span>}
                    </td>
                  )}
                  <td data-label="Status"><Badge statusId={p.current_status} /></td>
                  <td data-label="Movim." className="hide-mobile" style={{fontSize: '12px', color: 'var(--text3)'}}>{p.movement_count || 0}</td>
                </tr>
              )
            })}
            {(!loading && procs.length === 0) && (
              <tr><td colSpan={canAll ? 6 : 5}><div className="empty">Nenhum processo encontrado.</div></td></tr>
            )}
            {loading && (
              <tr><td colSpan={canAll ? 6 : 5}><div className="empty"><div className="spinner" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: 10, width: 20, height: 20}}/> Carregando processos...</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
