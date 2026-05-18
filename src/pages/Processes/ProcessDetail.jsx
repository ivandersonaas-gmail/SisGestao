import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { FLOW, SM } from '../../config/constants';
import { Badge } from '../../components/UI/Badge';
import { Avatar } from '../../components/UI/Avatar';
import { Modal } from '../../components/UI/Modal';
import { Tour360 } from '../../components/UI/Tour360';

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
  const [isUnassignOpen, setIsUnassignOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
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

  const [unNotes, setUnNotes] = useState('');
  const [unAlert, setUnAlert] = useState('');
  const [unLoading, setUnLoading] = useState(false);

  // Georeferencing states
  const [isGeoOpen, setIsGeoOpen] = useState(false);
  const [geoNotes, setGeoNotes] = useState('');
  const [tempLat, setTempLat] = useState(null);
  const [tempLng, setTempLng] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoAlert, setGeoAlert] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapSearch, setMapSearch] = useState('');

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

  useEffect(() => {
    if (proc) {
      setGeoNotes(proc.report_observation || '');
      setTempLat(proc.latitude || null);
      setTempLng(proc.longitude || null);
    }
  }, [proc]);

  useEffect(() => {
    if (!isGeoOpen) {
      setMapReady(false);
      return;
    }

    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) return resolve();
        
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    loadLeaflet().then(() => {
      setMapReady(true);
    });
  }, [isGeoOpen]);

  useEffect(() => {
    if (!mapReady || !isGeoOpen || !window.L) return;

    const initialLat = tempLat || -3.78992;
    const initialLng = tempLng || -38.58892;

    const map = window.L.map('leaflet-picker-map').setView([initialLat, initialLng], 14);

    window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri World Imagery'
    }).addTo(map);

    let marker = null;
    if (tempLat && tempLng) {
      marker = window.L.marker([tempLat, tempLng]).addTo(map);
    }

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      setTempLat(parseFloat(lat.toFixed(6)));
      setTempLng(parseFloat(lng.toFixed(6)));
      
      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = window.L.marker(e.latlng).addTo(map);
      }
    });

    window.pickerMap = map;
    window.pickerMarker = marker;

    return () => {
      if (window.pickerMap) {
        window.pickerMap.remove();
        window.pickerMap = null;
        window.pickerMarker = null;
      }
    };
  }, [mapReady, isGeoOpen]);

  const handleMapSearch = async () => {
    if (!mapSearch.trim()) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearch)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        
        setTempLat(parseFloat(newLat.toFixed(6)));
        setTempLng(parseFloat(newLng.toFixed(6)));

        if (window.pickerMap) {
          window.pickerMap.setView([newLat, newLng], 16);
          if (window.pickerMarker) {
            window.pickerMarker.setLatLng([newLat, newLng]);
          } else {
            window.pickerMarker = window.L.marker([newLat, newLng]).addTo(window.pickerMap);
          }
        }
      } else {
        alert('Endereço não localizado no mapa.');
      }
    } catch(err) {
      alert('Erro na busca: ' + err.message);
    }
  };

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
  const canSeeTour = ['analyst', 'admin', 'secretary'].includes(r);
  
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

  const handleUnassign = async () => {
    setUnLoading(true);
    setUnAlert('');
    try {
      await api.unassignProcess(proc.id, unNotes.trim() ? `Devolvido: ${unNotes.trim()}` : null, user);
      setIsUnassignOpen(false);
      setUnNotes('');
      loadData();
    } catch(err) {
      setUnAlert('Erro: ' + err.message);
    } finally {
      setUnLoading(false);
    }
  };

  const handleSaveGeoData = async () => {
    setGeoLoading(true);
    setGeoAlert('');
    try {
      await api.updateProcess(proc.id, {
        latitude: tempLat || null,
        longitude: tempLng || null,
        report_observation: geoNotes.trim() || null
      });
      setIsGeoOpen(false);
      loadData();
    } catch(err) {
      setGeoAlert('Erro ao salvar: ' + err.message);
    } finally {
      setGeoLoading(false);
    }
  };

  const handleDeleteProcess = async () => {
    const confirmMsg = `⚠️ ATENÇÃO: Tem certeza absoluta de que deseja EXCLUIR este processo (${proc.protocol}) definitivamente?\n\nEsta ação apagará todo o histórico de movimentações e não poderá ser desfeita!`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await api.deleteProcess(proc.id);
      await api.log('EXCLUIR_PROCESSO', `Processo ${proc.protocol}`, `Registro excluído definitivamente por ${user.name}`, user);
      alert("Processo excluído com sucesso!");
      navigate('/processes');
    } catch (err) {
      alert("Erro ao excluir processo: " + err.message);
      setLoading(false);
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
              <div style={{marginTop: '12px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap'}}>
                {(isMyProc || isSuper) && proc.assigned_to && (
                  <button className="btn btn-outline btn-sm" onClick={() => setIsUnassignOpen(true)} style={{fontSize: '11px', color: 'var(--red)', borderColor: 'var(--red)44'}}>📥 Devolver p/ Armário</button>
                )}
                {canSeeTour && (
                  <button className="btn btn-outline btn-sm" onClick={() => setIsTourOpen(true)} style={{fontSize: '11px', borderColor: 'var(--blue)', color: 'var(--blue)'}}>📸 Vistoria 360º</button>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => {
                  setEpProt(proc.protocol);
                  setEpReq(proc.requester);
                  setEpType(proc.type);
                  setEpBairro(proc.bairro || '');
                  setEpEmp(proc.empreendimento || '');
                  setIsEditProcOpen(true);
                }} style={{fontSize: '11px'}}>✏️ Editar Registro</button>
                {(r === 'protocol' || r === 'admin' || r === 'secretary') && (
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteProcess} style={{fontSize: '11px'}}>
                    🗑️ Excluir Protocolo
                  </button>
                )}
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

          {/* Georreferenciamento e Observação Técnica */}
          <div className="card" style={{borderTop: '4px solid var(--green)'}}>
            <div className="card-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>📍 Georreferenciamento Técnico</span>
              {(isMyProc || isSuper) && (
                <button className="btn btn-primary btn-sm" onClick={() => setIsGeoOpen(true)} style={{fontSize: '11px', padding: '4px 8px'}}>
                  {proc.latitude ? '✏️ Alterar Dados' : '📍 Cadastrar Dados'}
                </button>
              )}
            </div>
            
            {proc.latitude && proc.longitude ? (
              <div>
                <div style={{background: 'var(--body-bg)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', fontSize: '13px', marginBottom: '12px'}}>
                  <div style={{display: 'flex', gap: '8px', marginBottom: '6px'}}>
                    <strong>Latitude:</strong> <span className="mono">{proc.latitude}</span>
                  </div>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <strong>Longitude:</strong> <span className="mono">{proc.longitude}</span>
                  </div>
                </div>
                {proc.report_observation && (
                  <div style={{fontSize: '13px'}}>
                    <strong style={{color: 'var(--text2)', display: 'block', marginBottom: '4px'}}>Observações Técnicas do Relatório:</strong>
                    <div style={{background: 'var(--body-bg)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', fontStyle: 'italic', color: 'var(--text2)', maxHeight: '120px', overflowY: 'auto'}}>
                      {proc.report_observation}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty" style={{padding: '16px 0', fontSize: '13px'}}>
                Nenhuma coordenada ou observação técnica cadastrada para este processo.
              </div>
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

      {isUnassignOpen && (
        <Modal
          title="Devolver ao Armário"
          onClose={() => setIsUnassignOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setIsUnassignOpen(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={handleUnassign} disabled={unLoading}>
              {unLoading ? 'Devolvendo...' : 'Confirmar Devolução'}
            </button>
          </>}
        >
          <div className="alert alert-warn">Ao confirmar, este processo deixará de estar em sua lista e voltará para o armário comum do setor.</div>
          <div className="fg">
            <label>Motivo da devolução (opcional)</label>
            <textarea 
              value={unNotes} 
              onChange={e => setUnNotes(e.target.value)} 
              placeholder="Ex: Protocolo em duplicidade, peguei por engano..." 
            />
          </div>
          {unAlert && <div className="alert alert-err" style={{marginTop: 10}}>{unAlert}</div>}
        </Modal>
      )}

      {isTourOpen && (
        <Modal 
          title="Tour Virtual 360º - Vistoria Técnica" 
          onClose={() => setIsTourOpen(false)}
          width="90%"
          footer={<button className="btn btn-outline" onClick={() => setIsTourOpen(false)}>Fechar</button>}
        >
          <Tour360 processId={proc.id} user={user} />
        </Modal>
      )}

      {isGeoOpen && (
        <Modal
          title="📍 Georreferenciamento Técnico & Notas do Relatório"
          onClose={() => setIsGeoOpen(false)}
          width="700px"
          footer={<>
            <button className="btn btn-outline" onClick={() => setIsGeoOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveGeoData} disabled={geoLoading}>
              {geoLoading ? 'Salvando...' : '💾 Salvar Dados Técnicos'}
            </button>
          </>}
        >
          <div style={{marginBottom: '14px'}}>
            <label style={{fontWeight: 600, display: 'block', marginBottom: '4px'}}>1. Pesquisar e Cravar Localização no Mapa de Satélite</label>
            <p style={{fontSize: '11px', color: 'var(--text3)', marginTop: 0, marginBottom: '8px'}}>Pesquise o endereço/bairro para aproximar o foco, e então CLIQUE no mapa para fixar o ponto exato da vistoria.</p>
            <div className="fca gap8" style={{marginBottom: '10px'}}>
              <input 
                type="text" 
                placeholder="Ex: Rua Floriano Peixoto, Centro..." 
                value={mapSearch}
                onChange={e => setMapSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMapSearch()}
                style={{flex: 1}}
              />
              <button type="button" className="btn btn-outline" onClick={handleMapSearch}>🔍 Localizar</button>
            </div>
            
            <div id="leaflet-picker-map" style={{height: '350px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '10px'}}></div>
            
            <div className="fca gap12" style={{background: 'var(--body-bg)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px'}}>
              <div><strong>Latitude Selecionada:</strong> <span className="mono" style={{color: 'var(--green)', fontWeight: 'bold'}}>{tempLat || 'Clique no mapa para marcar'}</span></div>
              <div><strong>Longitude Selecionada:</strong> <span className="mono" style={{color: 'var(--green)', fontWeight: 'bold'}}>{tempLng || 'Clique no mapa para marcar'}</span></div>
            </div>
          </div>

          <div className="fg" style={{marginTop: '16px'}}>
            <label style={{fontWeight: 600}}>2. Observações Adicionais para o Relatório Técnico</label>
            <textarea
              value={geoNotes}
              onChange={e => setGeoNotes(e.target.value)}
              placeholder="Descreva detalhes específicos do terreno, andamento da obra ou notas gerais que devem constar impressas no relatório..."
              rows={4}
            />
          </div>

          {geoAlert && <div className="alert alert-err" style={{marginTop: '10px'}}>{geoAlert}</div>}
        </Modal>
      )}
    </>
  );
}
