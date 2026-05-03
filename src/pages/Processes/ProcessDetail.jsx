import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { FLOW, SM } from '../../config/constants';
import { Badge } from '../../components/UI/Badge';
import { Avatar } from '../../components/UI/Avatar';
import { Modal } from '../../components/UI/Modal';

export function ProcessDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [proc, setProc] = useState(null);
  const [fiscais, setFiscais] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [restricoes, setRestricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [isEditProcOpen, setIsEditProcOpen] = useState(false);
  const [isEditMovOpen, setIsEditMovOpen] = useState(false);
  const [selectedMov, setSelectedMov] = useState(null);
  
  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [movAlert, setMovAlert] = useState('');
  const [movLoading, setMovLoading] = useState(false);
  
  const [pCtrl, setPCtrl] = useState({});
  const [pCtrlAlert, setPCtrlAlert] = useState({msg: '', type: ''});
  const [pCtrlLoading, setPCtrlLoading] = useState(false);

  const [epProt, setEpProt] = useState('');
  const [epReq, setEpReq] = useState('');
  const [epType, setEpType] = useState('');
  const [epBairro, setEpBairro] = useState('');
  const [epEmp, setEpEmp] = useState('');
  const [epAlert, setEpAlert] = useState('');
  const [epRestrictionAlert, setEpRestrictionAlert] = useState(null);
  const [sysTypes, setSysTypes] = useState([]);

  const [emStatus, setEmStatus] = useState('');
  const [emNotes, setEmNotes] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [emAlert, setEmAlert] = useState('');

  const r = user.role;
  const uid = user.id;

  const loadData = async () => {
    try {
      const [p, res] = await Promise.all([
        api.getProcess(id),
        api.getRestricoes()
      ]);
      setProc(p);
      setRestricoes(res);

      const isSuper = r === 'admin' || r === 'secretary';
      const isProtPanel = r === 'protocol' || r === 'admin';

      if (isProtPanel) {
        const f = await api.getFiscais();
        setFiscais(f);
      }
      if (isSuper && p.current_status === 'RECEBIDO_SETOR' && !p.assigned_to) {
        const a = await api.getAnalysts();
        setAnalysts(a);
      }
      
      setPCtrl({
        payment_date: p.payment_date ? p.payment_date.split('T')[0] : '',
        sent_to_fiscal_date: p.sent_to_fiscal_date ? p.sent_to_fiscal_date.split('T')[0] : '',
        fiscal_name: p.fiscal_name || '',
        fiscal_return_date: p.fiscal_return_date ? p.fiscal_return_date.split('T')[0] : '',
        sent_to_analysis_date: p.sent_to_analysis_date ? p.sent_to_analysis_date.split('T')[0] : ''
      });

    } catch(e) {
      setError('Processo não encontrado ou erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.getAllProcessTypes().then(setSysTypes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="loading-wrap"><div className="spinner"></div><span>Carregando processo...</span></div>;
  if (error || !proc) return <div className="alert alert-err" style={{margin: 18}}>{error || 'Não encontrado.'}</div>;

  const checkRestriction = (valor, tipo) => {
    if (!valor || valor.length < 3) { setEpRestrictionAlert(null); return; }
    const v = valor.toLowerCase().trim();
    const achado = restricoes.find(res => 
      res.active && (res.tipo === tipo || res.tipo === 'Outro') && v.includes(res.nome.toLowerCase().trim())
    );
    setEpRestrictionAlert(achado ? {nome: achado.nome, motivo: achado.motivo} : null);
  };

  const isMyProc = r === 'analyst' && proc.assigned_to === uid;
  const isSuper = r === 'admin' || r === 'secretary';
  const isProtPanel = r === 'protocol' || r === 'admin';
  const canMove = isMyProc || isSuper || r === 'protocol';
  
  const nextStatuses = (FLOW[proc.current_status]?.[r] || []).map(sid => SM[sid]).filter(Boolean);
  const movs = [...proc.movements].reverse();
  const an = proc.analyst_name ? { name: proc.analyst_name, username: proc.analyst_username, initials: proc.analyst_initials } : null;

  const fmtD = (ts) => ts ? new Date(ts).toLocaleDateString('pt-BR') : '—';
  const fmtDT = (ts) => ts ? new Date(ts).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

  // Verificação de restrição ativa para o banner
  const resBairro = proc.bairro ? restricoes.find(res => res.active && res.tipo === 'Bairro' && proc.bairro.toLowerCase().includes(res.nome.toLowerCase())) : null;
  const resEmp = proc.empreendimento ? restricoes.find(res => res.active && res.tipo === 'Empreendimento' && proc.empreendimento.toLowerCase().includes(res.nome.toLowerCase())) : null;
  const restricaoAtiva = resBairro || resEmp;

  // --- ACTIONS ---

  const handleAssign = async (e) => {
    const val = e.target.value;
    if (!val) return;
    const [anId, username, anName] = val.split('|');
    try {
      await api.updateProcess(proc.id, { assigned_to: anId });
      await api.addMovement(proc.id, 'EM_ANALISE', `Atribuído ao analista ${anName} pela secretaria/admin.`, user);
      loadData();
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  };

  const handleAddMov = async () => {
    if(!newStatus) { setMovAlert('Selecione um status.'); return; }
    setMovLoading(true);
    setMovAlert('');
    try {
      let attachmentUrl = null;
      if (selectedFile) {
        attachmentUrl = await api.uploadFile(selectedFile);
      }

      const notes = newNotes.trim() ? `Motivo: ${newNotes.trim()}` : '';
      await api.addMovement(proc.id, newStatus, notes, user, attachmentUrl);
      
      setNewStatus('');
      setNewNotes('');
      setSelectedFile(null);
      loadData();
    } catch(err) {
      setMovAlert('Erro: ' + err.message);
    } finally {
      setMovLoading(false);
    }
  };

  const handleSaveProtocolCtrl = async () => {
    setPCtrlLoading(true);
    setPCtrlAlert({msg:'', type:''});
    try {
      await api.updateProcess(proc.id, {
        payment_date: pCtrl.payment_date || null,
        sent_to_fiscal_date: pCtrl.sent_to_fiscal_date || null,
        fiscal_name: pCtrl.fiscal_name || null,
        fiscal_return_date: pCtrl.fiscal_return_date || null,
        sent_to_analysis_date: pCtrl.sent_to_analysis_date || null
      });

      if (pCtrl.sent_to_analysis_date && proc.current_status === 'ENTRADA') {
        await api.addMovement(proc.id, 'ENC_ANALISE', 'Despachado automaticamente para a fila de análise através da ficha.', user);
      }
      setPCtrlAlert({msg: 'Ficha atualizada com sucesso!', type: 'ok'});
      loadData();
    } catch(err) {
      setPCtrlAlert({msg: 'Erro: ' + err.message, type: 'err'});
    } finally {
      setPCtrlLoading(false);
    }
  };

  const handleSaveProc = async () => {
    if(!epProt || !epReq) { setEpAlert('Preencha os campos obrigatórios.'); return; }
    try {
      await api.updateProcess(proc.id, { 
        protocol: epProt, 
        requester: epReq, 
        type: epType,
        bairro: epBairro,
        empreendimento: epEmp
      });
      await api.log('EDIÇÃO_REGISTRO', `Processo ${epProt}`, `Dados alterados por ${user.name}`, user);
      setIsEditProcOpen(false);
      loadData();
    } catch(err) {
      setEpAlert('Erro: ' + err.message);
    }
  };

  const handleSaveMovement = async () => {
    if(!emStatus) { setEmAlert('Selecione um status.'); return; }
    try {
      let attachmentUrl = selectedMov.attachment_url;
      if (editFile) {
        attachmentUrl = await api.uploadFile(editFile);
      }

      await api.editMovement(proc.id, selectedMov.id, emStatus, emNotes, user, attachmentUrl);
      setIsEditMovOpen(false);
      setEditFile(null);
      loadData();
    } catch(err) {
      setEmAlert('Erro: ' + err.message);
    }
  };

  return (
    <>
      {restricaoAtiva && (
        <div className="alert alert-err" style={{borderLeft: '8px solid #000', marginBottom: '18px', padding: '15px'}}>
          <div className="fca gap12">
            <span style={{fontSize: '24px'}}>🚫</span>
            <div>
              <div style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '4px'}}>ANÁLISE RESTRITA / BLOQUEADA</div>
              <div style={{fontSize: '14px'}}>{restricaoAtiva.motivo || 'Este bairro/empreendimento possui restrições que impedem ou limitam a análise técnica.'}</div>
            </div>
          </div>
        </div>
      )}
      <div className="fca gap10" style={{marginBottom: '14px', flexWrap: 'wrap'}}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Voltar</button>
        <span className="mono" style={{fontSize: '15px', fontWeight: 500}}>{proc.protocol}</span>
        <Badge statusId={proc.current_status} />
      </div>

      <div className="two-col" style={{alignItems: 'start'}}>
        <div>
          {/* Dados Gerais */}
          <div className="card">
            <div className="card-title">Dados do processo</div>
            <table style={{fontSize: '13px'}}>
              <tbody>
                <tr><td style={{color:'var(--text3)', padding:'6px 0', width:'90px'}}>Requerente</td><td style={{fontWeight:500}}>{proc.requester}</td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Tipo</td><td>{proc.type}</td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Bairro</td><td style={{fontWeight:500}}>{proc.bairro || '—'}</td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Empreend.</td><td style={{fontWeight:500}}>{proc.empreendimento || '—'}</td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Entrada</td><td>{fmtD(proc.created_at)}</td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Protocolo</td><td style={{fontSize:'12px'}}>{proc.created_by_name || '—'}</td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Analista</td><td>
                  {an ? <div className="fca gap8"><Avatar user={an} size={22}/><span>{an.name}</span></div> : <span style={{color:'var(--text3)'}}>Não atribuído</span>}
                </td></tr>
                <tr><td style={{color:'var(--text3)', padding:'6px 0'}}>Ciclos</td><td><span className="badge b-gray">{proc.movement_count} movim.</span></td></tr>
              </tbody>
            </table>
            
            {(isSuper || r === 'analyst' || r === 'protocol') && (
              <div style={{marginTop: '12px', textAlign: 'right'}}>
                <button className="btn btn-outline btn-sm" onClick={() => {
                  setEpProt(proc.protocol);
                  setEpReq(proc.requester);
                  setEpType(proc.type);
                  setIsEditProcOpen(true);
                }} style={{fontSize: '11px'}}>✏️ Editar Registro</button>
              </div>
            )}

            {analysts.length > 0 && (
              <>
                <hr />
                <div style={{fontSize:'11px', fontWeight:500, color:'var(--text2)', marginBottom:'7px', textTransform:'uppercase', letterSpacing:'.3px'}}>Atribuir analista</div>
                <div className="fca gap8">
                  <select style={{flex: 1}} onChange={handleAssign} value="">
                    <option value="">Selecione...</option>
                    {analysts.map(a => <option key={a.id} value={`${a.id}|${a.username}|${a.name}`}>{a.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Ficha Protocolo (Admin/Protocolo) */}
          {isProtPanel && (
            <div className="card" style={{borderTop: '4px solid var(--blue)'}}>
              <div className="card-title" style={{marginBottom: '12px'}}>Ficha do Protocolo (Modo Excel)</div>
              <div style={{background: 'var(--body-bg)', padding: '16px', borderRadius: 'var(--r)', border: '1px solid var(--border)', marginBottom: '16px'}}>
                <div style={{marginBottom: '12px'}}><strong style={{fontSize:'13px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px'}}>2. Etapas Fiscais & Taxas</strong></div>
                <div className="form-grid">
                  <div className="fg">
                    <label className="fca gap6">Pgto Comprovante <button type="button" tabIndex="-1" className="btn btn-outline btn-sm" onClick={() => setPCtrl({...pCtrl, payment_date: new Date().toISOString().split('T')[0]})} style={{padding: '2px 4px', fontSize:'10px'}}>Hoje</button></label>
                    <input type="date" value={pCtrl.payment_date} onChange={e => setPCtrl({...pCtrl, payment_date: e.target.value})} />
                  </div>
                  <div className="fg">
                    <label className="fca gap6">Envio Fiscalização <button type="button" tabIndex="-1" className="btn btn-outline btn-sm" onClick={() => setPCtrl({...pCtrl, sent_to_fiscal_date: new Date().toISOString().split('T')[0]})} style={{padding: '2px 4px', fontSize:'10px'}}>Hoje</button></label>
                    <input type="date" value={pCtrl.sent_to_fiscal_date} onChange={e => setPCtrl({...pCtrl, sent_to_fiscal_date: e.target.value})} />
                  </div>
                  <div className="fg">
                    <label>Nome do Fiscal</label>
                    <select value={pCtrl.fiscal_name} onChange={e => setPCtrl({...pCtrl, fiscal_name: e.target.value})}>
                      <option value="">— Não atribuído —</option>
                      {fiscais.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fca gap6">Retorno Fiscalização <button type="button" tabIndex="-1" className="btn btn-outline btn-sm" onClick={() => setPCtrl({...pCtrl, fiscal_return_date: new Date().toISOString().split('T')[0]})} style={{padding: '2px 4px', fontSize:'10px'}}>Hoje</button></label>
                    <input type="date" value={pCtrl.fiscal_return_date} onChange={e => setPCtrl({...pCtrl, fiscal_return_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div>
                <div style={{marginBottom: '12px'}}><strong style={{fontSize:'13px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px'}}>3. Conclusão do Protocolo</strong></div>
                <div className="fg full" style={{borderLeft: '3px solid var(--blue)', paddingLeft: '12px'}}>
                  <label className="fca gap6">Envio p/ Análise <button type="button" tabIndex="-1" className="btn btn-outline btn-sm" onClick={() => setPCtrl({...pCtrl, sent_to_analysis_date: new Date().toISOString().split('T')[0]})} style={{padding: '2px 4px', fontSize:'10px'}}>Hoje</button></label>
                  <input type="date" value={pCtrl.sent_to_analysis_date} onChange={e => setPCtrl({...pCtrl, sent_to_analysis_date: e.target.value})} />
                  <div style={{fontSize: '11px', color:'var(--text3)', marginTop: '4px'}}>*(Se preenchido agora, tramitará automaticamente à Análise)*</div>
                </div>
              </div>
              {pCtrlAlert.msg && <div className={`alert alert-${pCtrlAlert.type}`} style={{marginTop: 10}}>{pCtrlAlert.msg}</div>}
              <div style={{marginTop: '12px', textAlign: 'right'}}>
                <button className="btn btn-primary" onClick={handleSaveProtocolCtrl} disabled={pCtrlLoading} style={{padding: '10px 16px'}}>
                  {pCtrlLoading ? 'Salvando...' : '💾 Salvar Ficha'}
                </button>
              </div>
            </div>
          )}

          {/* Registrar Movimentação */}
          {canMove && nextStatuses.length > 0 ? (
            <div className="card">
              <div className="card-title">Registrar movimentação</div>
              <div className="alert alert-info" style={{marginBottom: '10px', fontSize: '12px'}}>Responsável atual: <strong>{SM[proc.current_status]?.who || '—'}</strong></div>
              <div className="fg" style={{marginBottom: '10px'}}>
                <label>Próximo status *</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">Selecione...</option>
                  {nextStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="fg" style={{marginBottom: '12px'}}>
                <label>Motivo Breve / Observação</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Motivo objetivo. Ex: Pendência de documentação X." />
              </div>
              <div className="fg" style={{marginBottom: '15px'}}>
                <label>Anexar Parecer (PDF)</label>
                <input type="file" accept=".pdf" onChange={e => setSelectedFile(e.target.files[0])} style={{fontSize: '12px'}} />
              </div>
              {movAlert && <div className="alert alert-err" style={{marginBottom: 10}}>{movAlert}</div>}
              <button className="btn btn-success btn-full" disabled={movLoading} onClick={handleAddMov}>
                {movLoading ? 'Registrando...' : 'Registrar movimentação'}
              </button>
            </div>
          ) : canMove ? (
            <div className="card"><div className="empty" style={{padding: '18px'}}>Nenhuma ação disponível para seu perfil neste status.</div></div>
          ) : (
            <div className="card"><div className="alert alert-warn" style={{marginBottom: 0}}>Aguardando ação de: <strong>{SM[proc.current_status]?.who || '—'}</strong></div></div>
          )}
        </div>

        {/* Histórico Timeline */}
        <div className="card">
          <div className="card-title">Histórico <span className="badge b-gray" style={{marginLeft: '4px', fontSize: '10px'}}>{movs.length} etapas</span></div>
          {movs.map((m, i, arr) => {
            const isLatest = i === 0;
            const canEdit = isLatest && (m.created_by_id === uid || isSuper);
            const statusConf = SM[m.status] || {};
            return (
              <div key={m.id} className="tl-item">
                {i < arr.length - 1 && <div className="tl-line"></div>}
                <div className="tl-dot" style={{background: statusConf.dot || '#888'}}></div>
                <div className="tl-content">
                  <div className="fca gap8">
                    <div style={{fontSize: '13px', fontWeight: 500}}>{m.label}</div>
                    {canEdit && (
                       <button className="btn btn-outline btn-sm" style={{padding: '2px 7px', fontSize: '10px', height: 'auto', minHeight: 0, color: 'var(--amber)'}} onClick={() => {
                          setSelectedMov(m);
                          setEmStatus(m.status);
                          setEmNotes(m.notes || '');
                          setIsEditMovOpen(true);
                       }}>✏️ Corrigir</button>
                    )}
                  </div>
                  <div style={{fontSize: '11px', color: 'var(--text3)'}}>{fmtDT(m.created_at)}</div>
                  <div style={{fontSize: '12px', color: 'var(--text2)'}}>por <strong>{m.created_by_name}</strong></div>
                  {m.notes && <div className="tl-note">{m.notes}</div>}
                  {m.attachment_url && (
                    <div style={{marginTop: '8px'}}>
                      <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{fontSize: '10px', padding: '4px 8px'}}>
                        📄 Visualizar Parecer (PDF)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- MODALS --- */}
      {isEditProcOpen && (
        <Modal 
          title="Editar Dados do Registro" 
          onClose={() => setIsEditProcOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setIsEditProcOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveProc}>Salvar Alterações</button>
          </>}
        >
          <div className="alert alert-info">Corrija apenas dados digitados incorretamente. Para mudar o status, use a linha do tempo.</div>
          <div className="fg" style={{marginBottom: '10px'}}>
            <label>Número do Protocolo *</label>
            <input value={epProt} onChange={e => setEpProt(e.target.value.toUpperCase())} style={{fontFamily: 'monospace'}} />
          </div>
          <div className="fg" style={{marginBottom: '10px'}}>
            <label>Requerente / Interessado *</label>
            <input value={epReq} onChange={e => setEpReq(e.target.value.toUpperCase())} />
          </div>
          <div className="fg" style={{marginBottom: '12px'}}>
            <label>Tipo de Processo *</label>
            <select value={epType} onChange={e => setEpType(e.target.value)}>
              {sysTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px'}}>
            <div className="fg">
              <label>Bairro</label>
              <input value={epBairro} onChange={e => { setEpBairro(e.target.value); checkRestriction(e.target.value, 'Bairro'); }} />
            </div>
            <div className="fg">
              <label>Empreendimento</label>
              <input value={epEmp} onChange={e => { setEpEmp(e.target.value); checkRestriction(e.target.value, 'Empreendimento'); }} />
            </div>
          </div>
          {epRestrictionAlert && (
            <div className="alert alert-warn" style={{borderLeft: '5px solid var(--red)', marginBottom: '12px'}}>
              <strong>⚠️ ALERTA DE RESTRIÇÃO: {epRestrictionAlert.nome.toUpperCase()}</strong><br/>
              <span style={{fontSize: '12px'}}>{epRestrictionAlert.motivo}</span>
            </div>
          )}
          {epAlert && <div className="alert alert-err">{epAlert}</div>}
        </Modal>
      )}

      {isEditMovOpen && (
        <Modal 
          title="Correção de Movimentação" 
          onClose={() => setIsEditMovOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setIsEditMovOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveMovement}>Salvar Correção</button>
          </>}
        >
          <div className="alert alert-warn">Isso alterará o status atual do processo em todo o sistema. Mude apenas para corrigir lançamentos equivocados.</div>
          <div className="fg" style={{marginBottom: '10px'}}>
            <label>Status correto *</label>
            <select value={emStatus} onChange={e => setEmStatus(e.target.value)}>
              {Object.values(SM).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="fg" style={{marginBottom: '12px'}}>
            <label>Observações / notas técnicas</label>
            <textarea value={emNotes} onChange={e => setEmNotes(e.target.value)} placeholder="Se necessário, corrija também a observação..." />
          </div>
          <div className="fg" style={{marginBottom: '12px'}}>
            <label>Substituir/Adicionar Anexo (PDF)</label>
            <input type="file" accept=".pdf" onChange={e => setEditFile(e.target.files[0])} style={{fontSize: '12px'}} />
            {selectedMov?.attachment_url && <div style={{fontSize: '10px', color: 'var(--text3)', marginTop: '4px'}}>Já existe um arquivo anexado. Envie um novo para substituir.</div>}
          </div>
          {emAlert && <div className="alert alert-err">{emAlert}</div>}
        </Modal>
      )}
    </>
  );
}
