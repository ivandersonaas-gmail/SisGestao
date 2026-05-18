import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/UI/Badge';

export function ProtocolReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      
      const movs = await api.getProtocolReports(startIso, endIso);
      
      const userSummary = {};
      let totalEnviados = 0;
      let totalAutuados = 0;
      let totalDevolvidos = 0;
      let totalEntregues = 0;

      movs.forEach(m => {
        // Métricas Globais
        if (m.status === 'ENC_ANALISE') totalEnviados++;
        else if (m.status === 'ENTRADA') totalAutuados++;
        else if (m.status === 'DEV_REQUERENTE') totalDevolvidos++;
        else if (['FINALIZADO', 'DISP_RETIRADA'].includes(m.status)) totalEntregues++;

        // Produtividade por Usuário
        const uid = m.created_by_id || 'sistema';
        const name = m.created_by_name || 'Sistema';

        if (!userSummary[uid]) {
          userSummary[uid] = {
            name,
            entrada: 0,
            encAnalise: 0,
            devRequerente: 0,
            entregas: 0,
            total: 0
          };
        }

        const sumObj = userSummary[uid];
        if (m.status === 'ENTRADA') sumObj.entrada++;
        else if (m.status === 'ENC_ANALISE') sumObj.encAnalise++;
        else if (m.status === 'DEV_REQUERENTE') sumObj.devRequerente++;
        else if (['FINALIZADO', 'DISP_RETIRADA'].includes(m.status)) sumObj.entregas++;
        
        sumObj.total++;
      });

      const rankList = Object.values(userSummary).sort((a, b) => b.encAnalise - a.encAnalise || b.total - a.total);

      setReportData({
        totalAcoes: movs.length,
        totalEnviados,
        totalAutuados,
        totalDevolvidos,
        totalEntregues,
        rankList,
        movs
      });

    } catch(e) {
      alert('Erro ao gerar relatório de protocolo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <>
      <div className="card no-print" style={{marginBottom: '16px'}}>
        <div className="card-title">Relatório Avançado do Protocolo</div>
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
          {startDate || endDate ? (
            <button className="btn btn-ghost btn-sm" style={{color: 'var(--red)', marginLeft: 'auto'}} onClick={() => { 
              setStartDate(''); setEndDate(''); 
              setReportData(null);
            }}>
              Limpar Filtros
            </button>
          ) : null}
          {reportData && <button className="btn btn-success btn-sm" onClick={handlePrint} style={{marginLeft: startDate || endDate ? '8px' : 'auto'}}>🖨️ Imprimir PDF</button>}
        </div>
      </div>

      {!reportData && !loading && (
        <div className="empty no-print">Selecione o período acima e clique em Gerar Relatório para analisar as ações do Protocolo.</div>
      )}

      {reportData && (
        <div className="print-visible">
          <div className="print-only" style={{textAlign: 'center', marginBottom: '20px', display: 'none'}}>
            <h2 style={{margin: 0}}>Relatório de Atividades do Protocolo</h2>
            <p style={{color: '#555', margin: '4px 0'}}>
              Período Analisado: {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}
            </p>
            <hr style={{border: 0, borderBottom: '1px solid #ccc', margin: '15px 0'}} />
          </div>

          {/* Painel de Indicadores (KPIs) */}
          <div className="kpi-grid">
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Enviados para Análise</div>
              <div className="kpi-value" style={{color: 'var(--blue)'}}>{reportData.totalEnviados}</div>
              <div className="kpi-sub">Encaminhados ao Setor</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Processos Autuados</div>
              <div className="kpi-value" style={{color: 'var(--green)'}}>{reportData.totalAutuados}</div>
              <div className="kpi-sub">Novos cadastros</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Devolvidos ao Requerente</div>
              <div className="kpi-value" style={{color: 'var(--red)'}}>{reportData.totalDevolvidos}</div>
              <div className="kpi-sub">Com pendências documentais</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Entregues / Finais</div>
              <div className="kpi-value" style={{color: 'var(--teal)'}}>{reportData.totalEntregues}</div>
              <div className="kpi-sub">Retirados ou Prontos</div>
            </div>
          </div>
          
          {/* Tabela de Produtividade dos Servidores do Protocolo */}
          <div className="card" style={{boxShadow: 'none', border: '1px solid var(--border)', marginTop: '16px'}}>
            <div className="card-title"><span>Detalhamento de Produtividade do Setor</span></div>
            <div style={{width: '100%'}}>
              <table className="rt" style={{borderCollapse: 'collapse', width: '100%'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid #ccc', background: '#f9f9f9'}}>
                    <th style={{padding: '10px 8px', textAlign: 'left'}}>Servidor do Protocolo</th>
                    <th style={{padding: '10px 8px', textAlign: 'center'}}>Processos Autuados</th>
                    <th style={{padding: '10px 8px', textAlign: 'center'}}>Enviados p/ Análise</th>
                    <th style={{padding: '10px 8px', textAlign: 'center'}}>Devolvidos ao Req.</th>
                    <th style={{padding: '10px 8px', textAlign: 'center'}}>Entregas / Saídas</th>
                    <th style={{padding: '10px 8px', textAlign: 'center'}}>Total de Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rankList.length ? reportData.rankList.map(u => (
                    <tr key={u.name} style={{borderBottom: '1px solid #eee'}}>
                      <td style={{padding: '10px 8px', fontWeight: 500}}>{u.name}</td>
                      <td style={{padding: '10px 8px', textAlign: 'center'}}>{u.entrada}</td>
                      <td style={{padding: '10px 8px', textAlign: 'center', color: 'var(--blue)', fontWeight: 'bold'}}>{u.encAnalise}</td>
                      <td style={{padding: '10px 8px', textAlign: 'center'}}>{u.devRequerente}</td>
                      <td style={{padding: '10px 8px', textAlign: 'center'}}>{u.entregas}</td>
                      <td style={{padding: '10px 8px', textAlign: 'center', fontWeight: 'bold'}}>{u.total}</td>
                    </tr>
                  )) : <tr><td colSpan="6"><div className="empty">Nenhuma atividade registrada no protocolo neste período.</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Roll de Ações Executadas no Período */}
          {reportData.totalAcoes > 0 && (
            <div className="card" style={{boxShadow: 'none', border: '1px solid var(--border)', marginTop: '16px'}}>
              <div className="card-title" style={{marginBottom: '8px'}}><span>Roll de Ações do Protocolo ({reportData.totalAcoes})</span></div>
              <p style={{fontSize: '12px', color: 'var(--text3)', marginBottom: '12px', marginTop: 0}}>Histórico cronológico detalhado das movimentações de protocolo no sistema.</p>
              <table className="rt" style={{borderCollapse: 'collapse', width: '100%'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid #ccc', background: '#f9f9f9'}}>
                    <th style={{padding: '8px 4px', textAlign: 'left'}}>Data / Hora</th>
                    <th style={{padding: '8px 4px', textAlign: 'left'}}>Processo / Requerente</th>
                    <th style={{padding: '8px 4px', textAlign: 'left'}}>Movimentação Registrada</th>
                    <th style={{padding: '8px 4px', textAlign: 'left'}}>Observação / Despacho</th>
                    <th style={{padding: '8px 4px', textAlign: 'left'}}>Executor</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.movs.map(m => (
                    <tr key={m.id} style={{borderBottom: '1px solid #eee', pageBreakInside: 'avoid'}}>
                      <td style={{padding: '8px 4px', fontSize: '12px', verticalAlign: 'top', whiteSpace: 'nowrap'}}>
                        {new Date(m.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td style={{padding: '8px 4px', verticalAlign: 'top'}}>
                        <strong style={{fontFamily: 'monospace'}}>{m.process?.protocol || 'Desconhecido'}</strong><br/>
                        <span style={{fontSize: '12px'}}>{m.process?.requester || '—'}</span><br/>
                        <span style={{fontSize: '11px', color: 'var(--text3)'}}>{m.process?.type || '—'}</span>
                      </td>
                      <td style={{padding: '8px 4px', verticalAlign: 'top'}}>
                        <Badge statusId={m.status} />
                      </td>
                      <td style={{padding: '8px 4px', fontSize: '12px', verticalAlign: 'top', fontStyle: 'italic', color: 'var(--text2)'}}>
                        {m.notes || '—'}
                      </td>
                      <td style={{padding: '8px 4px', fontSize: '12px', verticalAlign: 'top', fontWeight: 500}}>
                        {m.created_by_name ? m.created_by_name.split(' ')[0] : 'Sistema'}
                      </td>
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
