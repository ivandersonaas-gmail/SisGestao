import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/UI/Badge';

export function AdvancedReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const generateReport = async () => {
    if(!startDate || !endDate) {
      alert("Preencha data inicial e final.");
      return;
    }
    setLoading(true);
    setReportData(null);
    try {
      const startIso = startDate + 'T00:00:00';
      const endIso = endDate + 'T23:59:59';
      
      const movs = await api.getAdvancedReports(startIso, endIso, isAnalyst, user.id);
      
      const analystsMap = {};
      let totalAcoes = 0;
      
      const activeTypesSet = new Set();
      
      movs.forEach(m => {
        totalAcoes++;
        const uid = m.created_by_id;
        if(!analystsMap[uid]) {
          analystsMap[uid] = { 
            name: m.created_by_name, 
            pareceres: 0, 
            anuencias: 0, 
            finalizados: 0, 
            types: {},
            total: 0 
          };
        }
        analystsMap[uid].total++;
        if(m.status === 'PARECER') analystsMap[uid].pareceres++;
        if(m.status === 'ANUENCIA' || m.status === 'ANUENCIA_SOLO') {
          analystsMap[uid].anuencias++;
        }
        if(m.status === 'ENC_ASSINATURA' || m.status === 'ANUENCIA_SOLO') {
          analystsMap[uid].finalizados++;
          const pType = m.process?.type || 'Outro';
          if(analystsMap[uid].types[pType] !== undefined) {
             analystsMap[uid].types[pType]++;
          } else {
             analystsMap[uid].types[pType] = 1;
             activeTypesSet.add(pType);
          }
        }
      });
      
      const activeTypes = Array.from(activeTypesSet).sort();
      const rankList = Object.values(analystsMap).sort((a,b) => b.total - a.total);

      setReportData({
        totalAcoes,
        licencas: movs.filter(m => ['ENC_ASSINATURA', 'ANUENCIA_SOLO'].includes(m.status)).length,
        rankList,
        movs,
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
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="fg" style={{flex: 1, minWidth: '140px'}}>
            <label>Data Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="fca gap6" style={{flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end'}}>
            <button className="btn btn-primary" onClick={generateReport} disabled={loading}>
              {loading ? 'Buscando...' : 'Gerar Relatório'}
            </button>
          </div>
        </div>
        <div className="fca gap8" style={{marginTop: '12px', flexWrap: 'wrap'}}>
          <button className="btn btn-outline btn-sm" onClick={() => setRepDates('hoje')}>Hoje</button>
          <button className="btn btn-outline btn-sm" onClick={() => setRepDates('semana')}>Semana</button>
          <button className="btn btn-outline btn-sm" onClick={() => setRepDates('mes')}>Este Mês</button>
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
                      <td style={{padding: '10px 4px', verticalAlign: 'top'}}>
                        {reportData.activeTypes.filter(t => a.types[t] > 0).length ? (
                          reportData.activeTypes.filter(t => a.types[t] > 0).map(t => (
                            <div key={t} style={{fontSize: '12px', color: 'var(--green)', fontWeight: 500, marginBottom: '2px'}}>• {a.types[t]}x {t}</div>
                          ))
                        ) : <span style={{fontSize: '12px', color: 'var(--text3)'}}>Nenhuma</span>}
                      </td>
                      <td style={{padding: '10px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'top'}}>{a.total}</td>
                    </tr>
                  )) : <tr><td colSpan="5"><div className="empty">Nenhuma ação oficial registrada no período.</div></td></tr>}
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
                    <th style={{padding: '6px 4px', textAlign: 'left'}}>Data</th>
                    <th style={{padding: '6px 4px', textAlign: 'left'}}>Processo / Requerente</th>
                    <th style={{padding: '6px 4px', textAlign: 'left'}}>Ação Efetuada</th>
                    {!isAnalyst && <th style={{padding: '6px 4px', textAlign: 'left'}}>Autor</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportData.movs.map(m => (
                    <tr key={m.id} style={{borderBottom: '1px solid #eee'}}>
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
                      {!isAnalyst && <td style={{padding: '6px 4px'}}><span style={{fontSize: '12px'}}>{m.created_by_name.split(' ')[0]}</span></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
