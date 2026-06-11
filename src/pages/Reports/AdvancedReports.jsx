import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/UI/Badge';

const getParsedGeoNotes = (obs) => {
  if (!obs) return '';
  try {
    const parsed = JSON.parse(obs);
    return (parsed && typeof parsed === 'object') ? (parsed.notes || '') : obs;
  } catch (e) {
    return obs;
  }
};

export function AdvancedReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados para seleção personalizada de processos
  const [showSelector, setShowSelector] = useState(false);
  const [allProcesses, setAllProcesses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProcIds, setSelectedProcIds] = useState([]);

  const isAnalyst = user.role === 'analyst';

  const setRepDates = (tipo) => {
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

  const openSelector = async () => {
    try {
      setLoading(true);
      const procs = await api.getProcesses(user.role, user.id);
      setAllProcesses(procs);
      setShowSelector(true);
    } catch (e) {
      alert("Erro ao carregar processos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reportData) return;

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
      setTimeout(() => {
        const containers = document.querySelectorAll('.map-print-container');
        containers.forEach(el => {
          if (el.classList.contains('leaflet-container')) return;

          const lat = parseFloat(el.getAttribute('data-lat'));
          const lng = parseFloat(el.getAttribute('data-lng'));
          if (isNaN(lat) || isNaN(lng)) return;

          const drawingsStr = el.getAttribute('data-drawings');
          let drawings = [];
          let parsedObs = null;
          if (drawingsStr) {
            try {
              const parsed = JSON.parse(drawingsStr);
              if (parsed && typeof parsed === 'object') {
                parsedObs = parsed;
                drawings = parsed.drawings || [];
              }
            } catch (e) {}
          }

          const mainLabel = parsedObs?.mainLabel;
          const refLabel = parsedObs?.refLabel;
          const refLat = parsedObs?.refLat;
          const refLng = parsedObs?.refLng;
          const mainCalloutPos = parsedObs?.mainCalloutPos;
          const refCalloutPos = parsedObs?.refCalloutPos;

          const map = window.L.map(el, {
            zoomControl: true,
            dragging: true,
            touchZoom: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true
          });

          window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Esri'
          }).addTo(map);

          window.L.circle([lat, lng], {
            color: '#e53e3e',
            fillColor: '#f56565',
            fillOpacity: 0.35,
            radius: 50
          }).addTo(map);

          window.L.marker([lat, lng]).addTo(map);

          let cLat = lat + 0.0005;
          let cLng = lng + 0.0005;
          if (mainLabel) {
            cLat = mainCalloutPos ? mainCalloutPos.lat : lat + 0.0005;
            cLng = mainCalloutPos ? mainCalloutPos.lng : lng + 0.0005;
            
            const mainIcon = window.L.divIcon({
              className: 'custom-report-callout main-report-callout',
              html: `<div style="background: white; padding: 5px 10px; border: 2px solid #0056b3; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap; font-size: 11px; font-weight: bold; color: #0056b3;">${mainLabel}</div>`,
              iconSize: null
            });
            window.L.marker([cLat, cLng], { icon: mainIcon }).addTo(map);
            window.L.polyline([[lat, lng], [cLat, cLng]], {
              color: '#0056b3',
              weight: 1.5,
              dashArray: '3, 3'
            }).addTo(map);
          }

          let rcLat = 0;
          let rcLng = 0;
          if (refLat && refLng) {
            const orangeIcon = window.L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [20, 33], iconAnchor: [10, 33], shadowSize: [33, 33]
            });
            window.L.marker([refLat, refLng], { icon: orangeIcon }).addTo(map);
            
            if (refLabel) {
              rcLat = refCalloutPos ? refCalloutPos.lat : refLat + 0.0005;
              rcLng = refCalloutPos ? refCalloutPos.lng : refLng + 0.0005;
              
              const refIcon = window.L.divIcon({
                className: 'custom-report-callout ref-report-callout',
                html: `<div style="background: white; padding: 5px 10px; border: 2px solid #d97706; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap; font-size: 11px; font-weight: bold; color: #d97706;">${refLabel}</div>`,
                iconSize: null
              });
              window.L.marker([rcLat, rcLng], { icon: refIcon }).addTo(map);
              window.L.polyline([[refLat, refLng], [rcLat, rcLng]], {
                color: '#d97706',
                weight: 1.5,
                dashArray: '3, 3'
              }).addTo(map);
            }
          }

          // Draw any saved lines, polygons or other reference points
          drawings.forEach(d => {
            if (d.type === 'marker') {
              const isMain = Math.abs(d.lat - lat) < 0.00002 && Math.abs(d.lng - lng) < 0.00002;
              const isRef = refLat && refLng && Math.abs(d.lat - refLat) < 0.00002 && Math.abs(d.lng - refLng) < 0.00002;
              if (isMain || isRef) return;

              const m = window.L.marker([d.lat, d.lng]).addTo(map);
              m.bindTooltip(d.text, {
                permanent: true,
                direction: 'top',
                className: 'custom-adaptive-tooltip'
              }).openTooltip();
            } else if (d.type === 'line') {
              window.L.polyline(d.points, { color: '#378ADD', weight: 4 }).addTo(map);
            } else if (d.type === 'polygon') {
              window.L.polygon(d.points, { color: '#E15241', fillColor: '#E15241', fillOpacity: 0.3, weight: 3 }).addTo(map);
            }
          });

          // Set view using saved center/zoom or fallback to fitBounds
          const mapZoom = parsedObs?.mapZoom;
          const mapCenter = parsedObs?.mapCenter;
          if (mapCenter && typeof mapCenter === 'object' && mapCenter.lat && mapCenter.lng && typeof mapZoom === 'number') {
            map.setView([mapCenter.lat, mapCenter.lng], mapZoom);
          } else {
            const coords = [[lat, lng]];
            if (mainLabel) {
              coords.push([cLat, cLng]);
            }
            if (refLat && refLng) {
              coords.push([refLat, refLng]);
              if (refLabel) {
                coords.push([rcLat, rcLng]);
              }
            }
            drawings.forEach(d => {
              if (d.type === 'line' || d.type === 'polygon') {
                if (Array.isArray(d.points)) {
                  d.points.forEach(pt => {
                    if (Array.isArray(pt)) coords.push(pt);
                    else if (pt && typeof pt === 'object' && pt.lat && pt.lng) coords.push([pt.lat, pt.lng]);
                  });
                }
              } else if (d.type === 'marker') {
                coords.push([d.lat, d.lng]);
              }
            });

            const bounds = window.L.latLngBounds(coords);
            map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
          }
        });
      }, 100);
    });
  }, [reportData]);

  const generateReport = async () => {
    if(selectedProcIds.length === 0 && (!startDate || !endDate)) {
      alert("Preencha data inicial e final ou selecione processos manualmente.");
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      let movs = [];
      if (selectedProcIds.length > 0) {
        const rawMovs = await api.getAdvancedReportsForProcesses(selectedProcIds, isAnalyst, user.id);
        // Agrupar por process_id e manter apenas a movimentação mais recente de cada processo para evitar duplicação no relatório customizado
        const latestMovsMap = {};
        rawMovs.forEach(m => {
          const pid = m.process_id;
          if (!latestMovsMap[pid] || new Date(m.created_at) > new Date(latestMovsMap[pid].created_at)) {
            latestMovsMap[pid] = m;
          }
        });
        movs = Object.values(latestMovsMap);
      } else {
        const startIso = startDate + 'T00:00:00';
        const endIso = endDate + 'T23:59:59';
        movs = await api.getAdvancedReports(startIso, endIso, isAnalyst, user.id);
      }
      
      const analystsMap = {};
      let totalAcoes = 0;
      
      const activeTypesSet = new Set();
      const finalizationStatuses = ['ANUENCIA_SOLO', 'ASSINADO'];
      
      // Filtrar movimentos de finalização apenas se eles tiverem sido cancelados/reabertos para análise ativa
      const filteredMovs = movs.filter(m => {
        if (['ANUENCIA_SOLO', 'ASSINADO', 'ENC_ASSINATURA', 'LIC_COND', 'ATO_APR', 'V2_ATO', 'V2_COND'].includes(m.status)) {
          const isReopened = ['EM_ANALISE', 'PARECER', 'RECEBIDO_SETOR', 'ENC_ANALISE', 'ENTRADA', 'RETORNO_REQ'].includes(m.process?.current_status);
          return !isReopened;
        }
        return true;
      });

      // Mapeamento unificado de ID de usuário para nome de usuário a partir de todos os movimentos buscados
      const userNamesMap = {};
      filteredMovs.forEach(m => {
        if (m.created_by_id && m.created_by_name) {
          userNamesMap[m.created_by_id] = m.created_by_name;
        }
      });

      // Mapear processos finalizados únicos no período para evitar dupla contagem absoluta
      const uniqueFinalizedProcsMap = {};
      filteredMovs.forEach(m => {
        if (finalizationStatuses.includes(m.status)) {
          if (!uniqueFinalizedProcsMap[m.process_id]) {
            uniqueFinalizedProcsMap[m.process_id] = m;
          }
        }
      });
      
      // Processar todas as ações gerais do Roll de Ações do período
      filteredMovs.forEach(m => {
        totalAcoes++;
        const uid = m.created_by_id;
        if(!analystsMap[uid]) {
          analystsMap[uid] = { 
            name: m.created_by_name, 
            pareceres: 0, 
            anuencias: 0, 
            assinaturas: 0,
            atosLicencas: 0,
            finalizados: 0, 
            types: {},
            total: 0 
          };
        }
        
        if(m.status === 'PARECER') analystsMap[uid].pareceres++;
        if(m.status === 'ANUENCIA') {
          analystsMap[uid].anuencias++; // Apenas ANUENCIA simples conta em Anuências
        }
        if(m.status === 'ENC_ASSINATURA') {
          analystsMap[uid].assinaturas++;
        }
        if(['LIC_COND', 'ATO_APR', 'V2_ATO', 'V2_COND'].includes(m.status)) {
          analystsMap[uid].atosLicencas++;
        }
      });

      // Atribuir as entregas finais oficializadas de forma única no período
      Object.values(uniqueFinalizedProcsMap).forEach(m => {
        // O analista que recebe o crédito da finalização é o que estava atribuído (assigned_to)
        // ou o próprio criador do movimento (em caso de anuencia de solo ou fallback)
        const uid = m.status === 'ANUENCIA_SOLO' ? m.created_by_id : (m.process?.assigned_to || m.created_by_id);
        
        if(!analystsMap[uid]) {
          analystsMap[uid] = {
            name: userNamesMap[uid] || m.created_by_name,
            pareceres: 0,
            anuencias: 0,
            assinaturas: 0,
            atosLicencas: 0,
            finalizados: 0,
            types: {},
            total: 0
          };
        }

        analystsMap[uid].finalizados++;

        const actionLabel = m.status === 'ANUENCIA_SOLO' ? 'Anuência de Solo' : 'Processo Finalizado';
        const pType = m.process?.type || 'Outro';
        const composedType = `${actionLabel} (${pType})`;

        if(analystsMap[uid].types[composedType] !== undefined) {
           analystsMap[uid].types[composedType]++;
        } else {
           analystsMap[uid].types[composedType] = 1;
           activeTypesSet.add(composedType);
        }
      });

      // Recalcular o Total Prod de cada analista com base nas colunas oficiais
      Object.keys(analystsMap).forEach(uid => {
        analystsMap[uid].total = analystsMap[uid].pareceres + analystsMap[uid].anuencias + analystsMap[uid].assinaturas + analystsMap[uid].atosLicencas + analystsMap[uid].finalizados;
      });
      
      const activeTypes = Array.from(activeTypesSet).sort();
      const rankList = Object.values(analystsMap).sort((a,b) => b.total - a.total);

      setReportData({
        totalAcoes,
        licencas: Object.keys(uniqueFinalizedProcsMap).length,
        rankList,
        movs: filteredMovs,
        activeTypes
      });

    } catch(e) {
      alert('Erro ao gerar relatorio: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      <div className="card no-print" style={{marginBottom: '16px'}}>
        <div className="card-title">Relatório de Produtividade (Avançado)</div>
        <div className="fca gap10" style={{flexWrap: 'wrap'}}>
          <div className="fg" style={{flex: 1, minWidth: '140px'}}>
            <label>Data Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={selectedProcIds.length > 0} />
          </div>
          <div className="fg" style={{flex: 1, minWidth: '140px'}}>
            <label>Data Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={selectedProcIds.length > 0} />
          </div>
          <div className="fca gap6" style={{flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end'}}>
            <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
              {loading ? 'Buscando...' : selectedProcIds.length > 0 ? `Gerar Customizado (${selectedProcIds.length})` : 'Gerar Relatório'}
            </button>
          </div>
        </div>
        <div className="fca gap8" style={{marginTop: '12px', flexWrap: 'wrap'}}>
          <button className="btn btn-outline btn-sm" onClick={() => { setSelectedProcIds([]); setRepDates('hoje'); }}>Hoje</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setSelectedProcIds([]); setRepDates('semana'); }}>Semana</button>
          <button className="btn btn-outline btn-sm" onClick={() => { setSelectedProcIds([]); setRepDates('mes'); }}>Este Mês</button>
          <button 
            className={`btn btn-sm ${selectedProcIds.length > 0 ? 'btn-amber' : 'btn-outline'}`} 
            onClick={openSelector}
            style={{textTransform: 'none'}}
          >
            {selectedProcIds.length > 0 ? `📁 Selecionados (${selectedProcIds.length})` : '📁 Selecionar Processos'}
          </button>
          {selectedProcIds.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{color: 'var(--red)'}} onClick={() => setSelectedProcIds([])}>
              Limpar Seleção
            </button>
          )}
          {reportData && <button className="btn btn-success btn-sm" onClick={handlePrint}>🖨️ Imprimir PDF</button>}
        </div>
      </div>

      {!reportData && !loading && (
        <div className="empty no-print">Selecione o período acima e clique em Gerar Relatório.</div>
      )}

      {reportData && (
        <div className="print-visible">
          <div className="print-only" style={{textAlign: 'center', marginBottom: '20px', display: 'none'}}>
            <h2 style={{margin: 0}}>Relatório de Produtividade - V3 {isAnalyst ? '(Individual)' : '(Equipe)'}</h2>
            <p style={{color: '#555', margin: '4px 0'}}>
              Período: {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}
            </p>
            <hr style={{border: 0, borderBottom: '1px solid #ccc', margin: '15px 0'}} />
          </div>

          <div className="kpi-grid">
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Produtividade Total</div>
              <div className="kpi-value" style={{color: 'var(--blue)'}}>{reportData.totalAcoes}</div>
              <div className="kpi-sub">Ações computadas</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Licenças / Finais</div>
              <div className="kpi-value" style={{color: 'var(--green)'}}>{reportData.licencas}</div>
              <div className="kpi-sub">Ciclos encerrados</div>
            </div>
          </div>
          
          <div className="card" style={{boxShadow: 'none', border: '1px solid var(--border)'}}>
            <div className="card-title"><span>Detalhamento de Entregas Oficiais {isAnalyst ? '(Minhas)' : '(Analistas)'}</span></div>
            <div style={{width: '100%'}}>
              <table className="rt" style={{borderCollapse: 'collapse', width: '100%'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid #ccc', background: '#f9f9f9'}}>
                    <th style={{padding: '10px 4px', textAlign: 'left'}}>Analista</th>
                    <th style={{padding: '10px 4px', textAlign: 'center'}}>Pareceres</th>
                    <th style={{padding: '10px 4px', textAlign: 'center'}}>Anuências</th>
                    <th style={{padding: '10px 4px', textAlign: 'center'}}>Para Assinatura</th>
                    <th style={{padding: '10px 4px', textAlign: 'center'}}>Atos / Licenças</th>
                    <th style={{padding: '10px 4px', textAlign: 'left'}}>Entregas Finais (Detalhadas)</th>
                    <th style={{padding: '10px 4px', textAlign: 'center'}}>Total Prod.</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rankList.length ? reportData.rankList.map(a => (
                    <tr key={a.name} style={{borderBottom: '1px solid #eee'}}>
                      <td style={{padding: '10px 4px', verticalAlign: 'top'}}>{a.name}</td>
                      <td style={{padding: '10px 4px', textAlign: 'center', verticalAlign: 'top'}}>{a.pareceres}</td>
                      <td style={{padding: '10px 4px', textAlign: 'center', verticalAlign: 'top'}}>{a.anuencias}</td>
                      <td style={{padding: '10px 4px', textAlign: 'center', verticalAlign: 'top'}}>{a.assinaturas}</td>
                      <td style={{padding: '10px 4px', textAlign: 'center', verticalAlign: 'top'}}>{a.atosLicencas}</td>
                      <td style={{padding: '10px 4px', verticalAlign: 'top'}}>
                        {reportData.activeTypes.filter(t => a.types[t] > 0).length ? (
                          reportData.activeTypes.filter(t => a.types[t] > 0).map(t => (
                            <div key={t} style={{fontSize: '12px', color: 'var(--green)', fontWeight: 500, marginBottom: '2px'}}>• {a.types[t]}x {t}</div>
                          ))
                        ) : <span style={{fontSize: '12px', color: 'var(--text3)'}}>Nenhuma</span>}
                      </td>
                      <td style={{padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top'}}>{a.total}</td>
                    </tr>
                  )) : <tr><td colSpan="7"><div className="empty">Nenhuma ação oficial registrada no período.</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {reportData.totalAcoes > 0 && (
            <div className="card" style={{boxShadow: 'none', border: '1px solid var(--border)', marginTop: '16px'}}>
              <div className="card-title" style={{marginBottom: '8px'}}><span>Roll de Ações Executadas no Período ({reportData.totalAcoes})</span></div>
              <p style={{fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', marginTop: 0}}>Listagem protocolar cronológica das entregas efetuadas.</p>
              <table className="rt" style={{borderCollapse: 'collapse', width: '100%'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid #ccc', background: '#f9f9f9'}}>
                    <th style={{padding: '6px 4px', textAlign: 'left', width: '150px'}}>Data</th>
                    <th style={{padding: '6px 4px', textAlign: 'left'}}>Processo / Requerente</th>
                    <th style={{padding: '6px 4px', textAlign: 'left', width: '220px'}}>Ação Efetuada</th>
                    {!isAnalyst && <th style={{padding: '6px 4px', textAlign: 'left', width: '120px'}}>Autor</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportData.movs.map(m => (
                    <React.Fragment key={m.id}>
                      <tr style={{borderBottom: 'none', pageBreakInside: 'avoid'}}>
                        <td style={{padding: '6px 4px', fontSize: '12px', verticalAlign: 'top'}}>
                          {new Date(m.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td style={{padding: '6px 4px', verticalAlign: 'top'}}>
                          <strong style={{fontFamily: 'monospace'}}>{m.process?.protocol || 'Desconhecido'}</strong><br/>
                          <span style={{fontSize: '12px'}}>{m.process?.requester || '—'}</span><br/>
                          <span style={{fontSize: '11px', color: 'var(--text3)'}}>{m.process?.type || '—'}</span>
                        </td>
                        <td style={{padding: '6px 4px', verticalAlign: 'top'}}>
                          <Badge statusId={m.status} />
                          {m.notes && <div style={{fontSize: '11px', color: 'var(--text2)', marginTop: '2px', maxWidth: '300px'}}><i>↳ {m.notes}</i></div>}
                        </td>
                        {!isAnalyst && <td style={{padding: '6px 4px', verticalAlign: 'top'}}><span style={{fontSize: '12px'}}>{m.created_by_name.split(' ')[0]}</span></td>}
                      </tr>
                      <tr style={{borderBottom: m.process?.latitude && m.process?.longitude ? 'none' : '1px solid #eee', pageBreakInside: 'avoid'}}>
                        <td colSpan={isAnalyst ? 3 : 4} style={{padding: '4px 4px 10px 4px', fontSize: '12px', verticalAlign: 'top'}}>
                          <div style={{background: '#f8fafc', padding: '8px 12px', borderRadius: '4px', borderLeft: '3px solid #cbd5e1'}}>
                            <strong style={{color: 'var(--text1)'}}>Observação: </strong>
                            <span style={{fontStyle: 'italic', color: 'var(--text2)'}}>
                              {getParsedGeoNotes(m.process?.report_observation) || '—'}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {m.process?.latitude && m.process?.longitude && (
                        <tr style={{borderBottom: '1px solid #eee', background: '#fafafa', pageBreakInside: 'avoid'}} className="print-keep">
                          <td colSpan={isAnalyst ? 3 : 4} style={{padding: '12px 16px'}}>
                            <div style={{display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap'}}>
                              {/* Mapa Técnico */}
                              <div style={{flex: '1 1 350px', minWidth: '280px'}}>
                                <div style={{fontSize: '10px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.5px'}}>📍 LOCALIZAÇÃO GEORREFERENCIADA</div>
                                <div 
                                  className="map-print-container" 
                                  data-lat={m.process.latitude} 
                                  data-lng={m.process.longitude} 
                                  data-drawings={m.process.report_observation}
                                  style={{height: '220px', borderRadius: '6px', border: '1px solid #ccc', position: 'relative'}}
                                ></div>
                                <style>{`
                                  .custom-adaptive-tooltip {
                                    background-color: rgba(15, 23, 42, 0.95) !important;
                                    color: #ffffff !important;
                                    border: 1px solid #334155 !important;
                                    border-radius: 6px !important;
                                    padding: 6px 10px !important;
                                    font-size: 10px !important;
                                    font-weight: 500 !important;
                                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
                                    white-space: pre-wrap !important;
                                    max-width: 180px !important;
                                    text-align: center !important;
                                  }
                                  .custom-adaptive-tooltip::before {
                                    border-top-color: rgba(15, 23, 42, 0.95) !important;
                                  }
                                `}</style>
                                <div style={{fontSize: '10px', color: 'var(--text3)', marginTop: '4px'}}>
                                  Lat: {m.process.latitude} | Lng: {m.process.longitude}
                                </div>
                              </div>
                              {/* QR Code de Autenticação */}
                              <div style={{flex: '0 0 160px', textAlign: 'center'}}>
                                <div style={{fontSize: '10px', fontWeight: 'bold', color: 'var(--text2)', marginBottom: '6px', letterSpacing: '.5px'}}>📍 NAVEGAÇÃO GPS</div>
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`https://www.google.com/maps/search/?api=1&query=${m.process.latitude},${m.process.longitude}`)}`} 
                                  alt="QR Code Navegação Google Maps" 
                                  style={{border: '1px solid #ddd', padding: '4px', borderRadius: '4px', background: '#fff', width: '120px', height: '120px'}}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showSelector && (
        <div className="modal-overlay fca jcc" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '600px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: '1px solid var(--border)',
            background: 'var(--card-bg, #fff)'
          }}>
            <div className="card-title" style={{marginBottom: '12px'}}>
              Selecionar Processos para Relatório Customizado
            </div>
            
            <div style={{marginBottom: '12px'}}>
              <input 
                type="text" 
                placeholder="🔍 Buscar por protocolo ou requerente..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{width: '100%', height: '38px', padding: '0 12px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent'}}
              />
            </div>
            
            <div className="fg" style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '16px',
              maxHeight: '45vh',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.02)'
            }}>
              {allProcesses.filter(p => {
                const q = searchTerm.toLowerCase();
                return p.protocol.toLowerCase().includes(q) || p.requester.toLowerCase().includes(q);
              }).length === 0 ? (
                <div className="empty" style={{padding: '24px'}}>Nenhum processo encontrado para a busca.</div>
              ) : (
                allProcesses.filter(p => {
                  const q = searchTerm.toLowerCase();
                  return p.protocol.toLowerCase().includes(q) || p.requester.toLowerCase().includes(q);
                }).map(p => (
                  <label 
                    key={p.id} 
                    className="fca gap10 clickable" 
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'background 0.2s',
                      background: selectedProcIds.includes(p.id) ? 'rgba(245, 158, 11, 0.08)' : 'transparent'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedProcIds.includes(p.id)} 
                      onChange={() => {
                        setSelectedProcIds(prev => 
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        );
                      }}
                      style={{width: '18px', height: '18px', cursor: 'pointer', marginRight: '10px'}}
                    />
                    <div style={{flex: 1}}>
                      <div className="fca gap8" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <span className="mono" style={{fontWeight: 600, fontSize: '13px'}}>{p.protocol}</span>
                        <Badge statusId={p.current_status} />
                      </div>
                      <div style={{fontSize: '12px', color: 'var(--text2)', marginTop: '2px'}}>{p.requester}</div>
                      <div style={{fontSize: '11px', color: 'var(--text3)'}}>{p.type}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            
            <div style={{fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', fontWeight: 500}}>
              Selecionados: {selectedProcIds.length} processo(s)
            </div>
            
            <div className="fca gap8 jce" style={{marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowSelector(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (selectedProcIds.length > 0) {
                  setStartDate('');
                  setEndDate('');
                }
                setShowSelector(false);
              }}>
                Confirmar Seleção ({selectedProcIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
