import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { STATUSES, CHART_COLORS } from '../../config/constants';
import { Badge } from '../../components/UI/Badge';
import Chart from 'chart.js/auto';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    fin: 0,
    armLen: 0,
    recent: []
  });
  const [loading, setLoading] = useState(true);

  const isAnalyst = user.role === 'analyst';

  useEffect(() => {
    async function loadData() {
      try {
        const [procs, armLen] = await Promise.all([
          api.getProcesses(user.role, user.id),
          user.role !== 'analyst' ? api.armario().then(a => a.length) : Promise.resolve(0)
        ]);

        const myProcs = isAnalyst ? procs.filter(p => p.assigned_to === user.id) : procs;
        const total = myProcs.length;
        const active = myProcs.filter(p => !['FINALIZADO','ARQUIVADO','ANUENCIA_SOLO','ASSINADO','DISP_RETIRADA'].includes(p.current_status)).length;
        const fin = myProcs.filter(p => ['FINALIZADO','ANUENCIA_SOLO','ASSINADO','DISP_RETIRADA'].includes(p.current_status)).length;
        
        const counts = {};
        STATUSES.forEach(s => counts[s.id] = 0);
        myProcs.forEach(p => counts[p.current_status] = (counts[p.current_status] || 0) + 1);
        
        const recent = [...myProcs].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 6);

        setStats({ total, active, fin, armLen, recent });

        // Build Chart
        if (canvasRef.current) {
          if (chartInstance.current) {
             chartInstance.current.destroy();
          }
          const labels = [];
          const data = [];
          const colors = [];
          STATUSES.forEach(s => {
            if (counts[s.id] > 0) {
              labels.push(s.label);
              data.push(counts[s.id]);
              colors.push(CHART_COLORS[s.id]);
            }
          });

          chartInstance.current = new Chart(canvasRef.current, {
            type: 'doughnut',
            data: {
              labels,
              datasets: [{ data, backgroundColor: colors, borderWidth: 2 }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 9, padding: 8 } }
              }
            }
          });
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [user]);

  if (loading) {
    return <div className="loading-wrap"><div className="spinner"></div><span>Carregando Dashboard...</span></div>;
  }

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">{isAnalyst ? 'Meus processos' : 'Total'}</div>
          <div className="kpi-value" style={{color: 'var(--blue)'}}>{stats.total}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Em andamento</div>
          <div className="kpi-value" style={{color: 'var(--amber)'}}>{stats.active}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Finalizados</div>
          <div className="kpi-value" style={{color: 'var(--green)'}}>{stats.fin}</div>
        </div>
        {!isAnalyst && (
          <div className="kpi clickable" onClick={() => navigate('/armario')}>
            <div className="kpi-label">No armário</div>
            <div className="kpi-value" style={{color: 'var(--amber)'}}>{stats.armLen}</div>
            <div className="kpi-sub">sem analista</div>
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Por status</div>
          <div className="chart-wrap" style={{height: '220px'}}>
            <canvas ref={canvasRef}></canvas>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Últimas movimentações</div>
          {stats.recent.length ? stats.recent.map(p => (
            <div 
              key={p.id}
              className="fca gap10" 
              style={{padding: '9px 0', borderBottom: '.5px solid var(--border)', cursor: 'pointer'}} 
              onClick={() => navigate(`/proc/${p.id}`)}
            >
              <div style={{flex: 1, minWidth: 0}}>
                <div className="mono" style={{fontWeight: 500}}>{p.protocol}</div>
                <div style={{fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {p.requester}
                </div>
              </div>
              <Badge statusId={p.current_status} />
            </div>
          )) : <div className="empty">Nenhum processo.</div>}
        </div>
      </div>
    </>
  );
}
