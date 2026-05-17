export const STATUSES = [
  {id:'ENTRADA',         label:'Entrada no Protocolo',        badge:'b-gray',   dot:'#888',     who:'Protocolo'},
  {id:'ENC_ANALISE',    label:'Enviado ao Setor de Análise', badge:'b-blue',   dot:'#185FA5',  who:'Protocolo'},
  {id:'RECEBIDO_SETOR', label:'Recebido no Setor',           badge:'b-teal',   dot:'#0F6E56',  who:'Analista'},
  {id:'EM_ANALISE',     label:'Em Análise',                  badge:'b-amber',  dot:'#BA7517',  who:'Analista'},
  {id:'PARECER',        label:'Parecer Emitido',             badge:'b-purple', dot:'#534AB7',  who:'Analista'},
  {id:'DEV_PROTOCOLO',  label:'Devolvido ao Protocolo',      badge:'b-coral',  dot:'#993C1D',  who:'Analista'},
  {id:'DEV_REQUERENTE', label:'Devolvido ao Requerente',     badge:'b-red',    dot:'#A32D2D',  who:'Protocolo'},
  {id:'RETORNO_REQ',    label:'Retorno do Requerente',       badge:'b-amber',  dot:'#BA7517',  who:'Protocolo'},
  {id:'ANUENCIA',       label:'Anuência Emitida',            badge:'b-teal',   dot:'#0F6E56',  who:'Analista'},
  {id:'ANUENCIA_SOLO',  label:'Anuência de Uso de Solo - Finalizado', badge:'b-teal', dot:'#0F6E56',  who:'Analista'},
  {id:'LIC_COND',       label:'Licença de Implantação de Condomínio de Lotes', badge:'b-teal', dot:'#0F6E56',  who:'Analista'},
  {id:'ATO_APR',        label:'Ato de Aprovação',            badge:'b-teal',   dot:'#0F6E56',  who:'Analista'},
  {id:'V2_ATO',         label:'2ª Via Ato de Aprovação',    badge:'b-teal',   dot:'#0F6E56',  who:'Analista'},
  {id:'V2_COND',        label:'2ª Via Licença de Implantação de Condomínio de Lotes', badge:'b-teal', dot:'#0F6E56',  who:'Analista'},
  {id:'TOPOGRAFIA',     label:'Topografia',                  badge:'b-blue',   dot:'#185FA5',  who:'Analista'},
  {id:'ENC_ASSINATURA', label:'Enc. para Assinatura',        badge:'b-blue',   dot:'#378ADD',  who:'Analista'},
  {id:'ASSINADO',       label:'Assinado / Finalizado',       badge:'b-green',  dot:'#3B6D11',  who:'Secretário'},
  {id:'DISP_RETIRADA',  label:'Disponível para Retirada',    badge:'b-teal',   dot:'#0F6E56',  who:'Protocolo'},
  {id:'FINALIZADO',     label:'Retirado / Finalizado',       badge:'b-green',  dot:'#3B6D11',  who:'Protocolo'},
  {id:'ARQUIVADO',      label:'Arquivado',                   badge:'b-gray',   dot:'#aaa',     who:'Admin'},
];

export const SM = Object.fromEntries(STATUSES.map(s => [s.id, s]));

export const FLOW = {
  ENTRADA:        {protocol:['ENC_ANALISE'],admin:['ENC_ANALISE','ARQUIVADO'],secretary:['ENC_ANALISE']},
  ENC_ANALISE:    {analyst:['RECEBIDO_SETOR'],admin:['RECEBIDO_SETOR'],secretary:['RECEBIDO_SETOR']},
  RECEBIDO_SETOR: {analyst:['EM_ANALISE'],admin:['EM_ANALISE'],secretary:['EM_ANALISE']},
  EM_ANALISE:     {analyst:['PARECER','ANUENCIA','ANUENCIA_SOLO','LIC_COND','ATO_APR','V2_ATO','V2_COND','TOPOGRAFIA','ENC_ASSINATURA','DEV_PROTOCOLO'],admin:['PARECER','ANUENCIA','ANUENCIA_SOLO','LIC_COND','ATO_APR','V2_ATO','V2_COND','TOPOGRAFIA','ENC_ASSINATURA','DEV_PROTOCOLO'],secretary:['PARECER','ANUENCIA','ANUENCIA_SOLO','LIC_COND','ATO_APR','V2_ATO','V2_COND','ENC_ASSINATURA']},
  PARECER:        {analyst:['DEV_PROTOCOLO'],admin:['DEV_PROTOCOLO'],secretary:['DEV_PROTOCOLO']},
  DEV_PROTOCOLO:  {protocol:['DEV_REQUERENTE','ENC_ANALISE'],admin:['DEV_REQUERENTE','ENC_ANALISE'],secretary:['DEV_REQUERENTE','ENC_ANALISE']},
  DEV_REQUERENTE: {protocol:['RETORNO_REQ'],admin:['RETORNO_REQ'],secretary:['RETORNO_REQ']},
  RETORNO_REQ:    {protocol:['ENC_ANALISE'],admin:['ENC_ANALISE'],secretary:['ENC_ANALISE']},
  ANUENCIA:       {analyst:['DEV_PROTOCOLO'],admin:['DEV_PROTOCOLO'],secretary:['DEV_PROTOCOLO']},
  ANUENCIA_SOLO:  {analyst:['DEV_PROTOCOLO','TOPOGRAFIA'],admin:['DEV_PROTOCOLO','TOPOGRAFIA'],secretary:['DEV_PROTOCOLO']},
  LIC_COND:       {analyst:['DEV_PROTOCOLO'],admin:['DEV_PROTOCOLO'],secretary:['DEV_PROTOCOLO']},
  ATO_APR:        {analyst:['DEV_PROTOCOLO'],admin:['DEV_PROTOCOLO'],secretary:['DEV_PROTOCOLO']},
  V2_ATO:         {analyst:['DEV_PROTOCOLO'],admin:['DEV_PROTOCOLO'],secretary:['DEV_PROTOCOLO']},
  V2_COND:        {analyst:['DEV_PROTOCOLO'],admin:['DEV_PROTOCOLO'],secretary:['DEV_PROTOCOLO']},
  TOPOGRAFIA:     {analyst:['EM_ANALISE','DEV_PROTOCOLO'],admin:['EM_ANALISE','DEV_PROTOCOLO'],secretary:['EM_ANALISE']},
  ENC_ASSINATURA: {analyst:['ASSINADO'],secretary:['ASSINADO'],admin:['ASSINADO']},
  ASSINADO:       {analyst:['DISP_RETIRADA'],protocol:['DISP_RETIRADA'],admin:['DISP_RETIRADA'],secretary:['DISP_RETIRADA']},
  DISP_RETIRADA:  {analyst:['FINALIZADO'],protocol:['FINALIZADO'],admin:['FINALIZADO'],secretary:['FINALIZADO']},
  FINALIZADO:     {analyst:['ARQUIVADO'],protocol:['ARQUIVADO'],admin:['ARQUIVADO'],secretary:['ARQUIVADO']},
  ARQUIVADO:      {analyst:['EM_ANALISE'],admin:['EM_ANALISE'],secretary:['EM_ANALISE']},
};

export const ROLES = {
  admin: {label:'Administrador', badge:'b-red'},
  secretary: {label:'Secretário(a)', badge:'b-purple'},
  analyst: {label:'Analista', badge:'b-blue'},
  protocol: {label:'Protocolo', badge:'b-teal'}
};

export const AVCOL = {
  ivan: {bg:'#faece7', fg:'#993C1D'},
  patrick: {bg:'#e6f1fb', fg:'#185FA5'},
  deborah: {bg:'#eaf3de', fg:'#3B6D11'},
  anapaula: {bg:'#faeeda', fg:'#BA7517'},
  joyce: {bg:'#fcebeb', fg:'#A32D2D'},
  nataniele: {bg:'#e1f5ee', fg:'#0F6E56'},
  iury: {bg:'#eeedfe', fg:'#534AB7'},
  admin: {bg:'#eeedfe', fg:'#534AB7'},
  secretaria: {bg:'#e1f5ee', fg:'#0F6E56'},
  protocolo: {bg:'#f0f0f0', fg:'#555'}
};

export function avcol(u) {
  return AVCOL[u] || {bg:'#e6f1fb', fg:'#185FA5'};
}

export const CHART_COLORS = {
  ENTRADA: '#888',
  ENC_ANALISE: '#185FA5',
  RECEBIDO_SETOR: '#0F6E56',
  EM_ANALISE: '#BA7517',
  PARECER: '#534AB7',
  DEV_PROTOCOLO: '#993C1D',
  DEV_REQUERENTE: '#A32D2D',
  RETORNO_REQ: '#BA7517',
  ANUENCIA: '#0F6E56',
  ANUENCIA_SOLO: '#0F6E56',
  LIC_COND: '#0F6E56',
  ATO_APR: '#0F6E56',
  V2_ATO: '#0F6E56',
  V2_COND: '#0F6E56',
  TOPOGRAFIA: '#185FA5',
  ENC_ASSINATURA: '#378ADD',
  ASSINADO: '#3B6D11',
  DISP_RETIRADA: '#0F6E56',
  FINALIZADO: '#3B6D11',
  ARQUIVADO: '#aaa'
};
