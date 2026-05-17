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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const isAnalyst = user.role === 'analyst';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.armario({ startDate, endDate });
      setArm(data);
      setHasSearched(true);
    } catch(e) {
      console.error(e);
      alert('Erro ao carregar armário: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const setPeriodDates = (tipo) => {
    const h = new Date();
    let s, e;
    if(tipo === 'hoje') {
      s = e = h;
    } else if(tipo === 'semana') {
      e = h;
      s = new Date(h);
      const day = s.getDay();
      s.setDate(s.getDate() - day + (day === 0 ? -6 : 1));
    } else if(tipo === 'mes') {
      e = h;
      s = new Date(h.getFullYear(), h.getMonth(), 1);
    }
    
    setStartDate(s.toLocaleDateString('sv-SE'));
    setEndDate(e.toLocaleDateString('sv-SE'));
  };

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

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await api.armario({ startDate, endDate });
      setArm(data);
      setHasSearched(true);
      setSelectedIds([]); // Limpa seleção ao pesquisar novo período
    } catch(e) {
      console.error(e);
      alert('Erro ao carregar armário: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredArm.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArm.map(p => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => {
    if (filteredArm.length === 0) {
      alert('Não há processos para gerar o relatório.');
      return;
    }
    // Se tiver seleção, imprime só os selecionados. Se não, imprime tudo da lista filtrada.
    const toPrint = selectedIds.length > 0 ? selectedProcesses : filteredArm;
    if (selectedIds.length === 0) {
      // Temporariamente seleciona tudo para imprimir a tabela completa se nada estiver marcado
      // Ou apenas alertar. O usuário pediu para marcar, então vamos alertar se nada estiver marcado?
      // "ter como marcar qual eu vou gerar o relaotrio" -> implica que ele quer o controle.
      alert('Selecione os processos que deseja incluir no relatório.');
      return;
    }
    window.print();
  };

  const handleWaSend = () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um processo para enviar via WhatsApp.');
      return;
    }
    
    const lines = [];
    lines.push(`📦 *ARMÁRIO DO SETOR — ${new Date().toLocaleDateString('pt-BR')}*`);
    lines.push(`_Processos aguardando análise_`);
    lines.push('');
    
    selectedProcesses.forEach(p => {
      lines.push(`• *${p.protocol}* — ${p.requester}`);
      lines.push(`  ↳ _${p.type}_`);
    });
    
    lines.push('');
    lines.push(`📊 *Total: ${selectedIds.length} processo(s)*`);
    lines.push(`_Enviado pelo SisGestão_`);
    
    const text = lines.join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredArm = arm.filter(p => {
    const q = search.toLowerCase();
    return p.protocol.toLowerCase().includes(q) || p.requester.toLowerCase().includes(q);
  });

  const selectedProcesses = arm.filter(p => selectedIds.includes(p.id));

  return (
    <>
      <div className="alert alert-info" style={{marginBottom: '13px'}}>
        Processos recebidos no setor aguardando analista.
        {isAnalyst && <span> Clique em <strong>Assumir</strong> para iniciar sua análise.</span>}
      </div>
      
      <div className="card no-print" style={{marginBottom: '16px'}}>
        <div className="fca gap10" style={{flexWrap: 'wrap'}}>
          <div className="fg" style={{flex: 1, minWidth: '140px'}}>
            <label>Data Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="fg" style={{flex: 1, minWidth: '140px'}}>
            <label>Data Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="fg" style={{flex: 2, minWidth: '200px'}}>
             <label>Pesquisar</label>
             <input 
              type="text" 
              placeholder="🔍 Protocolo ou requerente..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{height: '40px'}}
            />
          </div>
          <div className="fca gap6" style={{alignSelf: 'flex-end'}}>
            <button className="btn btn-outline" onClick={handleSearch} disabled={loading} style={{height: '40px', padding: '0 15px'}}>
              {loading ? '...' : 'Pesquisar'}
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={loading || filteredArm.length === 0} style={{height: '40px', padding: '0 15px'}}>
              Gerar Relatório
            </button>
          </div>
        </div>
        <div className="fca gap8" style={{marginTop: '12px', flexWrap: 'wrap'}}>
          <button className="btn btn-outline btn-sm" onClick={() => setPeriodDates('hoje')}>Hoje</button>
          <button className="btn btn-outline btn-sm" onClick={() => setPeriodDates('semana')}>Semana</button>
          <button className="btn btn-outline btn-sm" onClick={() => setPeriodDates('mes')}>Este Mês</button>
          {(startDate || endDate || search) && (
            <button className="btn btn-ghost btn-sm" style={{color: 'var(--red)', marginLeft: 'auto'}} onClick={() => { 
              setStartDate(''); setEndDate(''); setSearch(''); 
              setHasSearched(false);
              loadData();
            }}>
              Limpar Tudo
            </button>
          )}
        </div>
      </div>

      {hasSearched && filteredArm.length > 0 && (
        <div className="fca gap12 no-print" style={{marginBottom: '12px', padding: '0 4px'}}>
          <label className="fca gap8 clickable" style={{fontSize: '13px', color: 'var(--text2)', cursor: 'pointer', flexShrink: 0}}>
            <input 
              type="checkbox" 
              checked={selectedIds.length === filteredArm.length && filteredArm.length > 0} 
              onChange={toggleSelectAll} 
              style={{width: '18px', height: '18px', cursor: 'pointer'}}
            />
            Selecionar Todos ({filteredArm.length})
          </label>
          
          <div className="mla fca gap8">
            {selectedIds.length > 0 && (
              <button className="btn btn-success btn-sm" onClick={handleWaSend} style={{background: '#25D366', border: 'none', gap: '6px'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.558 4.112 1.532 5.836L.044 23.956l6.292-1.648A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.894 0-3.662-.523-5.17-1.432l-.37-.221-3.735.979.995-3.638-.242-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                WhatsApp ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="card no-print"><div className="empty">Carregando armário...</div></div>
      ) : arm.length === 0 ? (
        <div className="card no-print"><div className="empty">Nenhum processo no armário no momento.</div></div>
      ) : filteredArm.length === 0 ? (
        <div className="card no-print"><div className="empty">Nenhum resultado para a busca.</div></div>
      ) : (
        <div className="no-print">
          {filteredArm.map(p => (
            <div key={p.id} className="arm-item">
              <div className="fca" style={{paddingRight: '4px'}}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(p.id)} 
                  onChange={() => toggleSelect(p.id)} 
                  style={{width: '18px', height: '18px', cursor: 'pointer'}}
                />
              </div>
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
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO - RELATÓRIO */}
      {selectedProcesses.length > 0 && (
        <div className="print-visible" style={{display: 'none'}}>
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <h2 style={{margin: 0}}>Relatório de Processos no Armário</h2>
            <p style={{color: '#555', margin: '4px 0'}}>
              Período de Entrada no Setor: {startDate ? startDate.split('-').reverse().join('/') : 'Início'} a {endDate ? endDate.split('-').reverse().join('/') : 'Hoje'}
            </p>
            <hr style={{border: 0, borderBottom: '1px solid #ccc', margin: '15px 0'}} />
          </div>
          
          <table className="rt" style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#f9f9f9', borderBottom: '1px solid #ccc'}}>
                <th style={{padding: '8px', textAlign: 'left'}}>Protocolo</th>
                <th style={{padding: '8px', textAlign: 'left'}}>Requerente</th>
                <th style={{padding: '8px', textAlign: 'left'}}>Assunto</th>
                <th style={{padding: '8px', textAlign: 'center'}}>Data Entrada</th>
              </tr>
            </thead>
            <tbody>
              {selectedProcesses.map(p => (
                <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                  <td style={{padding: '8px', fontFamily: 'monospace'}}>{p.protocol}</td>
                  <td style={{padding: '8px'}}>{p.requester}</td>
                  <td style={{padding: '8px'}}>{p.type}</td>
                  <td style={{padding: '8px', textAlign: 'center'}}>
                    {new Date(p.updated_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop: '20px', fontSize: '11px', color: '#777', textAlign: 'right'}}>
            Gerado em: {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      )}
    </>
  );
}
