import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/UI/Avatar';
import { Badge } from '../../components/UI/Badge';
import { Modal } from '../../components/UI/Modal';
import { SM } from '../../config/constants';

export function Productivity() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProcs, setMyProcs] = useState([]);

  // Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [checks, setChecks] = useState({});
  const [mineList, setMineList] = useState([]);
  const [notesMap, setNotesMap] = useState({});
  const [devTypeMap, setDevTypeMap] = useState({});
  const [waSearch, setWaSearch] = useState('');

  const isAnalyst = user.role === 'analyst';

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const prodData = await api.productivity();
        setData(prodData);
        if (isAnalyst) {
          const procs = await api.getProcesses('analyst', user.id);
          const activeMine = procs.filter(p => p.assigned_to === user.id);
          setMyProcs(activeMine);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user.id, isAnalyst, user.role]);

  const fmtWaDate = () => {
    return new Date().toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  };

  const openWa = (text) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const waAnalyst = async () => {
    try {
      setLoading(true);
      const procIds = myProcs.map(p => p.id);
      const movs = await api.getMovementsForProcesses(procIds);
      
      const localNotesMap = {};
      movs.forEach(m => {
        if(!localNotesMap[m.process_id] && m.notes) localNotesMap[m.process_id] = m.notes;
      });

      const finHoje = myProcs.filter(p => ['ASSINADO','DISP_RETIRADA','FINALIZADO','ARQUIVADO','ANUENCIA_SOLO'].includes(p.current_status));
      const emAnalise = myProcs.filter(p => !['ASSINADO','DISP_RETIRADA','FINALIZADO','ARQUIVADO','ANUENCIA_SOLO','PARECER','DEV_PROTOCOLO','DEV_REQUERENTE','ENC_ASSINATURA','ANUENCIA','LIC_COND','ATO_APR','V2_ATO','V2_COND'].includes(p.current_status));
      const encAssin  = myProcs.filter(p => p.current_status === 'ENC_ASSINATURA');
      const parecer   = myProcs.filter(p => p.current_status === 'PARECER');
      const devProt   = myProcs.filter(p => p.current_status === 'DEV_PROTOCOLO');
      const aguardReq = myProcs.filter(p => p.current_status === 'DEV_REQUERENTE');
      const anuencia  = myProcs.filter(p => p.current_status === 'ANUENCIA');
      const anuenciaSolo = myProcs.filter(p => p.current_status === 'ANUENCIA_SOLO');
      const licCond = myProcs.filter(p => p.current_status === 'LIC_COND');
      const atoApr = myProcs.filter(p => p.current_status === 'ATO_APR');
      const v2Ato = myProcs.filter(p => p.current_status === 'V2_ATO');
      const v2Cond = myProcs.filter(p => p.current_status === 'V2_COND');

      const devProtParecer = [];
      const devProtAnuencia = [];
      const devProtAnuenciaSolo = [];
      const devProtSimples = [];

      devProt.forEach(p => {
        const pMovs = movs.filter(m => m.process_id === p.id);
        if(pMovs.some(m => m.status === 'PARECER')) devProtParecer.push(p);
        else if(pMovs.some(m => m.status === 'ANUENCIA')) devProtAnuencia.push(p);
        else if(pMovs.some(m => m.status === 'ANUENCIA_SOLO')) devProtAnuenciaSolo.push(p);
        else devProtSimples.push(p);
      });

      const lines = [];
      lines.push(`📋 *RELATÓRIO — ${user.name.toUpperCase()}*`);
      lines.push(`📅 ${fmtWaDate()}`);
      lines.push('');

      const block = (emoji, title, list) => {
        if(!list.length) return;
        lines.push(`${emoji} *${title}*`);
        list.forEach(p => {
          lines.push(`  • ${p.protocol} — ${p.requester} _(${p.type})_`);
          if(localNotesMap[p.id] && ['DEV_PROTOCOLO', 'PARECER', 'ANUENCIA'].includes(p.current_status)) {
            lines.push(`    ↳ _${localNotesMap[p.id]}_`);
          }
        });
        lines.push('');
      };

      block('✅','FINALIZADOS',finHoje);
      block('🔄','EM ANÁLISE (minha mesa)',emAnalise);
      block('✍️','ENCAMINHADO PARA ASSINATURA',encAssin);
      block('📝', 'PARECER EMITIDO — aguard. requerente', parecer);
      block('↩️','DEVOLVIDO AO PROTOCOLO COM PARECER',devProtParecer);
      block('↩️','DEVOLVIDO AO PROTOCOLO COM ANUÊNCIA',devProtAnuencia);
      block('↩️','DEVOLVIDO AO PROTOCOLO COM ANUÊNCIA DE SOLO',devProtAnuenciaSolo);
      block('↩️','DEVOLVIDO AO PROTOCOLO',devProtSimples);
      block('⏳','AGUARDANDO RETORNO DO REQUERENTE',aguardReq);
      block('📌','ANUÊNCIA EMITIDA',anuencia);
      block('📌','ANUÊNCIA DE USO DE SOLO EMITIDA',anuenciaSolo);
      block('📌','LICENÇA DE IMPLANTAÇÃO EMITIDA',licCond);
      block('📌','ATO DE APROVAÇÃO EMITIDO',atoApr);
      block('📌','2ª VIA ATO DE APROVAÇÃO',v2Ato);
      block('📌','2ª VIA LICENÇA DE IMPLANTAÇÃO',v2Cond);

      lines.push(`📊 *Total na mesa: ${myProcs.filter(p=>!['FINALIZADO','ARQUIVADO','ANUENCIA_SOLO','ASSINADO','DISP_RETIRADA','LIC_COND','ATO_APR','V2_ATO','V2_COND'].includes(p.current_status)).length} processo(s) ativos*`);
      lines.push(`_Enviado pelo SisGestão_`);

      openWa(lines.join('\n'));
    } catch(e) {
      alert('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openWaCustom = async () => {
    try {
      setLoading(true);
      const activeList = myProcs.filter(p => !['ARQUIVADO','DISP_RETIRADA'].includes(p.current_status));
      setMineList(activeList);
      const procIds = activeList.map(p => p.id);
      const movs = await api.getMovementsForProcesses(procIds);
      const _notesMap = {};
      const _devTypeMap = {};
      movs.forEach(m => { if(!_notesMap[m.process_id] && m.notes) _notesMap[m.process_id] = m.notes.replace(/\|/g, ''); });
      procIds.forEach(id => {
        const pMovs = movs.filter(m => m.process_id === id);
        if(pMovs.some(m => m.status === 'PARECER')) _devTypeMap[id] = 'PARECER';
        else if(pMovs.some(m => m.status === 'ANUENCIA')) _devTypeMap[id] = 'ANUENCIA';
        else if(pMovs.some(m => m.status === 'ANUENCIA_SOLO')) _devTypeMap[id] = 'ANUENCIA_SOLO';
        else _devTypeMap[id] = 'SIMPLES';
      });
      setNotesMap(_notesMap);
      setDevTypeMap(_devTypeMap);
      const initialChecks = {};
      activeList.forEach(p => initialChecks[p.id] = false);
      setChecks(initialChecks);
      setWaSearch('');
      setWaModalOpen(true);
    } catch(e) { alert(e.message); } finally { setLoading(false); }
  };

  const handleWaFilterTime = (tipo) => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const semana = new Date(); const diaSemana = semana.getDay();
    const diff = semana.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1); 
    semana.setDate(diff); semana.setHours(0,0,0,0);
    const newChecks = { ...checks };
    let qtd = 0;
    Object.keys(newChecks).forEach(k => newChecks[k] = false);
    mineList.forEach(p => {
      const updated = new Date(p.updated_at);
      if((tipo === 'hoje' && updated >= hoje) || (tipo === 'semana' && updated >= semana)) { newChecks[p.id] = true; qtd++; }
    });
    setChecks(newChecks);
    if(qtd > 0) alert(`${qtd} processos selecionados.`);
    else alert('Nenhum processo movimentado.');
  };

  const waSendCustom = () => {
    const selectedProcs = mineList.filter(p => checks[p.id]);
    if(!selectedProcs.length) { alert('Selecione pelo menos um processo.'); return; }
    const lines = [];
    lines.push(`📋 *PROCESSOS — ${user.name.toUpperCase()}*`);
    lines.push(`📅 ${fmtWaDate()}`);
    lines.push('');
    const groups = {};
    selectedProcs.forEach(p => {
      let s = p.current_status;
      if(s === 'DEV_PROTOCOLO') {
        const devType = devTypeMap[p.id];
        if(devType === 'PARECER') s = 'DEV_PROTOCOLO_PARECER';
        else if(devType === 'ANUENCIA') s = 'DEV_PROTOCOLO_ANUENCIA';
        else if(devType === 'ANUENCIA_SOLO') s = 'DEV_PROTOCOLO_ANUENCIA_SOLO';
      }
      if(!groups[s]) groups[s] = [];
      groups[s].push({ protocol: p.protocol, requester: p.requester, type: p.type, note: notesMap[p.id] });
    });
    const statusOrder = ['EM_ANALISE','ENC_ASSINATURA','PARECER','ANUENCIA','ANUENCIA_SOLO','LIC_COND','ATO_APR','V2_ATO','V2_COND','DEV_PROTOCOLO_PARECER','DEV_PROTOCOLO_ANUENCIA','DEV_PROTOCOLO_ANUENCIA_SOLO','DEV_PROTOCOLO','DEV_REQUERENTE','FINALIZADO'];
    const emoji = {EM_ANALISE:'🔄',ENC_ASSINATURA:'✍️',PARECER:'📝',ANUENCIA:'📌',ANUENCIA_SOLO:'📌',LIC_COND:'📌',ATO_APR:'📌',V2_ATO:'📌',V2_COND:'📌',DEV_PROTOCOLO_PARECER:'↩️',DEV_PROTOCOLO_ANUENCIA:'↩️',DEV_PROTOCOLO_ANUENCIA_SOLO:'↩️',DEV_PROTOCOLO:'↩️',DEV_REQUERENTE:'⏳',FINALIZADO:'✅'};
    const labelMap = {DEV_PROTOCOLO_PARECER:'DEVOLVIDO AO PROTOCOLO COM PARECER', DEV_PROTOCOLO_ANUENCIA:'DEVOLVIDO AO PROTOCOLO COM ANUÊNCIA', DEV_PROTOCOLO_ANUENCIA_SOLO:'DEVOLVIDO AO PROTOCOLO COM ANUÊNCIA DE SOLO'};
    statusOrder.forEach(s => {
      if(!groups[s]) return;
      lines.push(`${emoji[s]||'•'} *${labelMap[s] || (SM[s]?.label || s)}*`);
      groups[s].forEach(p => {
        lines.push(`  • ${p.protocol} — ${p.requester} _(${p.type})_`);
        if(p.note && (s.startsWith('DEV_PROTOCOLO') || s === 'PARECER' || s === 'ANUENCIA')) lines.push(`    ↳ _${p.note}_`);
      });
      lines.push('');
    });
    lines.push(`_Enviado pelo SisGestão_`);
    setWaModalOpen(false); openWa(lines.join('\n'));
  };

  const waSecretary = async () => {
    try {
      setLoading(true);
      const analysts = await api.getAnalysts();
      const allProcs = await api.getProcesses('admin', '');
      const lines = [];
      lines.push(`📋 *RELATÓRIO GERAL DA EQUIPE*`);
      lines.push(`📅 ${fmtWaDate()}`);
      lines.push('');
      const assinar = allProcs.filter(p => p.current_status === 'ENC_ASSINATURA');
      if(assinar.length){
        lines.push(`\u270D\uFE0F *AGUARDANDO SUA ASSINATURA (${assinar.length})*`);
        assinar.forEach(p => lines.push(`  • ${p.protocol} — ${p.requester}${p.analyst_name ? ` [${p.analyst_name.split(' ')[0]}]` : ''}`));
        lines.push('');
      }
      analysts.forEach(a => {
        const mine = allProcs.filter(p => p.assigned_to === a.id && !['ARQUIVADO','DISP_RETIRADA'].includes(p.current_status));
        if(!mine.length) return;
        lines.push(`👤 *${a.name.toUpperCase()}* — ${mine.length} processo(s)`);
        mine.forEach(p => { lines.push(`  • ${p.protocol} — ${p.requester}`); lines.push(`    _${SM[p.current_status]?.label || p.current_status}_`); });
        lines.push('');
      });
      const arm = allProcs.filter(p => p.current_status === 'RECEBIDO_SETOR' && !p.assigned_to);
      if(arm.length){
        lines.push(`📦 *NO ARMÁRIO SEM ANALISTA (${arm.length})*`);
        arm.forEach(p => lines.push(`  • ${p.protocol} — ${p.requester}`));
        lines.push('');
      }
      const fin = allProcs.filter(p => ['ASSINADO','DISP_RETIRADA','FINALIZADO','ARQUIVADO','ANUENCIA_SOLO'].includes(p.current_status)).length;
      const active = allProcs.filter(p => !['ASSINADO','DISP_RETIRADA','FINALIZADO','ARQUIVADO','ANUENCIA_SOLO'].includes(p.current_status)).length;
      lines.push(`📊 *RESUMO GERAL*`);
      lines.push(`  • Em andamento: ${active} processo(s)`);
      lines.push(`  • Finalizados / Anuências: ${fin} processo(s)`);
      lines.push(`  • No armário: ${arm.length} processo(s)`);
      lines.push('');
      lines.push(`_Enviado pelo SisGestão_`);
      openWa(lines.join('\n'));
    } catch(e) { alert('Erro: ' + e.message); } finally { setLoading(false); }
  };

  const getWaIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink: 0}}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.558 4.112 1.532 5.836L.044 23.956l6.292-1.648A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.894 0-3.662-.523-5.17-1.432l-.37-.221-3.735.979.995-3.638-.242-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
  );

  const getSearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );

  const kpis = isAnalyst ? [
    { label: 'TOTAL ATRIBUÍDOS', value: myProcs.length, color: 'var(--blue)' },
    { label: 'FINALIZADOS', value: myProcs.filter(p => ['ASSINADO','DISP_RETIRADA','FINALIZADO','ARQUIVADO','ANUENCIA_SOLO'].includes(p.current_status)).length, color: 'var(--green)' },
    { label: 'EM ANDAMENTO', value: myProcs.filter(p => !['ASSINADO','DISP_RETIRADA','FINALIZADO','ARQUIVADO','ANUENCIA_SOLO'].includes(p.current_status)).length, color: 'var(--amber)' }
  ] : [];

  const pct = isAnalyst && myProcs.length ? Math.round((kpis[1].value / myProcs.length) * 100) : 0;

  return (
    <>
      {isAnalyst && (
        <div className="fca gap10" style={{marginBottom: '16px'}}>
          <Avatar user={user} size={42} />
          <div>
            <div style={{fontSize: '15px', fontWeight: 500}}>{user.name}</div>
            <div style={{fontSize: '12px', color: 'var(--text3)'}}>Estatísticas individuais</div>
          </div>
        </div>
      )}

      {isAnalyst && (
        <div className="kpi-grid" style={{marginBottom: '16px'}}>
          {kpis.map(k => (
            <div key={k.label} className="kpi">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{color: k.color}}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {isAnalyst && (
        <div className="card" style={{marginBottom: '16px'}}>
          <div className="card-title"><span>TAXA DE CONCLUSÃO — {pct}%</span></div>
          <div className="pbar" style={{height: '10px', marginBottom: '8px'}}>
            <div className="pfill" style={{width: `${pct}%`, background: pct>=70?'#3B6D11':pct>=40?'#BA7517':'#A32D2D'}}></div>
          </div>
        </div>
      )}

      <div className="card" style={{background: '#f0fdf4', borderColor: '#25D36644', marginBottom: '16px'}}>
        <div className="card-title" style={{color: '#1a6b3a', marginBottom: '10px', fontSize: '11px', letterSpacing: '.5px', textTransform: 'uppercase'}}>
          {isAnalyst ? 'Enviar para WhatsApp' : 'Enviar relatório para WhatsApp'}
        </div>
        <p style={{fontSize: '12px', color: '#1a6b3a', marginBottom: '12px', opacity: .85}}>
          {isAnalyst 
            ? 'Gere um resumo dos seus processos e envie direto para o WhatsApp da secretaria.'
            : 'Gere um relatório completo de toda a equipe com processos em andamento, armário e aguardando assinatura.'}
        </p>
        {isAnalyst ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <button className="btn btn-full" onClick={waAnalyst} disabled={loading} style={{background: '#25D366', color: '#fff', border: 'none', gap: '8px', minHeight: '42px', fontSize: '14px'}}>
              {getWaIcon()} Enviar resumo completo
            </button>
            <button className="btn btn-outline btn-full" onClick={openWaCustom} disabled={loading} style={{gap: '8px', minHeight: '42px', fontSize: '14px'}}>
              {getSearchIcon()} Escolher processos
            </button>
          </div>
        ) : (
          <button className="btn btn-full" onClick={waSecretary} disabled={loading} style={{background: '#25D366', color: '#fff', border: 'none', gap: '8px', minHeight: '42px', fontSize: '14px'}}>
            {getWaIcon()} Enviar relatório geral para WhatsApp
          </button>
        )}
      </div>

      {!isAnalyst && (
        <div className="card">
          <div className="card-title">RANKING DE PRODUTIVIDADE GERAL</div>
          {loading ? <div className="empty">Carregando métricas...</div> : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {data.map((row) => {
                const max = Math.max(...data.map(d => Number(d.total_processes)), 1);
                const barPct = (Number(row.total_processes) / max) * 100;
                return (
                  <div key={row.analyst_username}>
                    <div className="fca gap10" style={{marginBottom: 6}}>
                      <Avatar user={{username: row.analyst_username, name: row.analyst_name, initials: row.initials}} size={26} />
                      <span style={{fontSize: 14, fontWeight: 500, flex: 1}}>{row.analyst_name}</span>
                      <span style={{fontSize: 18, fontWeight: 600}}>{row.total_processes}</span>
                    </div>
                    <div className="pbar"><div className="pfill" style={{width: `${barPct}%`, background: 'var(--blue)'}}></div></div>
                  </div>
                );
              })}
              {data.length === 0 && <div className="empty">Sem dados de produtividade suficientes.</div>}
            </div>
          )}
        </div>
      )}

      {isAnalyst && (
        <div className="card" style={{padding: '0', overflow: 'hidden'}}>
          <div style={{padding: '13px 17px 0'}}><div className="card-title" style={{marginBottom: '0'}}>MEUS PROCESSOS</div></div>
          <table className="rt">
            <thead>
              <tr>
                <th>PROTOCOLO</th>
                <th>REQUERENTE</th>
                <th>STATUS</th>
                <th className="hide-mobile">MOVIM.</th>
              </tr>
            </thead>
            <tbody>
              {myProcs.length ? myProcs.map(p => (
                <tr key={p.id} className="clickable" style={{fontSize: '12px'}}>
                  <td data-label="Protocolo"><span className="mono" style={{fontWeight: 500}}>{p.protocol}</span></td>
                  <td data-label="Requerente">{p.requester}</td>
                  <td data-label="Status"><Badge statusId={p.current_status} /></td>
                  <td data-label="Movim." className="hide-mobile" style={{textAlign: 'center', color: 'var(--text3)'}}>{p.movement_count || 0}</td>
                </tr>
              )) : <tr><td colSpan="4"><div className="empty">Nenhum processo atribuído.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {waModalOpen && (
        <Modal
          title="Selecionar processos para WhatsApp"
          onClose={() => setWaModalOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setWaModalOpen(false)}>Cancelar</button>
            <button className="btn btn-success" onClick={waSendCustom} style={{background: '#25D366', border: 'none', gap: '8px'}}>{getWaIcon()} Enviar selecionados</button>
          </>}
        >
          <p style={{fontSize: '12px', color: 'var(--text3)', marginBottom: '13px'}}>Selecione os processos que deseja incluir no resumo:</p>
          <div className="fg" style={{marginBottom: '12px'}}>
            <input type="text" placeholder="🔍 Digite para pesquisar..." value={waSearch} onChange={e => setWaSearch(e.target.value)} style={{fontSize: '13px', padding: '8px'}} />
          </div>
          <div className="fca gap8" style={{marginBottom: '12px', flexWrap: 'wrap'}}>
            <button className="btn btn-outline btn-sm" onClick={() => handleWaFilterTime('hoje')} style={{flex: 1, textTransform: 'none'}}>📅 Produzidos Hoje</button>
            <button className="btn btn-outline btn-sm" onClick={() => handleWaFilterTime('semana')} style={{flex: 1, textTransform: 'none'}}>📆 Desta Semana</button>
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginBottom: '10px'}}>
            <input type="checkbox" onChange={e => { const c = e.target.checked; const n = {}; Object.keys(checks).forEach(k => n[k] = c); setChecks(n); }} style={{width: 'auto', appearance: 'auto', WebkitAppearance: 'auto'}} />
            Selecionar todos/nenhum
          </label>
          <hr />
          {mineList.filter(p => !waSearch || p.protocol.toLowerCase().includes(waSearch.toLowerCase()) || p.requester.toLowerCase().includes(waSearch.toLowerCase())).map(p => (
            <label key={p.id} style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 0', borderBottom: '.5px solid var(--border)', fontSize: '13px', fontWeight: 400}}>
              <input type="checkbox" checked={checks[p.id] || false} onChange={e => setChecks({...checks, [p.id]: e.target.checked})} style={{width: 'auto', flexShrink: 0, appearance: 'auto', WebkitAppearance: 'auto'}} />
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontFamily: 'monospace', fontSize: '12px', fontWeight: 500}}>{p.protocol}</div>
                <div style={{fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{p.requester}</div>
              </div>
              <Badge statusId={p.current_status} />
            </label>
          ))}
        </Modal>
      )}
    </>
  );
}
