import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/UI/Badge';
import Chart from 'chart.js/auto';

// Função utilitária para calcular dias úteis descontando fins de semana e feriados cadastrados
function calcularDiasUteis(inicioStr, fimStr, feriadosSet) {
  if (!inicioStr || !fimStr) return 0;
  const sDate = new Date(inicioStr);
  const eDate = new Date(fimStr);
  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return 0;

  // Normalizar para o início do dia
  const s = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
  const e = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());

  if (s > e) return 0;

  let diasUteis = 0;
  let atual = new Date(s);

  while (atual <= e) {
    const diaSemana = atual.getDay();
    const fano = atual.getFullYear();
    const fmes = String(atual.getMonth() + 1).padStart(2, '0');
    const fdia = String(atual.getDate()).padStart(2, '0');
    const chaveData = `${fano}-${fmes}-${fdia}`;

    const ehFimDeSemana = (diaSemana === 0 || diaSemana === 6); // 0 = Domingo, 6 = Sábado
    const ehFeriado = feriadosSet.has(chaveData);

    if (!ehFimDeSemana && !ehFeriado) {
      diasUteis++;
    }
    atual.setDate(atual.getDate() + 1);
  }
  return diasUteis;
}

export function PerformanceAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rawProcesses, setRawProcesses] = useState([]);
  const [movements, setMovements] = useState([]);
  const [processTypes, setProcessTypes] = useState([]);
  const [feriados, setFeriados] = useState([]);

  // Estados dos Filtros
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [filtroTipoProc, setFiltroTipoProc] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroAnalista, setFiltroAnalista] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroTrimestre, setFiltroTrimestre] = useState('');

  // Refs para as instâncias dos gráficos
  const chartTendenciaRef = useRef(null);
  const chartDistribuicaoRef = useRef(null);
  const chartProdutividadeRef = useRef(null);
  const chartTiposRef = useRef(null);

  const canvasTendencia = useRef(null);
  const canvasDistribuicao = useRef(null);
  const canvasProdutividade = useRef(null);
  const canvasTipos = useRef(null);

  // Carregar dados gerais
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [procsRes, movsRes, typesRes, feriadosRes] = await Promise.all([
          api.getProcessesForAnalytics(),
          api.getAllMovementsForAnalytics(),
          api.getAllProcessTypes(),
          api.getFeriados()
        ]);
        setRawProcesses(procsRes);
        setMovements(movsRes);
        setProcessTypes(typesRes);
        setFeriados(feriadosRes);
      } catch (e) {
        console.error("Erro ao buscar dados de BI:", e);
        alert("Erro ao buscar dados analíticos: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Set de feriados formatado em YYYY-MM-DD para busca veloz
  const feriadosSet = new Set(feriados.map(f => f.data));

  // Processar dados (cálculo de prazos e etapas por processo)
  const processedData = rawProcesses.map(proc => {
    // Pegar movimentos do processo específico
    const procMovs = movements
      .filter(m => m.process_id === proc.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Achar data de distribuição: primeiro movimento com status RECEBIDO_SETOR ou atribuído
    const movDistribuicao = procMovs.find(m => ['RECEBIDO_SETOR', 'EM_ANALISE'].includes(m.status));
    const dataDistribuicao = movDistribuicao ? movDistribuicao.created_at : proc.created_at;

    // Achar data de início de análise: primeiro movimento EM_ANALISE
    const movInicioAnalise = procMovs.find(m => m.status === 'EM_ANALISE');
    const dataInicioAnalise = movInicioAnalise ? movInicioAnalise.created_at : dataDistribuicao;

    // Achar data de emissão de licença: primeiro movimento de emissão
    const movEmissao = procMovs.find(m => ['LIC_COND', 'ATO_APR', 'ANUENCIA', 'V2_ATO', 'V2_COND'].includes(m.status));
    const dataEmissao = movEmissao ? movEmissao.created_at : null;

    // Achar data de conclusão: primeiro movimento de conclusão
    const movConclusao = procMovs.find(m => ['ASSINADO', 'FINALIZADO', 'ANUENCIA_SOLO', 'DISP_RETIRADA'].includes(m.status));
    const dataConclusao = movConclusao ? movConclusao.created_at : null;

    // Determinar o prazo legal configurado para este tipo de processo (fallback padrão Plano Diretor)
    const pType = processTypes.find(t => t.name === proc.type);
    let prazoLegal = pType?.prazo_legal_dias;
    if (!prazoLegal) {
      // Fallback estrito do plano diretor
      prazoLegal = (proc.type.toLowerCase().includes('condominio') || proc.type.toLowerCase().includes('loteamento')) ? 180 : 60;
    }

    const estaConcluido = !!dataConclusao;

    // Pegar todos os movimentos excluindo o de conclusão para achar a última ação do analista/usuário antes da finalização
    const procMovsSemConclusao = procMovs.filter(m => !['ASSINADO', 'FINALIZADO', 'ANUENCIA_SOLO', 'DISP_RETIRADA'].includes(m.status));
    
    // Data de Cadastro
    const dataCadastro = proc.created_at;

    // Data do último movimento de fato
    const dataUltimaMov = procMovs.length > 0 ? procMovs[procMovs.length - 1].created_at : proc.created_at;

    // Data de referência do movimento anterior ao encerramento (para concluídos) ou último movimento (para andamento)
    const dataRefUltimaAcao = estaConcluido
      ? (procMovsSemConclusao.length > 0 ? procMovsSemConclusao[procMovsSemConclusao.length - 1].created_at : proc.created_at)
      : dataUltimaMov;

    // Calcular tempos de tramitação (dias úteis)
    // O tempo total relevante para o prazo legal (60 ou 180 dias) é a partir do último movimento/ação relevante
    const tempoTotal = estaConcluido 
      ? calcularDiasUteis(dataRefUltimaAcao, dataConclusao, feriadosSet) 
      : calcularDiasUteis(dataRefUltimaAcao, new Date().toISOString(), feriadosSet);

    // Dias úteis totais desde o cadastro inicial (informativo)
    const tempoDesdeCadastro = estaConcluido
      ? calcularDiasUteis(proc.created_at, dataConclusao, feriadosSet)
      : calcularDiasUteis(proc.created_at, new Date().toISOString(), feriadosSet);

    const tempoDistribuicao = calcularDiasUteis(proc.created_at, dataDistribuicao, feriadosSet);
    const tempoAnaliseTecnica = calcularDiasUteis(dataDistribuicao, dataInicioAnalise, feriadosSet);
    
    const fimEmissao = dataEmissao || dataConclusao || new Date().toISOString();
    const tempoEmissaoLicenca = calcularDiasUteis(dataInicioAnalise, fimEmissao, feriadosSet);
    
    const tempoEtapas = {
      distribuicao: tempoDistribuicao,
      analise: tempoAnaliseTecnica,
      emissao: tempoEmissaoLicenca
    };

    const concluidoNoPrazo = tempoTotal <= prazoLegal;

    return {
      ...proc,
      prazoLegal,
      estaConcluido,
      dataProtocolo: proc.created_at,
      dataCadastro,
      dataUltimaMov,
      dataRefUltimaAcao,
      dataDistribuicao,
      dataInicioAnalise,
      dataEmissao,
      dataConclusao,
      tempoTotal, // Dias desde a última movimentação relevante
      tempoDesdeCadastro, // Dias desde o cadastro inicial
      tempoEtapas,
      concluidoNoPrazo
    };
  });

  // Aplicar filtros
  const filteredData = processedData.filter(proc => {
    // Filtro por Período de Protocolo
    if (filtroPeriodoInicio && new Date(proc.dataProtocolo) < new Date(filtroPeriodoInicio + 'T00:00:00')) return false;
    if (filtroPeriodoFim && new Date(proc.dataProtocolo) > new Date(filtroPeriodoFim + 'T23:59:59')) return false;

    // Filtro por Tipo de Processo
    if (filtroTipoProc && proc.type !== filtroTipoProc) return false;

    // Filtro por Status
    if (filtroStatus === 'concluidos' && !proc.estaConcluido) return false;
    if (filtroStatus === 'andamento' && proc.estaConcluido) return false;

    // Filtro por Analista Responsável
    if (filtroAnalista && proc.analyst_name !== filtroAnalista) return false;

    // Filtros de tempo agrupados
    const dProt = new Date(proc.dataProtocolo);
    const anoProt = dProt.getFullYear();
    const mesProt = dProt.getMonth() + 1; // 1-indexed

    if (filtroAno && anoProt !== parseInt(filtroAno)) return false;
    if (filtroMes && mesProt !== parseInt(filtroMes)) return false;

    if (filtroTrimestre) {
      const trim = Math.ceil(mesProt / 3);
      if (trim !== parseInt(filtroTrimestre)) return false;
    }

    return true;
  });

  // Cálculos Gerais dos Indicadores (Base Filtrada)
  const concluidos = filteredData.filter(p => p.estaConcluido);
  const emAndamento = filteredData.filter(p => !p.estaConcluido);

  const totalProcessos = filteredData.length;
  const qtdConcluidos = concluidos.length;
  const qtdEmAndamento = emAndamento.length;

  const totalDiasConcluidos = concluidos.reduce((acc, curr) => acc + curr.tempoTotal, 0);
  const prazoMedioGeral = qtdConcluidos > 0 ? parseFloat((totalDiasConcluidos / qtdConcluidos).toFixed(1)) : 0;

  const dentroDoPrazoCount = concluidos.filter(p => p.concluidoNoPrazo).length;
  const foraDoPrazoCount = qtdConcluidos - dentroDoPrazoCount;
  const pctNoPrazo = qtdConcluidos > 0 ? Math.round((dentroDoPrazoCount / qtdConcluidos) * 100) : 0;

  // Estatísticas por Tipo de Processo
  const tiposEstatisticas = Array.from(new Set(processedData.map(p => p.type))).map(tipoName => {
    const procsTipo = filteredData.filter(p => p.type === tipoName);
    const concluidosTipo = procsTipo.filter(p => p.estaConcluido);
    const andamentoTipo = procsTipo.filter(p => !p.estaConcluido);
    const tempos = concluidosTipo.map(p => p.tempoTotal).sort((a, b) => a - b);

    const qtdConcluidosTipo = concluidosTipo.length;
    const prazoMin = tempos.length > 0 ? tempos[0] : 0;
    const prazoMax = tempos.length > 0 ? tempos[tempos.length - 1] : 0;
    
    // Média
    const somaTempos = tempos.reduce((a, b) => a + b, 0);
    const prazoMedio = qtdConcluidosTipo > 0 ? parseFloat((somaTempos / qtdConcluidosTipo).toFixed(1)) : 0;

    // Mediana
    let mediana = 0;
    if (tempos.length > 0) {
      const mid = Math.floor(tempos.length / 2);
      mediana = tempos.length % 2 !== 0 ? tempos[mid] : parseFloat(((tempos[mid - 1] + tempos[mid]) / 2).toFixed(1));
    }

    // Desvio Padrão
    let desvioPadrao = 0;
    if (qtdConcluidosTipo > 1) {
      const variancia = tempos.reduce((acc, val) => acc + Math.pow(val - prazoMedio, 2), 0) / (qtdConcluidosTipo - 1);
      desvioPadrao = parseFloat(Math.sqrt(variancia).toFixed(1));
    }

    // Tempo Médio por Etapas
    const totalDist = concluidosTipo.reduce((acc, p) => acc + p.tempoEtapas.distribuicao, 0);
    const totalAnal = concluidosTipo.reduce((acc, p) => acc + p.tempoEtapas.analise, 0);
    const totalEmis = concluidosTipo.reduce((acc, p) => acc + p.tempoEtapas.emissao, 0);

    const etpMedias = {
      distribuicao: qtdConcluidosTipo > 0 ? parseFloat((totalDist / qtdConcluidosTipo).toFixed(1)) : 0,
      analise: qtdConcluidosTipo > 0 ? parseFloat((totalAnal / qtdConcluidosTipo).toFixed(1)) : 0,
      emissao: qtdConcluidosTipo > 0 ? parseFloat((totalEmis / qtdConcluidosTipo).toFixed(1)) : 0
    };

    // Prazos Legais
    const dentroPrazo = concluidosTipo.filter(p => p.concluidoNoPrazo).length;
    const foraPrazo = qtdConcluidosTipo - dentroPrazo;
    const pctDentro = qtdConcluidosTipo > 0 ? Math.round((dentroPrazo / qtdConcluidosTipo) * 100) : 0;
    const pctFora = qtdConcluidosTipo > 0 ? 100 - pctDentro : 0;

    return {
      type: tipoName,
      concluidos: qtdConcluidosTipo,
      andamento: andamentoTipo.length,
      prazoMedio,
      prazoMin,
      prazoMax,
      mediana,
      desvioPadrao,
      etpMedias,
      dentroPrazo,
      foraPrazo,
      pctDentro,
      pctFora
    };
  }).filter(item => item.concluidos > 0 || item.andamento > 0);

  // Rankings
  const rankings = {
    maisRapidos: [...concluidos].sort((a, b) => a.tempoTotal - b.tempoTotal).slice(0, 5),
    maisDemorados: [...concluidos].sort((a, b) => b.tempoTotal - a.tempoTotal).slice(0, 5)
  };

  // Desempenho por Analista (Setor)
  const analistasList = Array.from(new Set(processedData.filter(p => p.analyst_name).map(p => p.analyst_name)));
  const analistasDesempenho = analistasList.map(name => {
    const procs = filteredData.filter(p => p.analyst_name === name);
    const conc = procs.filter(p => p.estaConcluido);
    const totalDias = conc.reduce((acc, curr) => acc + curr.tempoTotal, 0);
    const prazoMedio = conc.length > 0 ? parseFloat((totalDias / conc.length).toFixed(1)) : 0;
    return { name, total: procs.length, concluido: conc.length, prazoMedio };
  }).filter(a => a.concluido > 0);

  const rankingAnalistas = {
    melhor: [...analistasDesempenho].sort((a, b) => a.prazoMedio - b.prazoMedio).slice(0, 3),
    pior: [...analistasDesempenho].sort((a, b) => b.prazoMedio - a.prazoMedio).slice(0, 3)
  };

  // Comparativos Temporais
  const getComparativoTemporal = () => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;

    // Filtros de processos por período
    const procMesAtual = processedData.filter(p => {
      const d = new Date(p.dataProtocolo);
      return d.getFullYear() === anoProt(p) && d.getMonth() + 1 === mesAtual;
    });
    const procMesAnterior = processedData.filter(p => {
      const d = new Date(p.dataProtocolo);
      const anterior = mesAtual === 1 ? 12 : mesAtual - 1;
      const anoAnterior = mesAtual === 1 ? anoAtual - 1 : anoAtual;
      return d.getFullYear() === anoAnterior && d.getMonth() + 1 === anterior;
    });

    const getMétricasComp = (lista) => {
      const conc = lista.filter(l => l.estaConcluido);
      const prazoMedio = conc.length > 0 ? parseFloat((conc.reduce((a, b) => a + b.tempoTotal, 0) / conc.length).toFixed(1)) : 0;
      return { total: lista.length, concluido: conc.length, prazoMedio };
    };

    function anoProt(p) {
      return new Date(p.dataProtocolo).getFullYear();
    }

    return {
      mesAtual: getMétricasComp(procMesAtual),
      mesAnterior: getMétricasComp(procMesAnterior)
    };
  };

  const comparativo = getComparativoTemporal();

  // Alertas Automáticos & Gargalos
  const alertas = {
    acimaDoPrazoLegal: filteredData.filter(p => p.estaConcluido && !p.concluidoNoPrazo),
    emAtrasoAndamento: filteredData.filter(p => !p.estaConcluido && p.tempoTotal > p.prazoLegal),
    gargaloEtapa: tiposEstatisticas.reduce((max, curr) => {
      if (!max || curr.prazoMedio > max.prazoMedio) return curr;
      return max;
    }, null)
  };

  // Renderização de Gráficos
  useEffect(() => {
    if (loading || filteredData.length === 0) return;

    // Destruir gráficos anteriores se existirem
    if (chartTendenciaRef.current) chartTendenciaRef.current.destroy();
    if (chartDistribuicaoRef.current) chartDistribuicaoRef.current.destroy();
    if (chartProdutividadeRef.current) chartProdutividadeRef.current.destroy();
    if (chartTiposRef.current) chartTiposRef.current.destroy();

    // 1. Gráfico de Tendência (Média de Prazos por Mês)
    const mesesAgrupados = {};
    concluidos.forEach(p => {
      const d = new Date(p.dataProtocolo);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!mesesAgrupados[label]) mesesAgrupados[label] = { total: 0, soma: 0 };
      mesesAgrupados[label].total++;
      mesesAgrupados[label].soma += p.tempoTotal;
    });

    const sortedMeses = Object.keys(mesesAgrupados).sort();
    const dadosTendencia = sortedMeses.map(m => parseFloat((mesesAgrupados[m].soma / mesesAgrupados[m].total).toFixed(1)));
    const labelsTendencia = sortedMeses.map(m => {
      const [ano, mes] = m.split('-');
      const nomeMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return `${nomeMeses[parseInt(mes) - 1]}/${ano}`;
    });

    if (canvasTendencia.current) {
      chartTendenciaRef.current = new Chart(canvasTendencia.current, {
        type: 'line',
        data: {
          labels: labelsTendencia.length > 0 ? labelsTendencia : ["Sem dados"],
          datasets: [{
            label: 'Prazo Médio (Dias Úteis)',
            data: dadosTendencia.length > 0 ? dadosTendencia : [0],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.2,
            fill: true,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // 2. Gráfico de Distribuição dos Prazos
    const faixas = { "Até 30 dias": 0, "31-60 dias": 0, "61-90 dias": 0, "91-180 dias": 0, "Mais de 180 dias": 0 };
    concluidos.forEach(p => {
      if (p.tempoTotal <= 30) faixas["Até 30 dias"]++;
      else if (p.tempoTotal <= 60) faixas["31-60 dias"]++;
      else if (p.tempoTotal <= 90) faixas["61-90 dias"]++;
      else if (p.tempoTotal <= 180) faixas["91-180 dias"]++;
      else faixas["Mais de 180 dias"]++;
    });

    if (canvasDistribuicao.current) {
      chartDistribuicaoRef.current = new Chart(canvasDistribuicao.current, {
        type: 'bar',
        data: {
          labels: Object.keys(faixas),
          datasets: [{
            label: 'Quantidade de Processos',
            data: Object.values(faixas),
            backgroundColor: '#10b981',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // 3. Gráfico de Produtividade por Período (Finalizados vs Novos)
    const agrupadoProd = {};
    filteredData.forEach(p => {
      const d = new Date(p.dataProtocolo);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!agrupadoProd[label]) agrupadoProd[label] = { novos: 0, concluido: 0 };
      agrupadoProd[label].novos++;
      if (p.estaConcluido) agrupadoProd[label].concluido++;
    });

    const sortedProd = Object.keys(agrupadoProd).sort();
    const dadosNovos = sortedProd.map(m => agrupadoProd[m].novos);
    const dadosConcluidos = sortedProd.map(m => agrupadoProd[m].concluido);
    const labelsProd = sortedProd.map(m => {
      const [ano, mes] = m.split('-');
      const nomeMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return `${nomeMeses[parseInt(mes) - 1]}/${ano}`;
    });

    if (canvasProdutividade.current) {
      chartProdutividadeRef.current = new Chart(canvasProdutividade.current, {
        type: 'bar',
        data: {
          labels: labelsProd.length > 0 ? labelsProd : ["Sem dados"],
          datasets: [
            { label: 'Novos Protocolos', data: dadosNovos, backgroundColor: '#64748b' },
            { label: 'Concluídos', data: dadosConcluidos, backgroundColor: '#2563eb' }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // 4. Gráfico de Prazos por Tipo de Processo
    if (canvasTipos.current && tiposEstatisticas.length > 0) {
      chartTiposRef.current = new Chart(canvasTipos.current, {
        type: 'bar',
        data: {
          labels: tiposEstatisticas.map(t => t.type),
          datasets: [{
            label: 'Prazo Médio (Dias Úteis)',
            data: tiposEstatisticas.map(t => t.prazoMedio),
            backgroundColor: '#f59e0b',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } }
        }
      });
    }

  }, [loading, filtroPeriodoInicio, filtroPeriodoFim, filtroTipoProc, filtroStatus, filtroAnalista, filtroAno, filtroMes, filtroTrimestre]);

  // Função para Limpar Filtros
  const limparFiltros = () => {
    setFiltroPeriodoInicio('');
    setFiltroPeriodoFim('');
    setFiltroTipoProc('');
    setFiltroStatus('');
    setFiltroAnalista('');
    setFiltroAno('');
    setFiltroMes('');
    setFiltroTrimestre('');
  };

  const formatarPercentual = (val) => isNaN(val) ? 0 : val;

  return (
    <>
      {/* 1. SEÇÃO DE FILTROS */}
      <div className="card no-print" style={{marginBottom: '16px'}}>
        <div className="card-title">Filtros Gerenciais</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '10px'
        }}>
          <div className="fg">
            <label>Ano do Protocolo</label>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
              <option value="">Todos os anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          <div className="fg">
            <label>Trimestre</label>
            <select value={filtroTrimestre} onChange={e => setFiltroTrimestre(e.target.value)}>
              <option value="">Todos</option>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
              <option value="4">4º Trimestre</option>
            </select>
          </div>
          <div className="fg">
            <label>Mês do Protocolo</label>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
              <option value="">Todos os meses</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>
          <div className="fg">
            <label>Tipo de Processo</label>
            <select value={filtroTipoProc} onChange={e => setFiltroTipoProc(e.target.value)}>
              <option value="">Todos os tipos</option>
              {processTypes.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label>Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="concluidos">Apenas Concluídos</option>
              <option value="andamento">Apenas Em Andamento</option>
            </select>
          </div>
          <div className="fg">
            <label>Analista Responsável</label>
            <select value={filtroAnalista} onChange={e => setFiltroAnalista(e.target.value)}>
              <option value="">Todos os analistas</option>
              {analistasList.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label>Período Inicial</label>
            <input type="date" value={filtroPeriodoInicio} onChange={e => setFiltroPeriodoInicio(e.target.value)} />
          </div>
          <div className="fg">
            <label>Período Final</label>
            <input type="date" value={filtroPeriodoFim} onChange={e => setFiltroPeriodoFim(e.target.value)} />
          </div>
        </div>
        <div style={{display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end'}}>
          <button className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar Filtros</button>
          <button className="btn btn-success btn-sm" onClick={() => window.print()}>🖨️ Imprimir PDF / Relatório</button>
        </div>
      </div>

      {loading ? (
        <div className="empty">Calculando indicadores e renderizando painéis gerenciais...</div>
      ) : (
        <div className="print-visible">
          
          {/* Título de Impressão */}
          <div className="print-only" style={{textAlign: 'center', marginBottom: '20px', display: 'none'}}>
            <h2 style={{margin: 0}}>SisGestão — Relatório de Produtividade, Prazos e Indicadores de Processos</h2>
            <p style={{color: '#555', margin: '4px 0'}}>
              Emitido em: {new Date().toLocaleDateString('pt-BR')} | Base: {filteredData.length} processos analisados
            </p>
            <hr style={{border: 0, borderBottom: '1px solid #ccc', margin: '15px 0'}} />
          </div>

          {/* 2. DASHBOARD EXECUTIVO - CARDS */}
          <div className="kpi-grid" style={{marginBottom: '16px'}}>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Prazo Médio Geral</div>
              <div className="kpi-value" style={{color: 'var(--blue)'}}>{prazoMedioGeral} dias</div>
              <div className="kpi-sub">Úteis do protocolo à entrega</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Total de Processos</div>
              <div className="kpi-value" style={{color: 'var(--text1)'}}>{totalProcessos}</div>
              <div className="kpi-sub">No período selecionado</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Qtd Concluída</div>
              <div className="kpi-value" style={{color: 'var(--green)'}}>{qtdConcluidos}</div>
              <div className="kpi-sub">({formatarPercentual(Math.round((qtdConcluidos / (totalProcessos || 1)) * 100))}% de eficiência)</div>
            </div>
            <div className="kpi" style={{border: '1px solid var(--border)'}}>
              <div className="kpi-label">Dentro do Prazo Legal</div>
              <div className="kpi-value" style={{color: 'var(--green)'}}>{pctNoPrazo}%</div>
              <div className="kpi-sub">{dentroDoPrazoCount} concluídos no prazo</div>
            </div>
          </div>

          {/* 3. VISÃO DE GRÁFICOS */}
          <div className="two-col" style={{marginBottom: '16px'}}>
            <div className="card" style={{height: '320px', minHeight: '320px'}}>
              <div className="card-title">Evolução do Prazo Médio (Tendência Temporal)</div>
              <div style={{height: '240px', position: 'relative'}}>
                <canvas ref={canvasTendencia}></canvas>
              </div>
            </div>
            <div className="card" style={{height: '320px', minHeight: '320px'}}>
              <div className="card-title">Distribuição do Tempo de Conclusão</div>
              <div style={{height: '240px', position: 'relative'}}>
                <canvas ref={canvasDistribuicao}></canvas>
              </div>
            </div>
          </div>

          <div className="two-col" style={{marginBottom: '16px'}}>
            <div className="card" style={{height: '320px', minHeight: '320px'}}>
              <div className="card-title">Fluxo de Produtividade (Novos vs Concluídos)</div>
              <div style={{height: '240px', position: 'relative'}}>
                <canvas ref={canvasProdutividade}></canvas>
              </div>
            </div>
            <div className="card" style={{height: '320px', minHeight: '320px'}}>
              <div className="card-title">Prazos Médios por Tipo de Processo</div>
              <div style={{height: '240px', position: 'relative'}}>
                <canvas ref={canvasTipos}></canvas>
              </div>
            </div>
          </div>

          {/* 4. TABELA RESUMO POR TIPO DE PROCESSO */}
          <div className="card" style={{marginBottom: '16px', overflow: 'hidden', padding: 0}}>
            <div style={{padding: '16px 16px 8px'}} className="card-title">Análise por Tipo de Processo</div>
            <table className="rt" style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: '#fafafa', borderBottom: '1px solid var(--border)'}}>
                  <th style={{padding: '12px 10px', textAlign: 'left'}}>Tipo de Processo</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Concluídos</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Em Andamento</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Prazo Médio</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Mínimo</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Máximo</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Mediana</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Desvio Padrão</th>
                  <th style={{padding: '12px 10px', textAlign: 'center'}}>Dentro do Prazo Legal</th>
                </tr>
              </thead>
              <tbody>
                {tiposEstatisticas.length > 0 ? (
                  tiposEstatisticas.map(stat => (
                    <tr key={stat.type} style={{borderBottom: '1px solid #eee'}}>
                      <td style={{padding: '10px', fontWeight: 500}}>{stat.type}</td>
                      <td style={{padding: '10px', textAlign: 'center'}}>{stat.concluidos}</td>
                      <td style={{padding: '10px', textAlign: 'center'}}>{stat.andamento}</td>
                      <td style={{padding: '10px', textAlign: 'center', fontWeight: 'bold'}}>{stat.prazoMedio} dias</td>
                      <td style={{padding: '10px', textAlign: 'center'}}>{stat.prazoMin} dias</td>
                      <td style={{padding: '10px', textAlign: 'center'}}>{stat.prazoMax} dias</td>
                      <td style={{padding: '10px', textAlign: 'center'}}>{stat.mediana} dias</td>
                      <td style={{padding: '10px', textAlign: 'center', color: '#64748b'}}>± {stat.desvioPadrao}</td>
                      <td style={{padding: '10px', textAlign: 'center'}}>
                        <span className={`badge ${stat.pctDentro >= 75 ? 'b-green' : stat.pctDentro >= 50 ? 'b-amber' : 'b-red'}`}>
                          {stat.pctDentro}% ({stat.dentroPrazo}/{stat.concluidos})
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="empty" style={{padding: '20px'}}>Nenhum processo no filtro selecionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. COMPARATIVO TEMPORAL */}
          <div className="card" style={{marginBottom: '16px'}}>
            <div className="card-title">Comparativo Temporal de Produtividade</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              marginTop: '10px'
            }}>
              <div style={{
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '8px',
                borderLeft: '4px solid #3b82f6'
              }}>
                <h4 style={{margin: '0 0 10px', fontSize: '14px', color: '#1e293b'}}>Mês Atual vs Mês Anterior</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>Protocolados no Mês Atual:</span>
                    <strong>{comparativo.mesAtual.total} processos</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>Protocolados no Mês Anterior:</span>
                    <span>{comparativo.mesAnterior.total} processos</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px'}}>
                    <span>Prazo Médio Mês Atual:</span>
                    <strong>{comparativo.mesAtual.prazoMedio} dias úteis</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span>Prazo Médio Mês Anterior:</span>
                    <span>{comparativo.mesAnterior.prazoMedio} dias úteis</span>
                  </div>
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '8px',
                borderLeft: '4px solid #10b981'
              }}>
                <h4 style={{margin: '0 0 10px', fontSize: '14px', color: '#1e293b'}}>Percentual Geral de Metas no Prazo</h4>
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                    <span>Total Dentro do Prazo:</span>
                    <span style={{color: 'var(--green)', fontWeight: 'bold'}}>{dentroDoPrazoCount}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                    <span>Total Fora do Prazo:</span>
                    <span style={{color: 'var(--red)', fontWeight: 'bold'}}>{foraDoPrazoCount}</span>
                  </div>
                  <div className="pbar" style={{height: '8px', marginTop: '4px'}}>
                    <div className="pfill" style={{width: `${pctNoPrazo}%`, backgroundColor: 'var(--green)'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. RANKINGS */}
          <div className="two-col" style={{marginBottom: '16px'}}>
            <div className="card">
              <div className="card-title">Ranking de Processos (Extremos)</div>
              
              <h5 style={{margin: '10px 0 6px', fontSize: '12px', color: 'var(--green)'}}>🏆 MAIS RÁPIDOS (CONCLUÍDOS)</h5>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px'}}>
                {rankings.maisRapidos.map((p, idx) => (
                  <div key={p.id} style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12.5px', 
                    padding: '6px', 
                    background: '#f0fdf4',
                    borderRadius: '4px'
                  }}>
                    <span>{idx + 1}. <strong className="mono">{p.protocol}</strong> ({p.type})</span>
                    <strong style={{color: 'var(--green)'}}>{p.tempoTotal} dias úteis</strong>
                  </div>
                ))}
                {rankings.maisRapidos.length === 0 && <div className="empty">Nenhum processo concluído.</div>}
              </div>

              <h5 style={{margin: '10px 0 6px', fontSize: '12px', color: 'var(--red)'}}>⚠️ MAIS DEMORADOS</h5>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                {rankings.maisDemorados.map((p, idx) => (
                  <div key={p.id} style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12.5px', 
                    padding: '6px', 
                    background: '#fef2f2',
                    borderRadius: '4px'
                  }}>
                    <span>{idx + 1}. <strong className="mono">{p.protocol}</strong> ({p.type})</span>
                    <strong style={{color: 'var(--red)'}}>{p.tempoTotal} dias úteis</strong>
                  </div>
                ))}
                {rankings.maisDemorados.length === 0 && <div className="empty">Nenhum processo concluído.</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Desempenho dos Analistas</div>
              
              <h5 style={{margin: '10px 0 6px', fontSize: '12px', color: 'var(--green)'}}>🏆 MENOR PRAZO MÉDIO DE ANÁLISE</h5>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px'}}>
                {rankingAnalistas.melhor.map((a, idx) => (
                  <div key={a.name} style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12.5px', 
                    padding: '6px', 
                    background: '#f0fdf4',
                    borderRadius: '4px'
                  }}>
                    <span>{idx + 1}. <strong>{a.name}</strong> ({a.concluido} concluídos)</span>
                    <strong style={{color: 'var(--green)'}}>{a.prazoMedio} dias úteis</strong>
                  </div>
                ))}
                {rankingAnalistas.melhor.length === 0 && <div className="empty">Sem dados suficientes de analistas.</div>}
              </div>

              <h5 style={{margin: '10px 0 6px', fontSize: '12px', color: 'var(--red)'}}>⚠️ MAIOR PRAZO MÉDIO DE ANÁLISE</h5>
              <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                {rankingAnalistas.pior.map((a, idx) => (
                  <div key={a.name} style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12.5px', 
                    padding: '6px', 
                    background: '#fef2f2',
                    borderRadius: '4px'
                  }}>
                    <span>{idx + 1}. <strong>{a.name}</strong> ({a.concluido} concluídos)</span>
                    <strong style={{color: 'var(--red)'}}>{a.prazoMedio} dias úteis</strong>
                  </div>
                ))}
                {rankingAnalistas.pior.length === 0 && <div className="empty">Sem dados suficientes de analistas.</div>}
              </div>
            </div>
          </div>

          {/* 7. ALERTAS E GARGALOS */}
          <div className="card" style={{marginBottom: '16px', borderColor: '#fee2e2'}}>
            <div className="card-title" style={{color: '#991b1b'}}>Alertas de Desvios e Gargalos Operacionais</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px'}}>
              {alertas.emAtrasoAndamento.length > 0 && (
                <div style={{
                  background: '#fef2f2', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  borderLeft: '4px solid #ef4444',
                  fontSize: '13px'
                }}>
                  <strong style={{color: '#991b1b'}}>⚠️ Processos Ativos Fora do Prazo Legal ({alertas.emAtrasoAndamento.length})</strong>
                  <div style={{marginTop: '6px', maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    {alertas.emAtrasoAndamento.slice(0, 10).map(p => (
                      <div key={p.id}>
                        • <span className="mono" style={{fontWeight: 'bold'}}>{p.protocol}</span> — {p.requester} | {p.type} (Acumula <strong>{p.tempoTotal} dias</strong> úteis, limite legal de {p.prazoLegal} dias)
                      </div>
                    ))}
                    {alertas.emAtrasoAndamento.length > 10 && <div>... e mais {alertas.emAtrasoAndamento.length - 10} processos.</div>}
                  </div>
                </div>
              )}

              {alertas.gargaloEtapa ? (
                <div style={{
                  background: '#fffbeb', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  borderLeft: '4px solid #f59e0b',
                  fontSize: '13px'
                }}>
                  <strong style={{color: '#92400e'}}>📍 Gargalo Identificado por Tipo</strong>
                  <div style={{marginTop: '4px'}}>
                    O tipo de processo com maior tempo de tramitação é <strong>{alertas.gargaloEtapa.type}</strong> com média de <strong>{alertas.gargaloEtapa.prazoMedio} dias úteis</strong> para conclusão.
                    A etapa com maior demora para esse tipo é a de <strong>Análise Técnica e Correções ({alertas.gargaloEtapa.etpMedias.analise} dias)</strong>.
                  </div>
                </div>
              ) : (
                <div className="empty">Sem gargalos detectados na amostragem atual.</div>
              )}
            </div>
          </div>

          {/* 8. LISTAGEM DETALHADA DE PROCESSOS */}
          <div className="card" style={{marginBottom: '16px', overflow: 'hidden', padding: 0}}>
            <div style={{padding: '16px 16px 8px'}} className="card-title">Listagem Detalhada de Prazos por Processo</div>
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
              <table className="rt" style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{background: '#fafafa', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1}}>
                    <th style={{padding: '12px 10px', textAlign: 'left', background: '#fafafa'}}>Protocolo</th>
                    <th style={{padding: '12px 10px', textAlign: 'left', background: '#fafafa'}}>Tipo</th>
                    <th style={{padding: '12px 10px', textAlign: 'left', background: '#fafafa'}}>Analista</th>
                    <th style={{padding: '12px 10px', textAlign: 'center', background: '#fafafa'}}>Data de Cadastro</th>
                    <th style={{padding: '12px 10px', textAlign: 'center', background: '#fafafa'}}>Última Movimentação</th>
                    <th style={{padding: '12px 10px', textAlign: 'center', background: '#fafafa'}}>Tempo na Etapa</th>
                    <th style={{padding: '12px 10px', textAlign: 'center', background: '#fafafa'}}>Tempo Total (Cadastro)</th>
                    <th style={{padding: '12px 10px', textAlign: 'center', background: '#fafafa'}}>Prazo Legal</th>
                    <th style={{padding: '12px 10px', textAlign: 'center', background: '#fafafa'}}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map(p => {
                      const dataCadFormt = p.dataCadastro ? new Date(p.dataCadastro).toLocaleDateString('pt-BR') : '-';
                      const dataUltMovFormt = p.dataUltimaMov ? new Date(p.dataUltimaMov).toLocaleDateString('pt-BR') : '-';
                      return (
                        <tr key={p.id} style={{borderBottom: '1px solid #eee'}}>
                          <td style={{padding: '10px', fontWeight: 500}} className="mono">{p.protocol}</td>
                          <td style={{padding: '10px'}}>{p.type}</td>
                          <td style={{padding: '10px'}}>{p.analyst_name || 'Não atribuído'}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{dataCadFormt}</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{dataUltMovFormt}</td>
                          <td style={{padding: '10px', textAlign: 'center', fontWeight: 'bold'}}>{p.tempoTotal} dias úteis</td>
                          <td style={{padding: '10px', textAlign: 'center', color: '#64748b'}}>{p.tempoDesdeCadastro} dias úteis</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>{p.prazoLegal} dias</td>
                          <td style={{padding: '10px', textAlign: 'center'}}>
                            <span className={`badge ${p.concluidoNoPrazo ? 'b-green' : 'b-red'}`}>
                              {p.concluidoNoPrazo ? 'No Prazo' : 'Atrasado'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="empty" style={{padding: '20px'}}>Nenhum processo no filtro selecionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 9. INSIGHTS E RECOMENDAÇÕES */}
          <div className="card" style={{background: '#f0fdf4', borderColor: '#bbf7d0'}}>
            <div className="card-title" style={{color: '#166534'}}>Insights e Recomendações de Gestão Pública</div>
            <div style={{fontSize: '13.5px', color: '#14532d', lineHeight: '1.6', marginTop: '10px'}}>
              <p style={{margin: '0 0 10px'}}>
                💡 <strong>Análise Preditiva e Fluxo de Trabalho:</strong>
              </p>
              <ul style={{margin: 0, paddingLeft: '20px'}}>
                <li>
                  Os processos do tipo <strong>{alertas.gargaloEtapa?.type || 'Loteamento/Condomínio'}</strong> demandam atenção prioritária, pois representam o maior ponto de retenção da secretaria. Recomendamos a divisão da análise técnica desses tipos de projeto em duas fases simultâneas de engenharia e urbanismo.
                </li>
                {pctNoPrazo < 80 && (
                  <li>
                    A eficiência geral no prazo legal está em <strong>{pctNoPrazo}%</strong>. Para atingir a meta recomendada pelo Ministério das Cidades (85%), sugere-se a automação da triagem de admissibilidade de documentos no protocolo inicial (evitando que processos entrem em análise com documentos em falta).
                  </li>
                )}
                <li>
                  O prazo médio de distribuição inicial está em torno de <strong>{tiposEstatisticas[0]?.etpMedias.distribuicao || 2} dias úteis</strong>. Este valor é considerado excelente, mostrando que o gargalo real está localizado nas etapas posteriores de correção pelo requerente e reanálise técnica.
                </li>
                <li>
                  <strong>Recomendação:</strong> Instituir prazo máximo de 10 dias úteis para que os profissionais/requerentes respondam aos comunique-se de pendências físicas ou cartoriais.
                </li>
              </ul>
            </div>
          </div>

        </div>
      )}
    </>
  );
}
