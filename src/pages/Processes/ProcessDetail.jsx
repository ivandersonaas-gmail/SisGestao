import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { FLOW, SM } from '../../config/constants';
import { Badge } from '../../components/UI/Badge';
import { Avatar } from '../../components/UI/Avatar';
import { Modal } from '../../components/UI/Modal';
import { Tour360 } from '../../components/UI/Tour360';
import { CardAfastamentos } from '../../components/UI/CardAfastamentos';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ZONAS_ANEXO13 = {
  'eixo1': {
    nome: 'EIXO 1',
    tsn: '10',
    caMin: '0.25',
    caBasico: '3',
    caMax: 'e',
    cor: '#8b5cf6'
  },
  'intensivo': {
    nome: 'INTENSIVO',
    tsn: '10',
    caMin: '0.25',
    caBasico: '2',
    caMax: '6',
    cor: '#3b82f6'
  },
  'eixo2': {
    nome: 'EIXO 2',
    tsn: '10',
    caMin: '0.25',
    caBasico: '3',
    caMax: '4',
    cor: '#f97316'
  },
  'moderado': {
    nome: 'MODERADO',
    tsn: '10',
    caMin: '0.25',
    caBasico: '2',
    caMax: '4',
    cor: '#eab308'
  },
  'historica': {
    nome: 'HISTÓRICA',
    tsn: '10',
    caMin: '0.25',
    caBasico: '1',
    caMax: '2',
    cor: '#ef4444'
  },
  'transicao1': {
    nome: 'TRANSIÇÃO 1',
    tsn: '15',
    caMin: '-',
    caBasico: '2',
    caMax: '3',
    cor: '#10b981'
  },
  'transicao2': {
    nome: 'TRANSIÇÃO 2',
    tsn: '25',
    caMin: '-',
    caBasico: '1',
    caMax: '1.5',
    cor: '#84cc16'
  }
};

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
  const [refLat, setRefLat] = useState(null);
  const [refLng, setRefLng] = useState(null);
  const [geoShape, setGeoShape] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoAlert, setGeoAlert] = useState('');
  const [mapZoom, setMapZoom] = useState(14);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapSearch, setMapSearch] = useState('');
  const [placementMode, setPlacementMode] = useState(null); // 'main', 'ref', or null
  const [mainLabel, setMainLabel] = useState('📍 Local do Processo');
  const [refLabel, setRefLabel] = useState('📍 Ponto de Referência');
  const [mainCalloutLat, setMainCalloutLat] = useState(null);
  const [mainCalloutLng, setMainCalloutLng] = useState(null);
  const [refCalloutLat, setRefCalloutLat] = useState(null);
  const [refCalloutLng, setRefCalloutLng] = useState(null);
  
  const placementModeRef = useRef(placementMode);
  const mainLabelRef = useRef(mainLabel);
  const refLabelRef = useRef(refLabel);
  
  useEffect(() => { placementModeRef.current = placementMode; }, [placementMode]);
  useEffect(() => {
    mainLabelRef.current = mainLabel;
    if (window.pickerMainCallout && window.pickerMainCallout._icon) {
      const el = window.pickerMainCallout._icon.querySelector('div');
      if (el) el.innerHTML = `${mainLabel}<br/><small style="font-weight: normal; color: #555;">(Arraste este balão)</small>`;
    }
  }, [mainLabel]);
  
  useEffect(() => {
    refLabelRef.current = refLabel;
    if (window.pickerRefCallout && window.pickerRefCallout._icon) {
      const el = window.pickerRefCallout._icon.querySelector('div');
      if (el) el.innerHTML = `${refLabel}<br/><small style="font-weight: normal; color: #555;">(Arraste este balão)</small>`;
    }
  }, [refLabel]);

  // --- ESTADOS DA AUDITORIA TÉCNICA ---
  const [activeTab, setActiveTab] = useState('tramite'); // tramite, auditoria, tour
  const [checklistType, setChecklistType] = useState('residencial'); // residencial, comercial
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [sqlMissingError, setSqlMissingError] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Estado temporário local para guardar arquivos selecionados antes da análise/salvamento
  const [uploadedFiles, setUploadedFiles] = useState({});

  // Progresso de extração e minuta
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [draftMinuta, setDraftMinuta] = useState('');
  const [requerenteType, setRequerenteType] = useState(null); // 'pf', 'pj' ou null

  // Estados para observações detalhadas da tabela de confrontação
  const [activeObsKey, setActiveObsKey] = useState(null); // 'lote', 'quadra', etc.
  const [tempObsVal, setTempObsVal] = useState('');



  // Estrutura padrão do checklist refinado (conforme Imagem 2.2 e dados solicitados)
  const [checklistData, setChecklistData] = useState({
    consistencia_verificada: false,
    confrontacao: {
      lote_certidao: '', lote_bci: '', lote_art_projeto: '', lote_art_execucao: '', lote_projeto: '', lote_lic_ambient: '', lote_cnd: '', lote_obs: '',
      quadra_certidao: '', quadra_bci: '', quadra_art_projeto: '', quadra_art_execucao: '', quadra_projeto: '', quadra_lic_ambient: '', quadra_cnd: '', quadra_obs: '',
      loteamento_certidao: '', loteamento_bci: '', loteamento_art_projeto: '', loteamento_art_execucao: '', loteamento_projeto: '', loteamento_lic_ambient: '', loteamento_cnd: '', loteamento_obs: '',
      bairro_certidao: '', bairro_bci: '', bairro_art_projeto: '', bairro_art_execucao: '', bairro_projeto: '', bairro_lic_ambient: '', bairro_cnd: '', bairro_obs: '',
      area_terreno_certidao: '', area_terreno_bci: '', area_terreno_art_projeto: '', area_terreno_art_execucao: '', area_terreno_projeto: '', area_terreno_lic_ambient: '', area_terreno_cnd: '', area_terreno_obs: '',
      area_const_certidao: '', area_const_bci: '', area_const_art_projeto: '', area_const_art_execucao: '', area_const_projeto: '', area_const_lic_ambient: '', area_const_cnd: '', area_const_obs: '',
      requerente_certidao: '', requerente_bci: '', requerente_art_projeto: '', requerente_art_execucao: '', requerente_projeto: '', requerente_lic_ambient: '', requerente_cnd: '', requerente_obs: '',
      endereco_certidao: '', endereco_bci: '', endereco_art_projeto: '', endereco_art_execucao: '', endereco_projeto: '', endereco_lic_ambient: '', endereco_cnd: '', endereco_obs: ''
    },
    documentos: {
      existe_lic_ambient: 'nao', // 'sim' / 'nao' / 'nsapl'
      lic_ambient_name: '',
      lic_ambient_url: '',
      lic_ambient_numero: '',
      lic_ambient_orgao: '',
      lic_ambient_data_emissao: '',

      // Posse do Terreno
      protocolo: { status: 'ausente', name: '', url: '' },
      bci: { status: 'ausente', name: '', url: '' },
      identificacao_proprietario: { status: 'ausente', name: '', url: '' },
      cnd: { status: 'ausente', name: '', url: '' },
      art_projeto: { status: 'ausente', name: '', url: '' },
      inteiro_teor: { status: 'ausente', name: '', url: '' },
      art_execucao: { status: 'ausente', name: '', url: '' },
      contrato_compra_venda: { status: 'nsapl', name: '', url: '' },

      // Pessoa Física
      pf_identificacao: { status: 'ausente', name: '', url: '' },
      pf_procurador: { status: 'nsapl', name: '', url: '' },
      pf_procuracao: { status: 'nsapl', name: '', url: '' },

      // Pessoa Jurídica
      pj_contrato_social: { status: 'nsapl', name: '', url: '' },
      pj_cnpj: { status: 'nsapl', name: '', url: '' },
      pj_anuencia_socios: { status: 'nsapl', name: '', url: '' },
      pj_identificacao_representante: { status: 'nsapl', name: '', url: '' }
    },
    cadastral: {
      endereco_completo: '',
      proprietario: '',
      cpf_cnpj: '',
      autor_projeto_profissao: '',
      autor_projeto_nome: '',
      autor_projeto_orgao: '',
      autor_projeto_rnp: '',
      executor_profissao: '',
      executor_nome: '',
      executor_orgao: '',
      executor_rnp: '',
      tipo_construcao: '',
      qtd_unidades: '',
      area_construida: '',
      area_construida_extenso: '',
      qtd_pavimentos: '',
      qtd_pavimentos_extenso: '',
      qtd_banheiros: '',
      data_documento: ''
    },
    checklist_tecnico: {
      projeto_arquitetonico: {
        taxa_ocupacao_max: '0.6',
        taxa_ocupacao_projeto: '',
        coef_aproveitamento_max: '2.0',
        coef_aproveitamento_projeto: '',
        recuo_frontal_min: '5.0',
        recuo_frontal_projeto: '',
        recuo_lateral_min: '1.5',
        recuo_lateral_projeto: '',
        recuo_fundos_min: '2.0',
        recuo_fundos_projeto: '',
        altura_muro_max: '2.0',
        altura_muro_projeto: ''
      },
      drenagem: {
        area_telhado: '',
        area_piso_impermeavel: '',
        amortecimento_projeto: ''
      },
      iluminacao_ventilacao: {
        iluminacao_ok: null,
        ventilacao_ok: null
      },
      acessibilidade: {
        rampas_ok: null,
        sanitarios_ok: null,
        acessibilidade_geral_ok: null
      },
      calcada_cidada: {
        calcada_ok: null
      }
    },
    projeto_residencial: {
      zona_kmz: '',
      num_pavimentos: '',
      recuo_frontal: '',
      recuo_lateral: '',
      recuo_fundos: '',
      taxa_ocupacao: '',
      coef_aproveitamento: '',
      projeto_assinado: false,
      tsn_area_terreno: '',
      tsn_area_projeto: '',
      tsn_taxa_anexo13: '',
      tsn_resultado: '',
      ca_area_terreno: '',
      ca_area_construida: '',
      ca_projeto: '',
      ca_resultado: '',
      medidas_lote_projeto: '',
      medidas_lote_certidao: '',
      confrontantes_escritura: '',
      confrontantes_frente: '',
      confrontantes_fundos: '',
      confrontantes_direito: '',
      confrontantes_esquerdo: '',
      area_comum_multifamiliar: null,
      revestimento_ceramico: null,
      tinta_impermeavel: null,
      piso_tatil: null,
      distancia_lote_vizinho: '',
      prisma_altura_h: '',
      prisma_resultado: '',
      testada_total: '',
      qtd_arvores: '',
      drenagem_alagavel: '',
      drenagem_risco: '',
      drenagem_distancia_riacho: '',
      drenagem_distancia_canal: '',
      art_rrt_atividade_corresponde: '',
      art_rrt_area_art: '',
      art_rrt_area_rrt: '',
      art_rrt_area_projeto: '',
      estac_area_total_construida: '',
      estac_deducao_garagem: '',
      estac_deducao_tecnica: '',
      estac_deducao_circulacao: '',
      estac_deducao_lazer: '',
      estac_deducao_fachada_ativa: '',
      estac_vagas_projeto: '',
      afast_nsapl: false,
      afast_esquina: 'nao',
      afast_adota_alinhamento: false,
      afast_frontal1: '',
      afast_frontal2: '',
      afast_lateral: '',
      afast_fundos: ''
    },
    projeto_comercial: {
      zona_kmz: '',
      num_pavimentos: '',
      recuo_frontal: '',
      recuo_lateral: '',
      recuo_fundos: '',
      taxa_ocupacao: '',
      coef_aproveitamento: '',
      projeto_assinado: false,
      tsn_area_terreno: '',
      tsn_area_projeto: '',
      tsn_taxa_anexo13: '',
      tsn_resultado: '',
      ca_area_terreno: '',
      ca_area_construida: '',
      ca_projeto: '',
      ca_resultado: '',
      medidas_lote_projeto: '',
      medidas_lote_certidao: '',
      confrontantes_escritura: '',
      confrontantes_frente: '',
      confrontantes_fundos: '',
      confrontantes_direito: '',
      confrontantes_esquerdo: '',
      testada_total: '',
      qtd_arvores: '',
      // EIV
      eiv_terreno_area: '',
      eiv_construida_area: '',
      // Lixo
      lixo_pavimentos: '',
      lixo_economias: '',
      // Pe-direito e Jirau
      pe_direito_sala_nome: '',
      pe_direito_sala_area: '',
      pe_direito_sala_pe: '',
      pe_direito_jirau_existe: '',
      pe_direito_jirau_area: '',
      pe_direito_jirau_acima: '',
      pe_direito_jirau_abaixo: '',
      afast_nsapl: false,
      afast_esquina: 'nao',
      afast_adota_alinhamento: false,
      afast_frontal1: '',
      afast_frontal2: '',
      afast_lateral: '',
      afast_fundos: ''
    }
  });

  const checkDivergencia = (...vals) => {
    const clean = (v) => v ? v.toString().trim().toLowerCase() : '';
    const cleanedVals = vals.map(clean).filter(v => v !== '');
    if (cleanedVals.length === 0) return 'empty';
    if (cleanedVals.length === 1) return 'single';
    const first = cleanedVals[0];
    const allEqual = cleanedVals.every(v => v === first);
    return allEqual ? 'conforme' : 'divergente';
  };

  const checkParametro = (tipo, projetoVal, limiteVal) => {
    const p = parseFloat(projetoVal?.toString().replace(',', '.'));
    const l = parseFloat(limiteVal?.toString().replace(',', '.'));
    if (isNaN(p) || isNaN(l)) return null;

    if (tipo === 'max') {
      return p <= l ? 'ok' : 'falha';
    } else if (tipo === 'min') {
      return p >= l ? 'ok' : 'falha';
    }
    return null;
  };

  const calcAmortecimentoRequerido = () => {
    const telhado = parseFloat(checklistData.checklist_tecnico?.drenagem?.area_telhado?.toString().replace(',', '.'));
    const piso = parseFloat(checklistData.checklist_tecnico?.drenagem?.area_piso_impermeavel?.toString().replace(',', '.'));
    if (isNaN(telhado) && isNaN(piso)) return '—';
    const t = isNaN(telhado) ? 0 : telhado;
    const p = isNaN(piso) ? 0 : piso;
    const areaImpermeabilizada = t + p;
    const vol = areaImpermeabilizada * 0.015;
    return vol.toFixed(2);
  };

  const calcTsnResultado = (terreno, projeto, minTaxa) => {
    const terrVal = parseFloat(terreno?.toString().replace(',', '.'));
    const projVal = parseFloat(projeto?.toString().replace(',', '.'));
    const minVal = parseFloat(minTaxa?.toString().replace(',', '.'));
    if (isNaN(terrVal) || isNaN(projVal) || isNaN(minVal) || terrVal === 0) return 'AGUARDANDO';
    const tsnReal = (projVal / terrVal) * 100;
    return tsnReal >= minVal ? 'CONFORME' : 'DIVERGENTE';
  };

  const calcCaProjeto = (terreno, construida) => {
    const terrVal = parseFloat(terreno?.toString().replace(',', '.'));
    const constVal = parseFloat(construida?.toString().replace(',', '.'));
    if (isNaN(terrVal) || isNaN(constVal) || terrVal === 0) return '';
    return (constVal / terrVal).toFixed(2);
  };

  const calcCaResultado = (caProjStr, zonaKey) => {
    const caProj = parseFloat(caProjStr);
    if (isNaN(caProj) || !zonaKey) return 'AGUARDANDO';
    const zonaInfo = ZONAS_ANEXO13[zonaKey];
    if (!zonaInfo) return 'AGUARDANDO';
    const caMax = parseFloat(zonaInfo.caMax?.toString().replace(',', '.'));
    if (isNaN(caMax)) {
      return 'CONFORME';
    }
    return caProj <= caMax ? 'CONFORME' : 'INCOMPATÍVEL';
  };

  const handleRemoveFile = (key) => {
    setUploadedFiles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    const newDocs = { ...checklistData.documentos };
    if (newDocs[key]) {
      newDocs[key] = {
        ...newDocs[key],
        status: 'ausente',
        name: '',
        url: ''
      };
    }
    setChecklistData({ ...checklistData, documentos: newDocs });
  };

  const handleAddLicAmbientFiles = (filesList) => {
    const filesArray = Array.from(filesList);
    setUploadedFiles(prev => {
      const current = prev.lic_ambient_files || [];
      return {
        ...prev,
        lic_ambient_files: [...current, ...filesArray]
      };
    });

    const newDocs = { ...checklistData.documentos };
    if (!newDocs.lic_ambient_files) {
      newDocs.lic_ambient_files = [];
    }
    const newItems = filesArray.map(file => ({
      name: file.name,
      url: ''
    }));
    newDocs.lic_ambient_files = [...newDocs.lic_ambient_files, ...newItems];
    setChecklistData({ ...checklistData, documentos: newDocs });
  };

  const handleRemoveLicAmbientFile = (index) => {
    const docToRemove = checklistData.documentos.lic_ambient_files?.[index];
    if (docToRemove && !docToRemove.url) {
      setUploadedFiles(prev => {
        const current = prev.lic_ambient_files || [];
        return {
          ...prev,
          lic_ambient_files: current.filter(f => f.name !== docToRemove.name)
        };
      });
    }

    const newDocs = { ...checklistData.documentos };
    if (newDocs.lic_ambient_files) {
      newDocs.lic_ambient_files = newDocs.lic_ambient_files.filter((_, i) => i !== index);
    }
    setChecklistData({ ...checklistData, documentos: newDocs });
  };

  const loadChecklist = async () => {
    setChecklistLoading(true);
    setSqlMissingError(false);
    try {
      const data = await api.getProcessChecklist(id);
      if (data && data.checklist_data) {
        const loadedChecklist = { ...data.checklist_data };
        if (!loadedChecklist.projeto_residencial) {
          loadedChecklist.projeto_residencial = {};
        }
        loadedChecklist.projeto_residencial = {
          zona_kmz: '', num_pavimentos: '', recuo_frontal: '', recuo_lateral: '', recuo_fundos: '', taxa_ocupacao: '', coef_aproveitamento: '', projeto_assinado: false,
          tsn_area_terreno: '', tsn_area_projeto: '', tsn_taxa_anexo13: '', tsn_resultado: '',
          ca_area_terreno: '', ca_area_construida: '', ca_projeto: '', ca_resultado: '',
          medidas_lote_projeto: '', medidas_lote_certidao: '',
          confrontantes_escritura: '', confrontantes_frente: '', confrontantes_fundos: '', confrontantes_direito: '', confrontantes_esquerdo: '',
          area_comum_multifamiliar: null, revestimento_ceramico: null, tinta_impermeavel: null, piso_tatil: null,
          distancia_lote_vizinho: '', prisma_altura_h: '', prisma_resultado: '',
          testada_total: '', qtd_arvores: '',
          drenagem_alagavel: '', drenagem_risco: '', drenagem_distancia_riacho: '', drenagem_distancia_canal: '',
          art_rrt_atividade_corresponde: '', art_rrt_area_art: '', art_rrt_area_rrt: '', art_rrt_area_projeto: '',
          estac_area_total_construida: '', estac_deducao_garagem: '', estac_deducao_tecnica: '', estac_deducao_circulacao: '',
          estac_deducao_lazer: '', estac_deducao_fachada_ativa: '', estac_vagas_projeto: '',
          afast_nsapl: false, afast_esquina: 'nao', afast_adota_alinhamento: false, afast_frontal1: '', afast_frontal2: '', afast_lateral: '', afast_fundos: '',
          ...loadedChecklist.projeto_residencial
        };
        if (!loadedChecklist.projeto_comercial) {
          loadedChecklist.projeto_comercial = {};
        }
        loadedChecklist.projeto_comercial = {
          zona_kmz: '', num_pavimentos: '', recuo_frontal: '', recuo_lateral: '', recuo_fundos: '',
          taxa_ocupacao: '', coef_aproveitamento: '', projeto_assinado: false,
          tsn_area_terreno: '', tsn_area_projeto: '', tsn_taxa_anexo13: '', tsn_resultado: '',
          ca_area_terreno: '', ca_area_construida: '', ca_projeto: '', ca_resultado: '',
          medidas_lote_projeto: '', medidas_lote_certidao: '',
          confrontantes_escritura: '', confrontantes_frente: '', confrontantes_fundos: '', confrontantes_direito: '', confrontantes_esquerdo: '',
          confrontantes_frente_projeto: '', confrontantes_fundos_projeto: '', confrontantes_ld_projeto: '', confrontantes_le_projeto: '',
          confrontantes_frente_certidao: '', confrontantes_fundos_certidao: '', confrontantes_ld_certidao: '', confrontantes_le_certidao: '',
          testada_total: '', qtd_arvores: '',
          drenagem_alagavel: '', drenagem_risco: '', drenagem_distancia_riacho: '', drenagem_distancia_canal: '',
          art_rrt_atividade_corresponde: '', art_rrt_area_art: '', art_rrt_area_rrt: '', art_rrt_area_projeto: '',
          eiv_terreno_area: '', eiv_construida_area: '',
          lixo_pavimentos: '', lixo_economias: '',
          pe_direito_sala_nome: '', pe_direito_sala_area: '', pe_direito_sala_pe: '',
          pe_direito_jirau_existe: '', pe_direito_jirau_area: '', pe_direito_jirau_acima: '', pe_direito_jirau_abaixo: '',
          area_comum_comercial: null, revestimento_ceramico: null, tinta_impermeavel: null,
          prisma_nsapl: 'APLICAVEL', distancia_lote_vizinho: '', prisma_altura_h: '', prisma_resultado: '',
          estac_area_total_construida: '', estac_deducao_garagem: '', estac_deducao_tecnica: '', estac_deducao_circulacao: '',
          estac_deducao_lazer: '', estac_deducao_fachada_ativa: '', estac_vagas_projeto: '',
          afast_nsapl: false, afast_esquina: 'nao', afast_adota_alinhamento: false, afast_frontal1: '', afast_frontal2: '', afast_lateral: '', afast_fundos: '',
          ...loadedChecklist.projeto_comercial
        };
        setChecklistData(loadedChecklist);
        if (loadedChecklist.type) {
          setChecklistType(loadedChecklist.type);
        }
        if (data.checklist_data.documentos) {
          const hasPJApresentado = ['pj_contrato_social', 'pj_cnpj', 'pj_anuencia_socios', 'pj_identificacao_representante']
            .some(k => data.checklist_data.documentos[k]?.status === 'apresentado');
          const hasPFApresentado = ['pf_identificacao', 'pf_procurador', 'pf_procuracao']
            .some(k => data.checklist_data.documentos[k]?.status === 'apresentado');
          if (hasPJApresentado && !hasPFApresentado) {
            setRequerenteType('pj');
          } else if (hasPFApresentado && !hasPJApresentado) {
            setRequerenteType('pf');
          }
        }
      }
    } catch (err) {
      if (err.message === 'TABELA_INEXISTENTE') {
        setSqlMissingError(true);
      } else {
        console.error('Erro ao carregar checklist:', err);
      }
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleSaveChecklist = async (dataToSave = checklistData, silent = false) => {
    setSaveLoading(true);
    try {
      const docsCopy = { ...dataToSave.documentos };
      let updatedSomeUrls = false;

      // 1. Upload dos arquivos gerais (Seção 2)
      for (const key of Object.keys(uploadedFiles)) {
        if (key === 'lic_ambient_files') continue;
        const file = uploadedFiles[key];
        if (file && file instanceof File) {
          const publicUrl = await api.uploadFile(file);
          if (docsCopy[key]) {
            docsCopy[key].url = publicUrl;
            docsCopy[key].name = file.name;
            docsCopy[key].status = 'apresentado';
            updatedSomeUrls = true;
          }
        }
      }

      // 2. Upload dos múltiplos arquivos de Licença Ambiental (Seção 1)
      if (uploadedFiles.lic_ambient_files && uploadedFiles.lic_ambient_files.length > 0) {
        const licFiles = docsCopy.lic_ambient_files || [];
        const nextUploadedList = [];
        
        for (const file of uploadedFiles.lic_ambient_files) {
          if (file instanceof File) {
            const publicUrl = await api.uploadFile(file);
            const matchedIdx = licFiles.findIndex(f => f.name === file.name && !f.url);
            if (matchedIdx !== -1) {
              licFiles[matchedIdx].url = publicUrl;
              updatedSomeUrls = true;
            }
          } else {
            nextUploadedList.push(file);
          }
        }
        docsCopy.lic_ambient_files = licFiles;
        uploadedFiles.lic_ambient_files = nextUploadedList;
      }

      let finalData = dataToSave;
      if (updatedSomeUrls) {
        finalData = {
          ...dataToSave,
          documentos: docsCopy
        };
        setChecklistData(finalData);
        
        const newUploaded = { ...uploadedFiles };
        for (const key of Object.keys(newUploaded)) {
          if (key !== 'lic_ambient_files' && newUploaded[key] instanceof File) {
            delete newUploaded[key];
          }
        }
        setUploadedFiles(newUploaded);
      }

      const payload = {
        ...finalData,
        type: checklistType
      };
      await api.saveProcessChecklist(id, payload);
      if (!silent) {
        alert('Auditoria técnica salva com sucesso!');
      }
      return finalData;
    } catch (err) {
      if (err.message === 'TABELA_INEXISTENTE') {
        setSqlMissingError(true);
        alert('Erro: Tabela não configurada no Supabase.');
      } else {
        alert('Erro ao salvar auditoria: ' + err.message);
      }
      throw err;
    } finally {
      setSaveLoading(false);
    }
  };

  const extractTextFromPdf = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      console.log(`[OCR/PDF] Arquivo: ${file.name} | Caracteres extraídos: ${fullText.length}`);
      return fullText;
    } catch (err) {
      console.error('Error extracting text:', err);
      throw new Error(`Falha ao extrair texto de ${file.name}. Detalhe: ${err.message}`);
    }
  };

  const handleRunAuditoria = async () => {
    setExtractionLoading(true);
    setExtractionProgress('Salvando arquivos locais e preparando auditoria técnica...');

    try {
      // 1. Salvar os arquivos pendentes localmente para obter as URLs do Supabase
      const finalChecklistData = await handleSaveChecklist(checklistData, true);
      
      // 2. Mapear os documentos que possuem URL pública no Supabase
      const docsToSend = {};
      const docKeys = [
        'protocolo', 'bci', 'identificacao_proprietario', 'cnd', 'art_projeto',
        'inteiro_teor', 'art_execucao', 'contrato_compra_venda', 'pf_identificacao',
        'pf_procurador', 'pf_procuracao', 'pj_contrato_social', 'pj_cnpj',
        'pj_anuencia_socios', 'pj_identificacao_representante'
      ];

      docKeys.forEach(key => {
        const doc = finalChecklistData.documentos[key];
        if (doc && doc.url && doc.status === 'apresentado') {
          docsToSend[key] = {
            url: doc.url,
            name: doc.name || `${key}.pdf`
          };
        }
      });

      // Tratar arquivos de Licença Ambiental
      if (Array.isArray(finalChecklistData.documentos.lic_ambient_files)) {
        const licFiles = [];
        finalChecklistData.documentos.lic_ambient_files.forEach(docItem => {
          if (docItem.url) {
            licFiles.push({
              url: docItem.url,
              name: docItem.name || 'lic_ambient.pdf'
            });
          }
        });
        if (licFiles.length > 0) {
          docsToSend.lic_ambient_files = licFiles;
        }
      }

      if (Object.keys(docsToSend).length === 0) {
        alert('Por favor, anexe ou garanta que há ao menos um arquivo PDF carregado na seção de documentos para iniciar a auditoria automatizada.');
        setExtractionLoading(false);
        return;
      }

      setExtractionProgress('Enviando documentos para processamento e análise no backend Python (Flask)...');

      // 3. Fazer requisição ao Backend local em Flask
      const backendRes = await fetch('http://127.0.0.1:8000/api/run_auditoria', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          checklist_type: checklistType,
          documents: docsToSend
        })
      });

      if (!backendRes.ok) {
        let errMsg = 'Falha no processamento da auditoria.';
        try {
          const errData = await backendRes.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const parsedJson = await backendRes.json();
      console.log('[Auditoria Backend] Resposta estruturada do Gemini:', parsedJson);

      // 4. Mesclar os resultados extraídos de volta no estado

      // Mescla a confrontação extraída
      const newConf = { ...finalChecklistData.confrontacao };
      if (parsedJson.confrontacao) {
        Object.keys(parsedJson.confrontacao).forEach(k => {
          const val = parsedJson.confrontacao[k];
          if (val && val !== '—') {
            newConf[k] = val;
          }
        });
      }

      // Mescla os dados cadastrais extraídos
      const newCadastral = { ...finalChecklistData.cadastral };
      if (parsedJson.cadastral) {
        Object.keys(parsedJson.cadastral).forEach(k => {
          const val = parsedJson.cadastral[k];
          if (val && val !== '—') {
            newCadastral[k] = val;
          }
        });
      }

      // Mescla o checklist técnico
      const newTech = { ...finalChecklistData.checklist_tecnico };
      if (parsedJson.checklist_tecnico) {
        const t = parsedJson.checklist_tecnico;
        if (t.taxa_ocupacao_projeto) newTech.projeto_arquitetonico.taxa_ocupacao_projeto = t.taxa_ocupacao_projeto;
        if (t.coef_aproveitamento_projeto) newTech.projeto_arquitetonico.coef_aproveitamento_projeto = t.coef_aproveitamento_projeto;
        if (t.recuo_frontal_projeto) newTech.projeto_arquitetonico.recuo_frontal_projeto = t.recuo_frontal_projeto;
        if (t.recuo_lateral_projeto) newTech.projeto_arquitetonico.recuo_lateral_projeto = t.recuo_lateral_projeto;
        if (t.recuo_fundos_projeto) newTech.projeto_arquitetonico.recuo_fundos_projeto = t.recuo_fundos_projeto;
        if (t.altura_muro_projeto) newTech.projeto_arquitetonico.altura_muro_projeto = t.altura_muro_projeto;
        if (t.area_telhado) newTech.drenagem.area_telhado = t.area_telhado;
        if (t.area_piso_impermeavel) newTech.drenagem.area_piso_impermeavel = t.area_piso_impermeavel;
      }

      // Mescla o projeto comercial se aplicável
      const newComercial = { ...finalChecklistData.projeto_comercial };
      if (checklistType === 'comercial' && parsedJson.projeto_comercial) {
        Object.keys(parsedJson.projeto_comercial).forEach(k => {
          const val = parsedJson.projeto_comercial[k];
          if (val && val !== '—') {
            newComercial[k] = val;
          }
        });
      }

      // Mescla o projeto residencial se aplicável
      const newResidencial = { ...finalChecklistData.projeto_residencial };
      if (checklistType === 'residencial' && parsedJson.projeto_estacionamento) {
        Object.keys(parsedJson.projeto_estacionamento).forEach(k => {
          const val = parsedJson.projeto_estacionamento[k];
          if (val && val !== '—') {
            newResidencial[k] = val;
          }
        });
      }

      const updatedChecklistData = {
        ...finalChecklistData,
        confrontacao: newConf,
        cadastral: newCadastral,
        checklist_tecnico: newTech,
        projeto_comercial: newComercial,
        projeto_residencial: newResidencial
      };

      setChecklistData(updatedChecklistData);
      setExtractionProgress('Processamento e extração concluídos com sucesso!');
      setTimeout(() => setExtractionProgress(''), 3000);

      // Salva os dados finais no banco e exibe o popup de sucesso
      await handleSaveChecklist(updatedChecklistData, false);

    } catch (err) {
      alert('Erro durante a extração técnica: ' + err.message);
      console.error(err);
    } finally {
      setExtractionLoading(false);
    }
  };

  const handleGenerateMinuta = () => {
    let pendencias = [];

    // 1. Validar divergências na confrontação de 7 colunas (imagem 2.2)
    const rows = [
      { label: 'Lote', key: 'lote' },
      { label: 'Quadra', key: 'quadra' },
      { label: 'Loteamento', key: 'loteamento' },
      { label: 'Bairro', key: 'bairro' },
      { label: 'Área Terreno', key: 'area_terreno' },
      { label: 'Área Construída', key: 'area_const' },
      { label: 'Requerente', key: 'requerente' },
      { label: 'Endereço', key: 'endereco' }
    ];

    rows.forEach(r => {
      const c = checklistData.confrontacao;
      const hasDiv = checkDivergencia(
        c[`${r.key}_certidao`],
        c[`${r.key}_bci`],
        c[`${r.key}_art_projeto`],
        c[`${r.key}_art_execucao`],
        c[`${r.key}_projeto`],
        c[`${r.key}_lic_ambient`],
        c[`${r.key}_cnd`]
      );
      if (hasDiv) {
        pendencias.push(`- Divergência no campo ${r.label} entre os documentos analisados (Certidão, BCI, ART/RRT Projeto/Execução, Projeto, Licença Ambiental e CND).`);
      }
    });

    // 2. Verificar documentos ausentes (ignorando marcados como 'nsapl')
    const docs = checklistData.documentos;
    const docLabels = {
      protocolo: 'Protocolo',
      bci: 'Boletim de Cadastro Imobiliário (BCI)',
      identificacao_proprietario: 'Documento oficial de identificação do proprietário com foto',
      cnd: 'Certidão Negativa de Débitos (CND)',
      art_projeto: 'ART/RRT de Projeto',
      inteiro_teor: 'Certidão de Inteiro Teor / Escritura',
      art_execucao: 'ART/RRT de Execução (deve ser de execução)',
      contrato_compra_venda: 'Contrato de compra e venda ou promessa de compra e venda',
      pf_identificacao: 'PF: Documento oficial de identificação do proprietário',
      pf_procurador: 'PF: Identificação do procurador',
      pf_procuracao: 'PF: Procuração com firma reconhecida',
      pj_contrato_social: 'PJ: Contrato Social (cópia conferida com a original)',
      pj_cnpj: 'PJ: Cartão do CNPJ',
      pj_anuencia_socios: 'PJ: Anuência dos sócios',
      pj_identificacao_representante: 'PJ: Identificação do representante legal'
    };

    Object.keys(docLabels).forEach(key => {
      if (docs[key] && docs[key].status === 'ausente') {
        // Na modalidade Residencial, ignoramos as exigências de PJ por padrão
        if (checklistType === 'residencial' && key.startsWith('pj_')) return;
        // Na modalidade Comercial, ignoramos PF específicos se não aplicável
        pendencias.push(`- Ausência do documento obrigatório: ${docLabels[key]}.`);
      }
    });

    // 3. Parâmetros urbanísticos e Drenagem por Modalidade
    if (checklistType === 'residencial') {
      const proj = checklistData.checklist_tecnico.projeto_arquitetonico;
      if (checkParametro('max', proj.taxa_ocupacao_projeto, proj.taxa_ocupacao_max) === 'falha') {
        pendencias.push(`- Taxa de Ocupação do projeto (${proj.taxa_ocupacao_projeto}) extrapola o limite máximo permitido (${proj.taxa_ocupacao_max}).`);
      }
      if (checkParametro('max', proj.coef_aproveitamento_projeto, proj.coef_aproveitamento_max) === 'falha') {
        pendencias.push(`- Coeficiente de Aproveitamento do projeto (${proj.coef_aproveitamento_projeto}) ultrapassa o máximo permitido (${proj.coef_aproveitamento_max}).`);
      }
      if (checkParametro('min', proj.recuo_frontal_projeto, proj.recuo_frontal_min) === 'falha') {
        pendencias.push(`- Recuo Frontal do projeto (${proj.recuo_frontal_projeto}m) é inferior ao mínimo obrigatório (${proj.recuo_frontal_min}m).`);
      }
      if (checkParametro('min', proj.recuo_lateral_projeto, proj.recuo_lateral_min) === 'falha') {
        pendencias.push(`- Recuo Lateral do projeto (${proj.recuo_lateral_projeto}m) é inferior ao mínimo obrigatório de (${proj.recuo_lateral_min}m).`);
      }
      if (checkParametro('min', proj.recuo_fundos_projeto, proj.recuo_fundos_min) === 'falha') {
        pendencias.push(`- Recuo de Fundos do projeto (${proj.recuo_fundos_projeto}m) é inferior ao mínimo obrigatório de (${proj.recuo_fundos_min}m).`);
      }
      if (checkParametro('max', proj.altura_muro_projeto, proj.altura_muro_max) === 'falha') {
        pendencias.push(`- Altura do muro frontal (${proj.altura_muro_projeto}m) excede o limite máximo permitido de (${proj.altura_muro_max}m).`);
      }

      // Validação unificada de Afastamentos para residencial
      const pcRes = checklistData.projeto_residencial || {};
      const numPavRes = parseInt(pcRes.num_pavimentos) || 0;
      const zonaKeyRes = pcRes.zona_kmz || '';
      const nsaplRes = pcRes.afast_nsapl || false;

      if (!nsaplRes && zonaKeyRes) {
        const REGRAS_ZONA_LOCAL = {
          eixo1:     { frontalAte2: 'alinhamento', frontal3a4: 3.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
          intensivo: { frontalAte2: 3.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
          eixo2:     { frontalAte2: 'alinhamento', frontal3a4: 3.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
          moderado:  { frontalAte2: 3.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
          historica: { frontalAte2: 'alinhamento', frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
          transicao1:{ frontalAte2: 4.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
          transicao2:{ frontalAte2: 10.0,          frontal3a4: 10.0,frontalAFI: null,latFundAte2: 3.0, latFundALFI: null, usaAlinhamento: false },
        };

        const regra = REGRAS_ZONA_LOCAL[zonaKeyRes];
        if (regra) {
          let frontalExig = null;
          let latFundExig = null;
          let bloqueio = false;
          let avisoHotel = false;

          if (zonaKeyRes === 'transicao2') {
            if (numPavRes > 4) bloqueio = true;
            else if (numPavRes >= 3) {
              avisoHotel = true;
              frontalExig = 10.0;
              latFundExig = 10.0;
            } else {
              frontalExig = 10.0;
              latFundExig = 3.0;
            }
          } else {
            if (numPavRes <= 2) {
              frontalExig = regra.frontalAte2;
              latFundExig = 0;
            } else if (numPavRes <= 4) {
              frontalExig = regra.frontal3a4;
              latFundExig = 2.0;
            } else {
              frontalExig = regra.frontalAFI + (numPavRes - 4) * 0.20;
              latFundExig = regra.latFundALFI + (numPavRes - 4) * 0.20;
            }
          }

          if (bloqueio) {
            pendencias.push(`- [AFASTAMENTOS] GABARITO NÃO PERMITIDO: Edificações acima de 04 pavimentos na Zona de Transição 2 são expressamente PROIBIDAS (Art. 148, III).`);
          } else {
            if (avisoHotel) {
              pendencias.push(`- [AFASTAMENTOS] ATENÇÃO: Edificações de 3 a 4 pavimentos na Zona de Transição 2 são permitidas APENAS para equipamentos especiais de hotelaria e resorts (Art. 148, II). Verifique o uso.`);
            }

            const usaAlinhamento = regra.usaAlinhamento && numPavRes <= 2;
            const adotaAlinhamento = pcRes.afast_adota_alinhamento || false;

            if (usaAlinhamento && adotaAlinhamento) {
              pendencias.push(`- [AFASTAMENTOS] Condicionado: Apresentar Memorial Justificativo Simplificado contendo planta da quadra com locação das edificações vizinhas e Levantamento Fotográfico (Art. 142, Parágrafo Único).`);
            } else {
              const pF1 = parseFloat(pcRes.afast_frontal1?.toString().replace(',', '.')) || 0;
              const pF2 = parseFloat(pcRes.afast_frontal2?.toString().replace(',', '.')) || 0;
              const pLat = parseFloat(pcRes.afast_lateral?.toString().replace(',', '.')) || 0;
              const pFund = parseFloat(pcRes.afast_fundos?.toString().replace(',', '.')) || 0;

              if (typeof frontalExig === 'number') {
                if (!pcRes.afast_frontal1 || pF1 < frontalExig) {
                  pendencias.push(`- Recuo Frontal Projetado (${pF1}m) é inferior ao exigido de ${frontalExig.toFixed(2)}m.`);
                }
                if (pcRes.afast_esquina === 'sim' && (!pcRes.afast_frontal2 || pF2 < frontalExig)) {
                  pendencias.push(`- Recuo Frontal Projetado (Testada Secundária: ${pF2}m) é inferior ao exigido de ${frontalExig.toFixed(2)}m.`);
                }
              }
              if (latFundExig > 0) {
                if (!pcRes.afast_lateral || pLat < latFundExig) {
                  pendencias.push(`- Recuo Lateral Projetado (${pLat}m) é inferior ao exigido de ${latFundExig.toFixed(2)}m.`);
                }
                if (!pcRes.afast_fundos || pFund < latFundExig) {
                  pendencias.push(`- Recuo de Fundos Projetado (${pFund}m) é inferior ao exigido de ${latFundExig.toFixed(2)}m.`);
                }
              }
            }
          }
        }
      }

      const reqVol = parseFloat(calcAmortecimentoRequerido());
      const projVol = parseFloat(checklistData.checklist_tecnico.drenagem.amortecimento_projeto?.toString().replace(',', '.'));
      if (!isNaN(reqVol) && !isNaN(projVol) && projVol < reqVol) {
        pendencias.push(`- Volume de detenção/amortecimento pluvial (${projVol}m³) é inferior ao mínimo requerido pela Lei 1024/2003 (${reqVol}m³).`);
      }

      // Validação de vagas de estacionamento
      const resEstacAreaTotal = parseFloat(checklistData.projeto_residencial?.estac_area_total_construida?.toString().replace(',', '.')) || 0;
      if (resEstacAreaTotal > 0) {
        const resEstacDedGaragem = parseFloat(checklistData.projeto_residencial?.estac_deducao_garagem?.toString().replace(',', '.')) || 0;
        const resEstacDedTecnica = parseFloat(checklistData.projeto_residencial?.estac_deducao_tecnica?.toString().replace(',', '.')) || 0;
        const resEstacDedCirculacao = parseFloat(checklistData.projeto_residencial?.estac_deducao_circulacao?.toString().replace(',', '.')) || 0;
        const resEstacDedLazer = parseFloat(checklistData.projeto_residencial?.estac_deducao_lazer?.toString().replace(',', '.')) || 0;
        const resEstacDedFachadaAtiva = parseFloat(checklistData.projeto_residencial?.estac_deducao_fachada_ativa?.toString().replace(',', '.')) || 0;

        const resEstacTotalNaoComputavel = resEstacDedGaragem + resEstacDedTecnica + resEstacDedCirculacao + resEstacDedLazer + resEstacDedFachadaAtiva;
        const resEstacAreaComputavel = Math.max(0, resEstacAreaTotal - resEstacTotalNaoComputavel);
        const resEstacVagasExigidas = resEstacAreaComputavel > 500 ? Math.ceil((resEstacAreaComputavel - 500) / 50) : 0;
        const resEstacVagasProjeto = parseInt(checklistData.projeto_residencial?.estac_vagas_projeto) || 0;
        if (resEstacVagasProjeto < resEstacVagasExigidas) {
          pendencias.push(`- O número de vagas de estacionamento projetadas (${resEstacVagasProjeto}) é inferior ao exigido (${resEstacVagasExigidas}) para a área computável de ${resEstacAreaComputavel.toFixed(2)}m² (Art. 192).`);
        }
      }
    }

    if (checklistType === 'comercial') {
      const pc = checklistData.projeto_comercial || {};

      // BLOCO 1: Zoneamento & Parâmetros Gerais
      if (!pc.zona_kmz) {
        pendencias.push('- Falta selecionar a Zona de Zoneamento no Bloco 1.');
      }
      
      const numPavs = parseInt(pc.num_pavimentos) || 0;
      if (!pc.num_pavimentos || numPavs <= 0) {
        pendencias.push('- Número de pavimentos inválido ou não informado no Bloco 1.');
      }

      // Validação unificada de Afastamentos para comercial
      const nsaplCom = pc.afast_nsapl || false;
      const zonaKeyCom = pc.zona_kmz || '';

      if (!nsaplCom && zonaKeyCom) {
        const REGRAS_ZONA_LOCAL = {
          eixo1:     { frontalAte2: 'alinhamento', frontal3a4: 3.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
          intensivo: { frontalAte2: 3.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
          eixo2:     { frontalAte2: 'alinhamento', frontal3a4: 3.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
          moderado:  { frontalAte2: 3.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
          historica: { frontalAte2: 'alinhamento', frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: true },
          transicao1:{ frontalAte2: 4.0,           frontal3a4: 5.0, frontalAFI: 5.0, latFundAte2: 0, latFundALFI: 2.0, usaAlinhamento: false },
          transicao2:{ frontalAte2: 10.0,          frontal3a4: 10.0,frontalAFI: null,latFundAte2: 3.0, latFundALFI: null, usaAlinhamento: false },
        };

        const regra = REGRAS_ZONA_LOCAL[zonaKeyCom];
        if (regra) {
          let frontalExig = null;
          let latFundExig = null;
          let bloqueio = false;
          let avisoHotel = false;

          if (zonaKeyCom === 'transicao2') {
            if (numPavs > 4) bloqueio = true;
            else if (numPavs >= 3) {
              avisoHotel = true;
              frontalExig = 10.0;
              latFundExig = 10.0;
            } else {
              frontalExig = 10.0;
              latFundExig = 3.0;
            }
          } else {
            if (numPavs <= 2) {
              frontalExig = regra.frontalAte2;
              latFundExig = 0;
            } else if (numPavs <= 4) {
              frontalExig = regra.frontal3a4;
              latFundExig = 2.0;
            } else {
              frontalExig = regra.frontalAFI + (numPavs - 4) * 0.20;
              latFundExig = regra.latFundALFI + (numPavs - 4) * 0.20;
            }
          }

          if (bloqueio) {
            pendencias.push(`- [AFASTAMENTOS] GABARITO NÃO PERMITIDO: Edificações acima de 04 pavimentos na Zona de Transição 2 são expressamente PROIBIDAS (Art. 148, III).`);
          } else {
            if (avisoHotel) {
              pendencias.push(`- [AFASTAMENTOS] ATENÇÃO: Edificações de 3 a 4 pavimentos na Zona de Transição 2 são permitidas APENAS para equipamentos especiais de hotelaria e resorts (Art. 148, II). Verifique o uso.`);
            }

            const usaAlinhamento = regra.usaAlinhamento && numPavs <= 2;
            const adotaAlinhamento = pc.afast_adota_alinhamento || false;

            if (usaAlinhamento && adotaAlinhamento) {
              pendencias.push(`- [AFASTAMENTOS] Condicionado: Apresentar Memorial Justificativo Simplificado contendo planta da quadra com locação das edificações vizinhas e Levantamento Fotográfico (Art. 142, Parágrafo Único).`);
            } else {
              const pF1 = parseFloat(pc.afast_frontal1?.toString().replace(',', '.')) || 0;
              const pF2 = parseFloat(pc.afast_frontal2?.toString().replace(',', '.')) || 0;
              const pLat = parseFloat(pc.afast_lateral?.toString().replace(',', '.')) || 0;
              const pFund = parseFloat(pc.afast_fundos?.toString().replace(',', '.')) || 0;

              if (typeof frontalExig === 'number') {
                if (!pc.afast_frontal1 || pF1 < frontalExig) {
                  pendencias.push(`- Recuo Frontal Projetado (${pF1}m) é inferior ao exigido de ${frontalExig.toFixed(2)}m.`);
                }
                if (pc.afast_esquina === 'sim' && (!pc.afast_frontal2 || pF2 < frontalExig)) {
                  pendencias.push(`- Recuo Frontal Projetado (Testada Secundária: ${pF2}m) é inferior ao exigido de ${frontalExig.toFixed(2)}m.`);
                }
              }
              if (latFundExig > 0) {
                if (!pc.afast_lateral || pLat < latFundExig) {
                  pendencias.push(`- Recuo Lateral Projetado (${pLat}m) é inferior ao exigido de ${latFundExig.toFixed(2)}m.`);
                }
                if (!pc.afast_fundos || pFund < latFundExig) {
                  pendencias.push(`- Recuo de Fundos Projetado (${pFund}m) é inferior ao exigido de ${latFundExig.toFixed(2)}m.`);
                }
              }
            }
          }
        }
      }

      // Parâmetros de ocupação e aproveitamento baseados na zona
      const zonaInfo = pc.zona_kmz ? ZONAS_ANEXO13[pc.zona_kmz] : null;
      if (zonaInfo) {
        const taxaMax = parseFloat(zonaInfo.taxaMax.replace(',', '.')) || 0;
        const txProj = parseFloat(pc.taxa_ocupacao?.toString().replace(',', '.')) || 0;
        if (txProj > taxaMax) {
          pendencias.push(`- Taxa de Ocupação do projeto (${txProj}) excede o limite máximo permitido (${taxaMax}) para a zona ${pc.zona_kmz}.`);
        }

        const caMaxStr = zonaInfo.caMax || '';
        const caMax = parseFloat(caMaxStr.replace(',', '.')) || 0;
        const caProj = parseFloat(pc.coef_aproveitamento?.toString().replace(',', '.')) || 0;
        if (caMaxStr !== '-' && caMaxStr.toLowerCase() !== 'e' && caMax > 0 && caProj > caMax) {
          pendencias.push(`- Coeficiente de Aproveitamento do projeto (${caProj}) ultrapassa o máximo permitido (${caMaxStr}) para a zona ${pc.zona_kmz}.`);
        }
      }

      if (!pc.projeto_assinado) {
        pendencias.push('- O projeto arquitetônico comercial não está assinado.');
      }

      // BLOCO 2: Tabela de Verificação (TSN e CA)
      const tsnMin = zonaInfo ? parseFloat(zonaInfo.tsn) : 0;
      const areaTerrenoTSN = parseFloat(pc.tsn_area_terreno?.toString().replace(',', '.')) || 0;
      const areaProjetoTSN = parseFloat(pc.tsn_area_projeto?.toString().replace(',', '.')) || 0;
      const tsnCalculada = areaTerrenoTSN > 0 ? (areaProjetoTSN / areaTerrenoTSN) * 100 : 0;
      if (zonaInfo && tsnCalculada < tsnMin) {
        pendencias.push(`- Taxa de Solo Natural (TSN) do projeto (${tsnCalculada.toFixed(2)}%) é inferior ao mínimo exigido (${tsnMin}%) no Bloco 2.`);
      }

      const areaTerrenoCA = parseFloat(pc.ca_area_terreno?.toString().replace(',', '.')) || 0;
      const areaConstruidaCA = parseFloat(pc.ca_area_construida?.toString().replace(',', '.')) || 0;
      const caCalculado = areaTerrenoCA > 0 ? (areaConstruidaCA / areaTerrenoCA) : 0;
      if (zonaInfo && zonaInfo.caMax !== '-' && zonaInfo.caMax.toLowerCase() !== 'e') {
        const caMax = parseFloat(zonaInfo.caMax.replace(',', '.')) || 0;
        if (caMax > 0 && caCalculado > caMax) {
          pendencias.push(`- Coeficiente de Aproveitamento (CA) calculado (${caCalculado.toFixed(2)}) ultrapassa o limite máximo permitido (${zonaInfo.caMax}) no Bloco 2.`);
        }
      }

      // BLOCO 3: Áreas Arborizadas do Imóvel
      const testadaComercial = parseFloat(pc.testada_total?.toString().replace(',', '.')) || 0;
      if (testadaComercial > 0) {
        const arvoresExigidasComercial = Math.ceil(testadaComercial / 6);
        const arvoresProjetoComercial = parseInt(pc.qtd_arvores) || 0;
        if (arvoresProjetoComercial < arvoresExigidasComercial) {
          pendencias.push(`- Quantidade de árvores projetadas (${arvoresProjetoComercial}) é inferior ao mínimo exigido de ${arvoresExigidasComercial} árvore(s) para a testada de ${testadaComercial}m.`);
        }
      }

      // BLOCO 4: Análise de Drenagem
      if (pc.drenagem_alagavel === 'sim') {
        pendencias.push('- O imóvel está em área alagável. Apresentar projeto de drenagem adequado.');
      }
      if (pc.drenagem_risco === 'sim') {
        pendencias.push('- O imóvel está em área de risco. Apresentar laudo técnico de estabilidade/risco.');
      }
      if (pc.drenagem_distancia_riacho && pc.drenagem_distancia_riacho !== 'NSAPL') {
        const distRiacho = parseFloat(pc.drenagem_distancia_riacho.toString().replace(',', '.')) || 0;
        if (distRiacho < 30) {
          pendencias.push(`- Distância do projeto a riachos/lagoas (${distRiacho}m) é inferior ao limite de precaução de 30 metros.`);
        }
      }
      if (pc.drenagem_distancia_canal && pc.drenagem_distancia_canal !== 'NSAPL') {
        const distCanal = parseFloat(pc.drenagem_distancia_canal.toString().replace(',', '.')) || 0;
        if (distCanal < 10) {
          pendencias.push(`- Distância do projeto a canais/talvegues (${distCanal}m) é inferior ao limite de precaução de 10 metros.`);
        }
      }

      // BLOCO 5: Verificação de ART/RRT
      if (pc.art_rrt_atividade_corresponde === 'nao_corresponde') {
        pendencias.push('- A atividade técnica descrita na ART/RRT não corresponde ao projeto apresentado.');
      }
      const areaArt = parseFloat(pc.art_rrt_area_art?.toString().replace(',', '.')) || 0;
      const areaRrt = parseFloat(pc.art_rrt_area_rrt?.toString().replace(',', '.')) || 0;
      const areaProj = parseFloat(pc.art_rrt_area_projeto?.toString().replace(',', '.')) || 0;
      const areasPreenchidas = [
        { nome: 'ART', valor: areaArt, raw: pc.art_rrt_area_art },
        { nome: 'RRT', valor: areaRrt, raw: pc.art_rrt_area_rrt },
        { nome: 'Projeto', valor: areaProj, raw: pc.art_rrt_area_projeto }
      ].filter(item => item.raw && parseFloat(item.raw.toString().replace(',', '.')) > 0);
      if (areasPreenchidas.length > 1) {
        const hasAreaDivergencia = !areasPreenchidas.every(item => item.valor === areasPreenchidas[0].valor);
        if (hasAreaDivergencia) {
          pendencias.push(`- Divergência nas áreas descritas nos documentos técnicos (ART: ${areaArt}m², RRT: ${areaRrt}m², Projeto: ${areaProj}m²).`);
        }
      }

      // BLOCO 6: Estudo de Impacto de Vizinhança (EIV)
      const areaTerrEIV = parseFloat(pc.eiv_terreno_area) || 0;
      const areaConstEIV = parseFloat(pc.eiv_construida_area) || 0;
      if (areaTerrEIV >= 10000 || areaConstEIV >= 5000) {
        pendencias.push('- O empreendimento necessita apresentar Estudo de Impacto de Vizinhança (EIV) por extrapolar os limites de área.');
      }

      // BLOCO 7: Depósito de Lixo (Art. 19)
      const pavsLixo = parseInt(pc.lixo_pavimentos) || 0;
      const econsLixo = parseInt(pc.lixo_economias) || 0;
      if (pavsLixo > 2 || econsLixo > 2) {
        pendencias.push('- O projeto necessita de depósito de lixo conforme o Art. 19 por possuir mais de 2 pavimentos ou mais de 2 economias.');
      }

      // BLOCO 8: Pé-Direito Comercial e Jirau (Art. 27)
      if (pc.pe_direito_sala_area && pc.pe_direito_sala_pe) {
        const areaSala = parseFloat(pc.pe_direito_sala_area) || 0;
        const peSala = parseFloat(pc.pe_direito_sala_pe) || 0;
        const peExigido = areaSala > 75 ? 3.50 : 3.00;
        if (peSala < peExigido) {
          pendencias.push(`- O pé-direito da sala comercial (${peSala}m) é inferior ao mínimo regulamentar de ${peExigido.toFixed(2)}m.`);
        }
      }
      if (pc.pe_direito_jirau_existe === 'sim') {
        const areaSala = parseFloat(pc.pe_direito_sala_area) || 0;
        const areaJirau = parseFloat(pc.pe_direito_jirau_area) || 0;
        if (areaSala > 0 && areaJirau > areaSala * 0.30) {
          pendencias.push(`- A área do Jirau (${areaJirau}m²) excede o limite permitido de 30% da área do compartimento (${(areaSala * 0.30).toFixed(2)}m²).`);
        }
        const acimaJ = parseFloat(pc.pe_direito_jirau_acima) || 0;
        const abaixoJ = parseFloat(pc.pe_direito_jirau_abaixo) || 0;
        if (acimaJ > 0 && acimaJ < 2.20) {
          pendencias.push(`- O pé-direito acima do Jirau (${acimaJ}m) é inferior ao mínimo de 2.20m.`);
        }
        if (abaixoJ > 0 && abaixoJ < 2.20) {
          pendencias.push(`- O pé-direito abaixo do Jirau (${abaixoJ}m) é inferior ao mínimo de 2.20m.`);
        }
      }

      // BLOCO 9: Medidas do Lote vs Escritura
      if (pc.medidas_lote_projeto && pc.medidas_lote_certidao) {
        const pNorm = pc.medidas_lote_projeto.trim().toLowerCase().replace(/\s+/g, ' ');
        const cNorm = pc.medidas_lote_certidao.trim().toLowerCase().replace(/\s+/g, ' ');
        if (pNorm !== cNorm) {
          pendencias.push('- As medidas do lote no projeto não coincidem com a Escritura/Certidão de Inteiro Teor.');
        }
      }

      // BLOCO 10: Confrontantes
      if (pc.confrontantes_frente_projeto || pc.confrontantes_fundos_projeto || pc.confrontantes_ld_projeto || pc.confrontantes_le_projeto) {
        const keysConf = ['frente', 'fundos', 'ld', 'le'];
        const labelsConf = { frente: 'Frente', fundos: 'Fundos', ld: 'Lado Direito (LD)', le: 'Lado Esquerdo (LE)' };
        keysConf.forEach(k => {
          const valProj = pc[`confrontantes_${k}_projeto`]?.trim() || '';
          const valCert = pc[`confrontantes_${k}_certidao`]?.trim() || '';
          if (valProj && valCert && valProj.toLowerCase().replace(/\s+/g, ' ') !== valCert.toLowerCase().replace(/\s+/g, ' ')) {
            pendencias.push(`- Confrontante ${labelsConf[k]} no projeto não coincide com a Escritura ou Certidão de Inteiro Teor.`);
          }
        });
      }

      // BLOCO 11: Área de Uso Comum & Áreas Molhadas
      if (pc.revestimento_ceramico === false) {
        pendencias.push('- Falta prever revestimento cerâmico ou equivalente em áreas molhadas no projeto.');
      }
      if (pc.tinta_impermeavel === false) {
        pendencias.push('- Falta prever aplicação de tinta impermeável nas áreas adequadas do projeto.');
      }

      // BLOCO 12: Afastamentos e Prisma
      if (pc.prisma_nsapl !== 'NSAPL') {
        const distVizinho = parseFloat(pc.distancia_lote_vizinho?.toString().replace(',', '.')) || 0;
        if (pc.distancia_lote_vizinho && distVizinho < 1.50) {
          pendencias.push(`- Distância de janelas para divisas do lote vizinho (${distVizinho}m) é inferior a 1,50 m.`);
        }
      }

      // BLOCO 13: Dimensionamento de Estacionamento
      const estacAreaTotal = parseFloat(pc.estac_area_total_construida?.toString().replace(',', '.')) || 0;
      if (estacAreaTotal > 0) {
        const estacDedGaragem = parseFloat(pc.estac_deducao_garagem?.toString().replace(',', '.')) || 0;
        const estacDedTecnica = parseFloat(pc.estac_deducao_tecnica?.toString().replace(',', '.')) || 0;
        const estacDedCirculacao = parseFloat(pc.estac_deducao_circulacao?.toString().replace(',', '.')) || 0;
        const estacDedLazer = parseFloat(pc.estac_deducao_lazer?.toString().replace(',', '.')) || 0;
        const estacDedFachadaAtiva = parseFloat(pc.estac_deducao_fachada_ativa?.toString().replace(',', '.')) || 0;

        const estacTotalNaoComputavel = estacDedGaragem + estacDedTecnica + estacDedCirculacao + estacDedLazer + estacDedFachadaAtiva;
        const estacAreaComputavel = Math.max(0, estacAreaTotal - estacTotalNaoComputavel);
        const estacVagasExigidas = estacAreaComputavel > 500 ? Math.ceil(estacAreaComputavel / 50) : 0;
        const estacVagasProjeto = parseInt(pc.estac_vagas_projeto) || 0;
        if (estacVagasProjeto < estacVagasExigidas) {
          pendencias.push(`- O número de vagas de estacionamento projetadas (${estacVagasProjeto}) é inferior ao exigido (${estacVagasExigidas}) para a área computável de ${estacAreaComputavel.toFixed(2)}m² (Art. 192).`);
        }
      }

      // Acessibilidade Comercial legada
      const ac = checklistData.checklist_tecnico.acessibilidade;
      if (ac && (ac.rampas_ok === false || ac.sanitarios_ok === false || ac.acessibilidade_geral_ok === false)) {
        pendencias.push(`- Inconformidades no projeto de Acessibilidade comercial (NBR 9050): rampas, sanitários PCD ou rotas livres.`);
      }
    }

    if (checklistData.checklist_tecnico.calcada_cidada?.calcada_ok === false) {
      pendencias.push(`- Projeto de calçada cidadã em desacordo com as normas municipais.`);
    }

    if (pendencias.length === 0) {
      setDraftMinuta(`AUDITORIA TÉCNICA DO PROCESSO PROTOCOLO: ${proc.protocol}\n\nConclusão: Nenhuma divergência cadastral ou inconformidade regulamentar encontrada. Projeto apto para deferimento.`);
    } else {
      setDraftMinuta(`AUDITORIA TÉCNICA DO PROCESSO PROTOCOLO: ${proc.protocol}\n\nFicam registradas as seguintes PENDÊNCIAS E EXIGÊNCIAS para regularização do projeto:\n\n${pendencias.join('\n')}\n\nFavor sanar as pendências e reencaminhar.`);
    }
  };

  useEffect(() => {
    if (id) {
      loadChecklist();
    }
  }, [id]);

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
      setTempLat(proc.latitude || null);
      setTempLng(proc.longitude || null);
      setRefLat(proc.ref_latitude || null);
      setRefLng(proc.ref_longitude || null);

      if (proc.report_observation) {
        try {
          const parsed = JSON.parse(proc.report_observation);
          if (parsed && typeof parsed === 'object' && ('notes' in parsed || 'drawings' in parsed)) {
            setGeoNotes(parsed.notes || '');
            setGeoShape(parsed.geoShape ? (typeof parsed.geoShape === 'string' ? parsed.geoShape : JSON.stringify(parsed.geoShape)) : null);
            if (parsed.mainLabel) setMainLabel(parsed.mainLabel);
            if (parsed.refLabel) setRefLabel(parsed.refLabel);
            if (parsed.refLat) setRefLat(parsed.refLat);
            if (parsed.refLng) setRefLng(parsed.refLng);
            if (parsed.mainCalloutPos) {
               setMainCalloutLat(parsed.mainCalloutPos.lat);
               setMainCalloutLng(parsed.mainCalloutPos.lng);
            }
            if (parsed.refCalloutPos) {
               setRefCalloutLat(parsed.refCalloutPos.lat);
               setRefCalloutLng(parsed.refCalloutPos.lng);
            }
            if (parsed.mapZoom) setMapZoom(parsed.mapZoom);
            if (parsed.mapCenter) setMapCenter(parsed.mapCenter);
          } else {
            setGeoNotes(proc.report_observation);
          }
        } catch (e) {
          setGeoNotes(proc.report_observation);
        }
      } else {
        setGeoNotes('');
      }
    }
  }, [proc]);

  useEffect(() => {
    if (!isGeoOpen) {
      setMapReady(false);
      return;
    }

    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L && window.L.Control.Draw) return resolve();
        
        const loadCSS = (id, href) => {
          if (!document.getElementById(id)) {
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = href;
            document.head.appendChild(link);
          }
        };

        loadCSS('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        loadCSS('leaflet-draw-css', 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css');

        const loadScript = (src) => {
          return new Promise((res) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => res();
            document.body.appendChild(script);
          });
        };

        if (!window.L) {
          loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js').then(() => {
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js').then(resolve);
          });
        } else {
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js').then(resolve);
        }
      });
    };

    loadLeaflet().then(() => {
      setMapReady(true);
    });
  }, [isGeoOpen]);

  useEffect(() => {
    if (!mapReady || !isGeoOpen || !window.L) return;

    const initialLat = mapCenter ? mapCenter.lat : (tempLat || -3.78992);
    const initialLng = mapCenter ? mapCenter.lng : (tempLng || -38.58892);
    const zoomLvl = mapZoom || 14;

    const map = window.L.map('leaflet-picker-map').setView([initialLat, initialLng], zoomLvl);

    window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri World Imagery'
    }).addTo(map);

    // --- LEAFLET DRAW SETUP ---
    const drawnItems = new window.L.FeatureGroup();
    map.addLayer(drawnItems);

    if (geoShape) {
      try {
        const geoJsonData = JSON.parse(geoShape);
        window.L.geoJSON(geoJsonData, {
          onEachFeature: function (feature, layer) {
            drawnItems.addLayer(layer);
          }
        });
      } catch (e) {
        console.error("Erro ao carregar geoShape:", e);
      }
    }

    if (window.L.Control && window.L.Control.Draw) {
      const drawControl = new window.L.Control.Draw({
        edit: { featureGroup: drawnItems },
        draw: {
          marker: false,
          circlemarker: false,
          circle: false
        }
      });
      map.addControl(drawControl);

      const updateGeoShape = () => {
        const features = [];
        drawnItems.eachLayer(layer => {
          if (!layer.customType && typeof layer.toGeoJSON === 'function') {
            features.push(layer.toGeoJSON());
          }
        });
        const data = { type: "FeatureCollection", features: features };
        setGeoShape(JSON.stringify(data));
      };

      map.on(window.L.Draw.Event.CREATED, function (e) {
        drawnItems.addLayer(e.layer);
        updateGeoShape();
      });
      map.on(window.L.Draw.Event.EDITED, updateGeoShape);
      
      map.on(window.L.Draw.Event.DELETED, function (e) {
        let deletedMain = false;
        let deletedRef = false;
        
        e.layers.eachLayer(function (layer) {
          if (layer.customType === 'main') deletedMain = true;
          if (layer.customType === 'ref') deletedRef = true;
        });

        if (deletedMain) {
          mainMarker = null;
          calloutMarker = null;
          calloutLine = null;
          if (mainGroup) { drawnItems.removeLayer(mainGroup); mainGroup = null; }
          window.pickerMainCallout = null;
          setTempLat(null);
          setTempLng(null);
        }
        if (deletedRef) {
          refMarker = null;
          refCalloutMarker = null;
          refCalloutLine = null;
          if (refGroup) { drawnItems.removeLayer(refGroup); refGroup = null; }
          window.pickerRefCallout = null;
          setRefLat(null);
          setRefLng(null);
        }
        updateGeoShape();
      });
    }

    // --- DRAGGABLE CALLOUT SETUP ---
    let mainGroup = null;
    let mainMarker = null;
    let calloutMarker = null;
    let calloutLine = null;

    let refGroup = null;
    let refMarker = null;
    let refCalloutMarker = null;
    let refCalloutLine = null;

    const createMainCallout = (latlng) => {
      if (!mainGroup) {
        mainGroup = new window.L.FeatureGroup();
        mainGroup.customType = 'main';
        drawnItems.addLayer(mainGroup);
      }

      if (!mainMarker) {
        mainMarker = window.L.marker(latlng, { draggable: true });
        mainMarker.customType = 'main';
        mainGroup.addLayer(mainMarker);
        
        mainMarker.on('drag', (e) => {
          const pos = e.target.getLatLng();
          setTempLat(parseFloat(pos.lat.toFixed(6)));
          setTempLng(parseFloat(pos.lng.toFixed(6)));
          if (calloutLine && calloutMarker) {
            calloutLine.setLatLngs([pos, calloutMarker.getLatLng()]);
          }
        });
      } else {
        mainMarker.setLatLng(latlng);
      }

      if (!calloutMarker) {
        const offsetLat = mainCalloutLat || latlng.lat + 0.002;
        const offsetLng = mainCalloutLng || latlng.lng + 0.002;
        const icon = window.L.divIcon({
          className: 'custom-callout main-callout',
          html: `<div style="background: white; padding: 6px 12px; border: 2px solid #0056b3; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-size: 13px; cursor: grab; font-weight: bold; color: #0056b3;">${mainLabelRef.current}<br/><small style="font-weight: normal; color: #555;">(Arraste este balão)</small></div>`,
          iconSize: null
        });
        calloutMarker = window.L.marker([offsetLat, offsetLng], { icon, draggable: true });
        calloutMarker.customType = 'main';
        mainGroup.addLayer(calloutMarker);
        
        calloutMarker.on('drag', (e) => {
          const pos = e.target.getLatLng();
          setMainCalloutLat(parseFloat(pos.lat.toFixed(6)));
          setMainCalloutLng(parseFloat(pos.lng.toFixed(6)));
          if (calloutLine && mainMarker) {
            calloutLine.setLatLngs([mainMarker.getLatLng(), calloutMarker.getLatLng()]);
          }
        });
        window.pickerMainCallout = calloutMarker;
      }

      if (!calloutLine) {
        calloutLine = window.L.polyline([mainMarker.getLatLng(), calloutMarker.getLatLng()], {
          color: '#0056b3', weight: 2, dashArray: '4, 4'
        });
        calloutLine.customType = 'main';
        mainGroup.addLayer(calloutLine);
      } else {
        calloutLine.setLatLngs([mainMarker.getLatLng(), calloutMarker.getLatLng()]);
      }
    };

    const createRefCallout = (latlng) => {
      if (!refGroup) {
        refGroup = new window.L.FeatureGroup();
        refGroup.customType = 'ref';
        drawnItems.addLayer(refGroup);
      }

      if (!refMarker) {
        const refIcon = window.L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });
        refMarker = window.L.marker(latlng, { icon: refIcon, draggable: true });
        refMarker.customType = 'ref';
        refGroup.addLayer(refMarker);
        
        refMarker.on('drag', (e) => {
          const pos = e.target.getLatLng();
          setRefLat(parseFloat(pos.lat.toFixed(6)));
          setRefLng(parseFloat(pos.lng.toFixed(6)));
          if (refCalloutLine && refCalloutMarker) {
            refCalloutLine.setLatLngs([pos, refCalloutMarker.getLatLng()]);
          }
        });
      } else {
        refMarker.setLatLng(latlng);
      }

      if (!refCalloutMarker) {
        const offsetLat = refCalloutLat || latlng.lat + 0.002;
        const offsetLng = refCalloutLng || latlng.lng + 0.002;
        const icon = window.L.divIcon({
          className: 'custom-callout ref-callout',
          html: `<div style="background: white; padding: 6px 12px; border: 2px solid #d97706; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-size: 13px; cursor: grab; font-weight: bold; color: #d97706;">${refLabelRef.current}<br/><small style="font-weight: normal; color: #555;">(Arraste este balão)</small></div>`,
          iconSize: null
        });
        refCalloutMarker = window.L.marker([offsetLat, offsetLng], { icon, draggable: true });
        refCalloutMarker.customType = 'ref';
        refGroup.addLayer(refCalloutMarker);
        
        refCalloutMarker.on('drag', (e) => {
          const pos = e.target.getLatLng();
          setRefCalloutLat(parseFloat(pos.lat.toFixed(6)));
          setRefCalloutLng(parseFloat(pos.lng.toFixed(6)));
          if (refCalloutLine && refMarker) {
            refCalloutLine.setLatLngs([refMarker.getLatLng(), refCalloutMarker.getLatLng()]);
          }
        });
        window.pickerRefCallout = refCalloutMarker;
      }

      if (!refCalloutLine) {
        refCalloutLine = window.L.polyline([refMarker.getLatLng(), refCalloutMarker.getLatLng()], {
          color: '#d97706', weight: 2, dashArray: '4, 4'
        });
        refCalloutLine.customType = 'ref';
        refGroup.addLayer(refCalloutLine);
      } else {
        refCalloutLine.setLatLngs([refMarker.getLatLng(), refCalloutMarker.getLatLng()]);
      }
    };

    if (tempLat && tempLng) {
      createMainCallout({ lat: tempLat, lng: tempLng });
    }
    
    if (refLat && refLng) {
      createRefCallout({ lat: refLat, lng: refLng });
    }

    map.on('click', (e) => {
      const mode = placementModeRef.current;
      if (mode === 'main') {
        setTempLat(parseFloat(e.latlng.lat.toFixed(6)));
        setTempLng(parseFloat(e.latlng.lng.toFixed(6)));
        createMainCallout(e.latlng);
        setPlacementMode(null);
      } else if (mode === 'ref') {
        setRefLat(parseFloat(e.latlng.lat.toFixed(6)));
        setRefLng(parseFloat(e.latlng.lng.toFixed(6)));
        createRefCallout(e.latlng);
        setPlacementMode(null);
      }
    });

    window.pickerMap = map;
    window.pickerMarker = mainMarker;

    return () => {
      if (window.pickerMap) {
        window.pickerMap.remove();
        window.pickerMap = null;
        window.pickerMarker = null;
      }
    };
  }, [mapReady, isGeoOpen]);

  useEffect(() => {
    if (window.pickerMainCallout) {
      const icon = window.L.divIcon({
        className: 'custom-callout main-callout',
        html: `<div style="background: white; padding: 6px 12px; border: 2px solid #0056b3; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-size: 13px; cursor: grab; font-weight: bold; color: #0056b3;">${mainLabel}<br/><small style="font-weight: normal; color: #555;">(Arraste este balão)</small></div>`,
        iconSize: null
      });
      window.pickerMainCallout.setIcon(icon);
    }
  }, [mainLabel]);

  useEffect(() => {
    if (window.pickerRefCallout) {
      const icon = window.L.divIcon({
        className: 'custom-callout ref-callout',
        html: `<div style="background: white; padding: 6px 12px; border: 2px solid #d97706; border-radius: 6px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); white-space: nowrap; font-size: 13px; cursor: grab; font-weight: bold; color: #d97706;">${refLabel}<br/><small style="font-weight: normal; color: #555;">(Arraste este balão)</small></div>`,
        iconSize: null
      });
      window.pickerRefCallout.setIcon(icon);
    }
  }, [refLabel]);

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
      let advancedDrawings = [];
      const mLat = tempLat || (window.pickerMap ? window.pickerMap.getCenter().lat : -3.78);
      const mLng = tempLng || (window.pickerMap ? window.pickerMap.getCenter().lng : -38.58);
      
      if (mainLabel || tempLat) {
        advancedDrawings.push({
          type: 'marker',
          lat: mLat,
          lng: mLng,
          text: `📍 ${mainLabel || 'Local'}`
        });
      }
      if (refLabel && refLat && refLng) {
        advancedDrawings.push({
          type: 'marker',
          lat: refLat,
          lng: refLng,
          text: `📍 ${refLabel}`
        });
      }

      if (geoShape) {
        try {
          const parsedGeo = typeof geoShape === 'string' ? JSON.parse(geoShape) : geoShape;
          if (parsedGeo.features) {
            parsedGeo.features.forEach(f => {
              if (f.geometry && f.geometry.type === 'LineString') {
                advancedDrawings.push({ type: 'line', points: f.geometry.coordinates.map(c => [c[1], c[0]]) });
              } else if (f.geometry && f.geometry.type === 'Polygon') {
                advancedDrawings.push({ type: 'polygon', points: f.geometry.coordinates[0].map(c => [c[1], c[0]]) });
              }
            });
          }
        } catch(e) {}
      }

      const payloadObj = {
        notes: geoNotes.trim(),
        drawings: advancedDrawings,
        geoShape: geoShape ? (typeof geoShape === 'string' ? JSON.parse(geoShape) : geoShape) : null,
        mainLabel,
        refLabel,
        refLat,
        refLng,
        mainCalloutPos: mainCalloutLat ? { lat: mainCalloutLat, lng: mainCalloutLng } : null,
        refCalloutPos: refCalloutLat ? { lat: refCalloutLat, lng: refCalloutLng } : null,
        mapZoom: window.pickerMap ? window.pickerMap.getZoom() : 14,
        mapCenter: window.pickerMap ? window.pickerMap.getCenter() : null
      };

      await api.updateProcess(proc.id, {
        latitude: tempLat || null,
        longitude: tempLng || null,
        report_observation: JSON.stringify(payloadObj)
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

      {/* Abas do Processo */}
      <div className="card" style={{ display: 'flex', gap: '8px', padding: '10px', marginBottom: '18px', flexWrap: 'wrap', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('tramite')} 
          className={`btn ${activeTab === 'tramite' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📂 Trâmite & Movimentação
        </button>
        <button 
          onClick={() => setActiveTab('auditoria')} 
          className={`btn ${activeTab === 'auditoria' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ⚖️ Auditoria Técnica Automatizada
        </button>
        <button 
          onClick={() => setActiveTab('tour')} 
          className={`btn ${activeTab === 'tour' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📸 Vistoria 360°
        </button>
      </div>

      {activeTab === 'tramite' && (
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
                {(() => {
                  let obsText = proc.report_observation;
                  if (obsText) {
                    try {
                      const parsed = JSON.parse(obsText);
                      if (parsed && typeof parsed === 'object' && ('notes' in parsed || 'drawings' in parsed)) {
                        obsText = parsed.notes;
                      }
                    } catch(e) {}
                  }
                  if (!obsText) return null;
                  return (
                    <div style={{fontSize: '13px'}}>
                      <strong style={{color: 'var(--text2)', display: 'block', marginBottom: '4px'}}>Observações Técnicas do Relatório:</strong>
                      <div style={{background: 'var(--body-bg)', padding: '12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', fontStyle: 'italic', color: 'var(--text2)', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap'}}>
                        {obsText}
                      </div>
                    </div>
                  );
                })()}
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
    )}

      {/* ABA 2: AUDITORIA TÉCNICA AUTOMATIZADA */}
      {activeTab === 'auditoria' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '24px', marginBottom: '20px' }}>
          
          {/* Alerta Resiliente de Banco de Dados */}
          {sqlMissingError && (
            <div className="alert alert-err" style={{ borderLeft: '6px solid var(--red)', padding: '16px', marginBottom: '24px', background: 'rgba(239, 68, 68, 0.1)' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <div>
                  <strong style={{ fontSize: '15px', display: 'block', marginBottom: '6px', color: 'var(--red)' }}>Configuração Necessária no Banco de Dados (Supabase)</strong>
                  <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
                    Para habilitar a gravação das auditorias técnicas, a tabela <code>process_checklists</code> precisa ser criada no Supabase. Execute o script SQL abaixo no painel de administração do seu Supabase (SQL Editor) e depois atualize esta página:
                  </span>
                  <pre style={{ background: '#111', color: '#22c55e', padding: '12px', borderRadius: '4px', marginTop: '10px', fontSize: '12px', overflowX: 'auto', border: '1px solid #333' }}>
{`CREATE TABLE IF NOT EXISTS public.process_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  checklist_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT process_checklists_process_id_key UNIQUE (process_id)
);

ALTER TABLE public.process_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para usuários autenticados" 
ON public.process_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);`}
                  </pre>
                  <button 
                    className="btn btn-outline btn-sm" 
                    style={{ marginTop: '10px', fontSize: '11px' }} 
                    onClick={() => {
                      navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS public.process_checklists (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,\n  checklist_data jsonb NOT NULL,\n  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,\n  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,\n  CONSTRAINT process_checklists_process_id_key UNIQUE (process_id)\n);\n\nALTER TABLE public.process_checklists ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Permitir tudo para usuários autenticados" \nON public.process_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);`);
                      alert('Código SQL copiado para a área de transferência!');
                    }}
                  >
                    📋 Copiar SQL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Seletores de Modalidade */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)', display: 'block', marginBottom: '10px' }}>
              Selecione a Modalidade de Licenciamento:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className={`btn ${checklistType === 'residencial' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setChecklistType('residencial')}
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
              >
                🏠 Licenciamento Residencial
              </button>
              <button 
                type="button"
                className={`btn ${checklistType === 'comercial' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setChecklistType('comercial')}
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
              >
                🏢 Licenciamento Comercial
              </button>
              <button 
                type="button"
                className="btn btn-outline"
                disabled
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px', opacity: 0.5, cursor: 'not-allowed' }}
              >
                🏢 Condomínio (Em breve)
              </button>
              <button 
                type="button"
                className="btn btn-outline"
                disabled
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px', opacity: 0.5, cursor: 'not-allowed' }}
              >
                📐 Loteamento (Em breve)
              </button>
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Seção 1: Verificação da Licença Ambiental */}
          <div style={{ background: 'var(--body-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🌱 1. Licença Ambiental do Processo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <input 
                  type="checkbox" 
                  checked={checklistData.documentos.existe_lic_ambient === 'sim'}
                  onChange={e => {
                    const checked = e.target.checked;
                    const newDocs = { 
                      ...checklistData.documentos, 
                      existe_lic_ambient: checked ? 'sim' : 'nao' 
                    };
                    setChecklistData({ ...checklistData, documentos: newDocs });
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--green)' }}
                />
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>
                  Este processo possui Licença Ambiental emitida
                </span>
              </label>

              {/* Se possuir Licença Ambiental, exibe apenas os arquivos anexados com suporte a seleção múltipla */}
              {checklistData.documentos.existe_lic_ambient === 'sim' && (
                <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '8px' }}>
                  <label style={{ fontWeight: '600', fontSize: '12px', marginBottom: '8px', display: 'block', color: 'var(--text1)' }}>
                    📁 Anexar Licenças Ambientais Emitidas (Múltiplos PDFs)
                  </label>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {(checklistData.documentos.lic_ambient_files || []).map((file, idx) => {
                      const isLocal = !file.url;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '4px', border: `1px dashed ${isLocal ? 'var(--green)' : 'var(--blue)'}`, background: isLocal ? 'rgba(34, 197, 94, 0.05)' : 'rgba(59, 130, 246, 0.05)' }}>
                          <span style={{ fontSize: '11px', fontWeight: '600', color: isLocal ? 'var(--green)' : 'var(--blue)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '400px' }} title={file.name}>
                            📄 {file.name} {isLocal ? '(Pronto para salvar)' : '(Salvo)'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {file.url && (
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--blue)', fontSize: '12px', cursor: 'pointer' }}
                                title="Visualizar Licença"
                              >
                                👁️
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveLicAmbientFile(idx)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remover Licença"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!checklistData.documentos.lic_ambient_files || checklistData.documentos.lic_ambient_files.length === 0) && (
                      <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic', margin: '4px 0' }}>
                        Nenhum arquivo de licença ambiental anexado ainda.
                      </p>
                    )}
                  </div>

                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    📁 Anexar Arquivos (PDF)
                    <input 
                      type="file" 
                      accept=".pdf"
                      multiple
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleAddLicAmbientFiles(e.target.files);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Seção 2: Conferência Geral de Documentação & Uploads */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: 'var(--text1)' }}>
              📋 2. Conferência de Documentação & Anexos
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
              Defina o status de cada documento. Anexar um arquivo PDF define o status como "Apresentado" automaticamente.
            </p>

            {/* Seletor de Tipo de Requerente (PF ou PJ) */}
            <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '20px' }}>
              <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '8px', color: 'var(--text1)' }}>
                👤 Tipo de Requerente do Processo:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRequerenteType('pf')}
                  className={`btn ${requerenteType === 'pf' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  👤 Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  onClick={() => setRequerenteType('pj')}
                  className={`btn ${requerenteType === 'pj' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  🏢 Pessoa Jurídica (PJ)
                </button>
                {requerenteType && (
                  <button
                    type="button"
                    onClick={() => setRequerenteType(null)}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', borderColor: 'var(--red)', color: 'var(--red)' }}
                  >
                    🔄 Limpar Escolha
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px', marginBottom: 0 }}>
                {requerenteType === 'pf' && 'Exibindo apenas a documentação de Pessoa Física (PF).'}
                {requerenteType === 'pj' && 'Exibindo apenas a documentação de Pessoa Jurídica (PJ).'}
                {!requerenteType && 'Selecione uma opção para filtrar a documentação específica. Atualmente exibindo ambas.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 2.1 Posse do Terreno */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--blue)', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                  2.1) DOCUMENTOS DE POSSE DO TERRENO
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { key: 'protocolo', label: 'Protocolo' },
                    { key: 'bci', label: 'Boletim de Cadastro Imobiliário (BCI)' },
                    { key: 'identificacao_proprietario', label: 'Documento oficial de identificação do proprietário com foto' },
                    { key: 'cnd', label: 'Certidão Negativa de Débitos (CND)' },
                    { key: 'art_projeto', label: 'ART/RRT de Projeto' },
                    { key: 'inteiro_teor', label: 'Certidão de Inteiro Teor / Escritura' },
                    { key: 'art_execucao', label: 'ART/RRT de Execução (deve ser de Execução)' },
                    { key: 'contrato_compra_venda', label: 'Contrato de compra/venda ou promessa de compra/venda (anexe a certidão de Inteiro Teor)' }
                  ].map(doc => {
                    const status = checklistData.documentos[doc.key]?.status || 'ausente';
                    const isUploadedLocal = !!uploadedFiles[doc.key];
                    const hasPersistedUrl = !!checklistData.documentos[doc.key]?.url;
                    const fileName = uploadedFiles[doc.key]?.name || checklistData.documentos[doc.key]?.name;
                    const fileUrl = checklistData.documentos[doc.key]?.url;

                    return (
                      <div key={doc.key} style={{ display: 'grid', gridTemplateColumns: '1fr 230px 220px', gap: '12px', alignItems: 'center', padding: '8px', background: 'var(--body-bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text1)' }}>• {doc.label}</span>
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button 
                            type="button"
                            className={`btn btn-xs ${status === 'ausente' ? 'btn-danger' : 'btn-outline'}`}
                            onClick={() => {
                              const newDocs = { ...checklistData.documentos };
                              newDocs[doc.key].status = 'ausente';
                              setChecklistData({ ...checklistData, documentos: newDocs });
                            }}
                            style={{ padding: '2px 6px', fontSize: '9px', height: '22px', borderRadius: '4px' }}
                          >
                            Ausente
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${status === 'nsapl' ? 'btn-outline' : 'btn-outline'}`}
                            onClick={() => {
                              const newDocs = { ...checklistData.documentos };
                              newDocs[doc.key].status = 'nsapl';
                              setChecklistData({ ...checklistData, documentos: newDocs });
                            }}
                            style={{ 
                              padding: '2px 6px', 
                              fontSize: '9px', 
                              height: '22px', 
                              borderRadius: '4px',
                              background: status === 'nsapl' ? 'rgba(107, 114, 128, 0.2)' : 'transparent',
                              color: status === 'nsapl' ? 'var(--text1)' : 'var(--text2)',
                              borderColor: status === 'nsapl' ? 'var(--border)' : 'var(--border)'
                            }}
                          >
                            NSAPL
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${status === 'apresentado' ? 'btn-success' : 'btn-outline'}`}
                            onClick={() => {
                              const newDocs = { ...checklistData.documentos };
                              newDocs[doc.key].status = 'apresentado';
                              setChecklistData({ ...checklistData, documentos: newDocs });
                            }}
                            style={{ padding: '2px 6px', fontSize: '9px', height: '22px', borderRadius: '4px' }}
                          >
                            Apresentado
                          </button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {fileName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isUploadedLocal ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)', padding: '2px 8px', borderRadius: '4px', border: `1px dashed ${isUploadedLocal ? 'var(--green)' : 'var(--blue)'}`, width: '100%', justifyContent: 'space-between' }}>
                              <span 
                                style={{ 
                                  fontSize: '10px', 
                                  color: isUploadedLocal ? 'var(--green)' : 'var(--blue)', 
                                  fontWeight: '600', 
                                  textOverflow: 'ellipsis', 
                                  overflow: 'hidden', 
                                  whiteSpace: 'nowrap', 
                                  maxWidth: '120px' 
                                }} 
                                title={`${fileName} ${isUploadedLocal ? '(Pronto para salvar)' : '(Salvo)'}`}
                              >
                                📄 {fileName}
                              </span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {hasPersistedUrl && (
                                  <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--blue)', padding: '2px', cursor: 'pointer' }}
                                    title="Visualizar PDF"
                                  >
                                    👁️
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(doc.key)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}
                                  title="Remover anexo"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, padding: '2px 8px', fontSize: '10px', height: '24px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              📁 Anexar PDF
                              <input 
                                type="file"
                                accept=".pdf"
                                onChange={e => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setUploadedFiles(prev => ({ ...prev, [doc.key]: file }));
                                    const newDocs = { ...checklistData.documentos };
                                    newDocs[doc.key].status = 'apresentado';
                                    newDocs[doc.key].name = file.name;
                                    setChecklistData(prev => ({ ...prev, documentos: newDocs }));
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2.2 Pessoa Física */}
              {(requerenteType === 'pf' || requerenteType === null) && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--blue)', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                    2.2) PESSOA FÍSICA
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'pf_identificacao', label: 'Documento oficial de identificação do proprietário com foto' },
                      { key: 'pf_procurador', label: 'Documento oficial de identificação do procurador com foto, quando for o caso' },
                      { key: 'pf_procuracao', label: 'Procuração com firma reconhecida em cartório' }
                    ].map(doc => {
                      const status = checklistData.documentos[doc.key]?.status || 'ausente';
                      const isUploadedLocal = !!uploadedFiles[doc.key];
                      const hasPersistedUrl = !!checklistData.documentos[doc.key]?.url;
                      const fileName = uploadedFiles[doc.key]?.name || checklistData.documentos[doc.key]?.name;
                      const fileUrl = checklistData.documentos[doc.key]?.url;

                      return (
                        <div key={doc.key} style={{ display: 'grid', gridTemplateColumns: '1fr 230px 220px', gap: '12px', alignItems: 'center', padding: '8px', background: 'var(--body-bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text1)' }}>• {doc.label}</span>
                          
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              type="button"
                              className={`btn btn-xs ${status === 'ausente' ? 'btn-danger' : 'btn-outline'}`}
                              onClick={() => {
                                const newDocs = { ...checklistData.documentos };
                                newDocs[doc.key].status = 'ausente';
                                setChecklistData({ ...checklistData, documentos: newDocs });
                              }}
                              style={{ padding: '2px 6px', fontSize: '9px', height: '22px', borderRadius: '4px' }}
                            >
                              Ausente
                            </button>
                            <button 
                              type="button"
                              className={`btn btn-xs ${status === 'nsapl' ? 'btn-outline' : 'btn-outline'}`}
                              onClick={() => {
                                const newDocs = { ...checklistData.documentos };
                                newDocs[doc.key].status = 'nsapl';
                                setChecklistData({ ...checklistData, documentos: newDocs });
                              }}
                              style={{ 
                                padding: '2px 6px', 
                                fontSize: '9px', 
                                height: '22px', 
                                borderRadius: '4px',
                                background: status === 'nsapl' ? 'rgba(107, 114, 128, 0.2)' : 'transparent',
                                color: status === 'nsapl' ? 'var(--text1)' : 'var(--text2)',
                                borderColor: status === 'nsapl' ? 'var(--border)' : 'var(--border)'
                              }}
                            >
                              NSAPL
                            </button>
                            <button 
                              type="button"
                              className={`btn btn-xs ${status === 'apresentado' ? 'btn-success' : 'btn-outline'}`}
                              onClick={() => {
                                const newDocs = { ...checklistData.documentos };
                                newDocs[doc.key].status = 'apresentado';
                                setChecklistData({ ...checklistData, documentos: newDocs });
                              }}
                              style={{ padding: '2px 6px', fontSize: '9px', height: '22px', borderRadius: '4px' }}
                            >
                              Apresentado
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {fileName ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isUploadedLocal ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)', padding: '2px 8px', borderRadius: '4px', border: `1px dashed ${isUploadedLocal ? 'var(--green)' : 'var(--blue)'}`, width: '100%', justifyContent: 'space-between' }}>
                                <span 
                                  style={{ 
                                    fontSize: '10px', 
                                    color: isUploadedLocal ? 'var(--green)' : 'var(--blue)', 
                                    fontWeight: '600', 
                                    textOverflow: 'ellipsis', 
                                    overflow: 'hidden', 
                                    whiteSpace: 'nowrap', 
                                    maxWidth: '120px' 
                                  }} 
                                  title={`${fileName} ${isUploadedLocal ? '(Pronto para salvar)' : '(Salvo)'}`}
                                >
                                  📄 {fileName}
                                </span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {hasPersistedUrl && (
                                    <a 
                                      href={fileUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--blue)', padding: '2px', cursor: 'pointer' }}
                                      title="Visualizar PDF"
                                    >
                                      👁️
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(doc.key)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}
                                    title="Remover anexo"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, padding: '2px 8px', fontSize: '10px', height: '24px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                📁 Anexar PDF
                                <input 
                                  type="file"
                                  accept=".pdf"
                                  onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      setUploadedFiles(prev => ({ ...prev, [doc.key]: file }));
                                      const newDocs = { ...checklistData.documentos };
                                      newDocs[doc.key].status = 'apresentado';
                                      newDocs[doc.key].name = file.name;
                                      setChecklistData(prev => ({ ...prev, documentos: newDocs }));
                                    }
                                  }}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2.3 Pessoa Jurídica */}
              {(requerenteType === 'pj' || requerenteType === null) && (
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--blue)', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                    2.3) PESSOA JURÍDICA
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { key: 'pj_contrato_social', label: 'Contrato Social (cópia conferida com a original)' },
                      { key: 'pj_cnpj', label: 'Cartão de CNPJ' },
                      { key: 'pj_anuencia_socios', label: 'Anuência dos sócios com assinatura de confirmação' },
                      { key: 'pj_identificacao_representante', label: 'RG/CPF ou Habilitação do representante pela Pessoa Jurídica' }
                    ].map(doc => {
                      const status = checklistData.documentos[doc.key]?.status || 'nsapl';
                      const isUploadedLocal = !!uploadedFiles[doc.key];
                      const hasPersistedUrl = !!checklistData.documentos[doc.key]?.url;
                      const fileName = uploadedFiles[doc.key]?.name || checklistData.documentos[doc.key]?.name;
                      const fileUrl = checklistData.documentos[doc.key]?.url;

                      return (
                        <div key={doc.key} style={{ display: 'grid', gridTemplateColumns: '1fr 230px 220px', gap: '12px', alignItems: 'center', padding: '8px', background: 'var(--body-bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text1)' }}>• {doc.label}</span>
                          
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              type="button"
                              className={`btn btn-xs ${status === 'ausente' ? 'btn-danger' : 'btn-outline'}`}
                              onClick={() => {
                                const newDocs = { ...checklistData.documentos };
                                newDocs[doc.key].status = 'ausente';
                                setChecklistData({ ...checklistData, documentos: newDocs });
                              }}
                              style={{ padding: '2px 6px', fontSize: '9px', height: '22px', borderRadius: '4px' }}
                            >
                              Ausente
                            </button>
                            <button 
                              type="button"
                              className={`btn btn-xs ${status === 'nsapl' ? 'btn-outline' : 'btn-outline'}`}
                              onClick={() => {
                                const newDocs = { ...checklistData.documentos };
                                newDocs[doc.key].status = 'nsapl';
                                setChecklistData({ ...checklistData, documentos: newDocs });
                              }}
                              style={{ 
                                padding: '2px 6px', 
                                fontSize: '9px', 
                                height: '22px', 
                                borderRadius: '4px',
                                background: status === 'nsapl' ? 'rgba(107, 114, 128, 0.2)' : 'transparent',
                                color: status === 'nsapl' ? 'var(--text1)' : 'var(--text2)',
                                borderColor: status === 'nsapl' ? 'var(--border)' : 'var(--border)'
                              }}
                            >
                              NSAPL
                            </button>
                            <button 
                              type="button"
                              className={`btn btn-xs ${status === 'apresentado' ? 'btn-success' : 'btn-outline'}`}
                              onClick={() => {
                                const newDocs = { ...checklistData.documentos };
                                newDocs[doc.key].status = 'apresentado';
                                setChecklistData({ ...checklistData, documentos: newDocs });
                              }}
                              style={{ padding: '2px 6px', fontSize: '9px', height: '22px', borderRadius: '4px' }}
                            >
                              Apresentado
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {fileName ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isUploadedLocal ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)', padding: '2px 8px', borderRadius: '4px', border: `1px dashed ${isUploadedLocal ? 'var(--green)' : 'var(--blue)'}`, width: '100%', justifyContent: 'space-between' }}>
                                <span 
                                  style={{ 
                                    fontSize: '10px', 
                                    color: isUploadedLocal ? 'var(--green)' : 'var(--blue)', 
                                    fontWeight: '600', 
                                    textOverflow: 'ellipsis', 
                                    overflow: 'hidden', 
                                    whiteSpace: 'nowrap', 
                                    maxWidth: '120px' 
                                  }} 
                                  title={`${fileName} ${isUploadedLocal ? '(Pronto para salvar)' : '(Salvo)'}`}
                                >
                                  📄 {fileName}
                                </span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {hasPersistedUrl && (
                                    <a 
                                      href={fileUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'var(--blue)', padding: '2px', cursor: 'pointer' }}
                                      title="Visualizar PDF"
                                    >
                                      👁️
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(doc.key)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '10px', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}
                                    title="Remover anexo"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', margin: 0, padding: '2px 8px', fontSize: '10px', height: '24px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                📁 Anexar PDF
                                <input 
                                  type="file"
                                  accept=".pdf"
                                  onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      setUploadedFiles(prev => ({ ...prev, [doc.key]: file }));
                                      const newDocs = { ...checklistData.documentos };
                                      newDocs[doc.key].status = 'apresentado';
                                      newDocs[doc.key].name = file.name;
                                      setChecklistData(prev => ({ ...prev, documentos: newDocs }));
                                    }
                                  }}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-success" 
                onClick={handleRunAuditoria} 
                disabled={extractionLoading}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {extractionLoading ? '⌛ Extraindo textos e rodando IA...' : '🤖 Iniciar Auditoria Automatizada'}
              </button>
              {extractionProgress && (
                <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: '500' }}>
                  {extractionProgress}
                </span>
              )}
            </div>
          </div>


          {/* Seção 4: Tabela de Confrontação de Dados (Imagem 2.2) */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 3. Análise da Certidão de Inteiro Teor/Escritura, BCI, ART/RRT, PROJETO LIC. AMBIENTAL
            </h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                <input 
                  type="checkbox" 
                  checked={checklistData.consistencia_verificada || false}
                  onChange={e => {
                    setChecklistData({ ...checklistData, consistencia_verificada: e.target.checked });
                  }}
                  style={{ width: '16px', height: '16px' }}
                />
                Verificar se os dados de lote, quadra e loteamento/bairro são consistentes com as informações contidas no BCI, ART/RRT e nos projetos.
              </label>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                <thead>
                  <tr style={{ background: 'var(--body-bg)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>PARÂMETRO</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>CERTIDÃO</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>BCI</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>ART/RRT - PROJETO</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>ART/RRT - EXECUÇÃO</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>PROJETO</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>LIC. AMBIENT.</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>CND</th>
                    <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: 'var(--text2)', borderRight: '1px solid var(--border)', width: '90px' }}>SITUAÇÃO</th>
                    <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: 'var(--text2)' }}>OBS</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'LOTE', key: 'lote' },
                    { label: 'QUADRA', key: 'quadra' },
                    { label: 'LOTEAMENTO', key: 'loteamento' },
                    { label: 'BAIRRO', key: 'bairro' },
                    { label: 'AREA TERRENO', key: 'area_terreno' },
                    { label: 'AREA CONST.', key: 'area_const' },
                    { label: 'REQUERENTE', key: 'requerente' },
                    { label: 'ENDEREÇO', key: 'endereco' }
                  ].map((row, idx) => {
                    const c = checklistData.confrontacao;
                    const certidaoVal = c[`${row.key}_certidao`] || '';
                    const bciVal = c[`${row.key}_bci`] || '';
                    const artProjVal = c[`${row.key}_art_projeto`] || '';
                    const artExecVal = c[`${row.key}_art_execucao`] || '';
                    const projVal = c[`${row.key}_projeto`] || '';
                    const licVal = c[`${row.key}_lic_ambient`] || '';
                    const cndVal = c[`${row.key}_cnd`] || '';
                    const obsVal = c[`${row.key}_obs`] || '';
                    
                    const statusDiv = checkDivergencia(certidaoVal, bciVal, artProjVal, artExecVal, projVal, licVal, cndVal);

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: statusDiv === 'divergente' ? 'rgba(239, 68, 68, 0.04)' : idx % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--text2)', borderRight: '1px solid var(--border)', background: 'var(--body-bg)' }}>{row.label}</td>
                        {[
                          { col: 'certidao', val: certidaoVal },
                          { col: 'bci', val: bciVal },
                          { col: 'art_projeto', val: artProjVal },
                          { col: 'art_execucao', val: artExecVal },
                          { col: 'projeto', val: projVal },
                          { col: 'lic_ambient', val: licVal },
                          { col: 'cnd', val: cndVal }
                        ].map(cell => (
                          <td key={cell.col} style={{ padding: '2px', borderRight: '1px solid var(--border)' }}>
                            <input 
                              type="text" 
                              value={cell.val} 
                              onChange={e => {
                                const newConf = { ...checklistData.confrontacao, [`${row.key}_${cell.col}`]: e.target.value };
                                setChecklistData({ ...checklistData, confrontacao: newConf });
                              }}
                              style={{ width: '100%', padding: '4px', border: 'none', background: 'transparent', color: 'var(--text1)', fontSize: '10px' }}
                              placeholder="-"
                            />
                          </td>
                        ))}
                        <td style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                          {statusDiv === 'divergente' && (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', fontSize: '9px', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>DIVERGENTE</span>
                          )}
                          {statusDiv === 'conforme' && (
                            <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)', fontSize: '9px', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>CONFORME</span>
                          )}
                          {(statusDiv === 'empty' || statusDiv === 'single') && (
                            <span style={{ color: 'var(--text3)', fontSize: '11px' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input 
                              type="text" 
                              value={obsVal} 
                              onChange={e => {
                                const newConf = { ...checklistData.confrontacao, [`${row.key}_obs`]: e.target.value };
                                setChecklistData({ ...checklistData, confrontacao: newConf });
                              }}
                              style={{ flex: 1, padding: '4px', border: 'none', background: 'transparent', color: 'var(--text2)', fontSize: '10px' }}
                              placeholder="..."
                              title={obsVal}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setActiveObsKey(row.key);
                                setTempObsVal(obsVal);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text3)',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                              title="Editar observação detalhada"
                            >
                              💬
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          {/* Seção 5: Checklist Técnico Adaptativo (Zoneamento e Parâmetros) */}
          {/* Seção 4: Análise do Projeto Arquitetônico (Apenas no Residencial) */}
          {checklistType === 'residencial' && (() => {
            const resEstacAreaTotal = parseFloat(checklistData.projeto_residencial?.estac_area_total_construida?.toString().replace(',', '.')) || 0;
            const resEstacDedGaragem = parseFloat(checklistData.projeto_residencial?.estac_deducao_garagem?.toString().replace(',', '.')) || 0;
            const resEstacDedTecnica = parseFloat(checklistData.projeto_residencial?.estac_deducao_tecnica?.toString().replace(',', '.')) || 0;
            const resEstacDedCirculacao = parseFloat(checklistData.projeto_residencial?.estac_deducao_circulacao?.toString().replace(',', '.')) || 0;
            const resEstacDedLazer = parseFloat(checklistData.projeto_residencial?.estac_deducao_lazer?.toString().replace(',', '.')) || 0;
            const resEstacDedFachadaAtiva = parseFloat(checklistData.projeto_residencial?.estac_deducao_fachada_ativa?.toString().replace(',', '.')) || 0;

            const resEstacTotalNaoComputavel = resEstacDedGaragem + resEstacDedTecnica + resEstacDedCirculacao + resEstacDedLazer + resEstacDedFachadaAtiva;
            const resEstacAreaComputavel = Math.max(0, resEstacAreaTotal - resEstacTotalNaoComputavel);
            const resEstacVagasExigidas = resEstacAreaComputavel > 500 ? Math.ceil((resEstacAreaComputavel - 500) / 50) : 0;
            const resEstacVagasProjeto = parseInt(checklistData.projeto_residencial?.estac_vagas_projeto) || 0;
            const resEstacIsento = resEstacVagasExigidas === 0;
            const resEstacConforme = resEstacVagasProjeto >= resEstacVagasExigidas;

            return (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--text1)' }}>
                  📐 4. Análise do Projeto Arquitetônico
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                
                {/* BLOCO A: Zoneamento */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    🗺️ 1. Zoneamento e Parâmetros Gerais
                  </strong>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Zona KMZ:</span>
                      <select
                        value={checklistData.projeto_residencial?.zona_kmz || ''}
                        onChange={e => {
                          const zonaKey = e.target.value;
                          const zonaInfo = ZONAS_ANEXO13[zonaKey];
                          const newRes = { 
                            ...checklistData.projeto_residencial, 
                            zona_kmz: zonaKey 
                          };
                          
                          if (zonaInfo) {
                            newRes.tsn_taxa_anexo13 = zonaInfo.tsn;
                            const terrenoTSN = newRes.tsn_area_terreno || '';
                            const projetoTSN = newRes.tsn_area_projeto || '';
                            newRes.tsn_resultado = calcTsnResultado(terrenoTSN, projetoTSN, zonaInfo.tsn);
                            
                            const caProj = newRes.ca_projeto || '';
                            newRes.ca_resultado = calcCaResultado(caProj, zonaKey);
                          } else {
                            newRes.tsn_resultado = 'AGUARDANDO';
                            newRes.ca_resultado = 'AGUARDANDO';
                          }
                          
                          setChecklistData({ ...checklistData, projeto_residencial: newRes });
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text1)' }}
                      >
                        <option value="">Selecione a Zona...</option>
                        {Object.keys(ZONAS_ANEXO13).map(key => (
                          <option key={key} value={key}>{ZONAS_ANEXO13[key].nome}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Nº Pavimentos:</span>
                      <input 
                        type="number" 
                        value={checklistData.projeto_residencial?.num_pavimentos || ''}
                        onChange={e => setChecklistData({
                          ...checklistData,
                          projeto_residencial: { ...checklistData.projeto_residencial, num_pavimentos: e.target.value }
                        })}
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    {checklistData.projeto_residencial?.zona_kmz && (
                      <div style={{ background: 'var(--body-bg)', padding: '8px', borderRadius: '4px', borderLeft: `4px solid ${ZONAS_ANEXO13[checklistData.projeto_residencial.zona_kmz].cor}`, fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>TSN Mínima:</strong> {ZONAS_ANEXO13[checklistData.projeto_residencial.zona_kmz].tsn}%</div>
                        <div><strong>CA Básico:</strong> {ZONAS_ANEXO13[checklistData.projeto_residencial.zona_kmz].caBasico} | <strong>CA Máximo:</strong> {ZONAS_ANEXO13[checklistData.projeto_residencial.zona_kmz].caMax === 'e' ? 'Limitado (e)' : ZONAS_ANEXO13[checklistData.projeto_residencial.zona_kmz].caMax}</div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Conferir Recuo Frontal:</span>
                      <input 
                        type="text" 
                        value={checklistData.projeto_residencial?.recuo_frontal || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, recuo_frontal: e.target.value } })}
                        placeholder="Ex: 5.00 m"
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Conferir Recuo Lateral:</span>
                      <input 
                        type="text" 
                        value={checklistData.projeto_residencial?.recuo_lateral || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, recuo_lateral: e.target.value } })}
                        placeholder="Ex: 1.50 m"
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Conferir Recuo Fundos:</span>
                      <input 
                        type="text" 
                        value={checklistData.projeto_residencial?.recuo_fundos || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, recuo_fundos: e.target.value } })}
                        placeholder="Ex: 2.00 m"
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Taxa de Ocupação (TO):</span>
                      <input 
                        type="text" 
                        value={checklistData.projeto_residencial?.taxa_ocupacao || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, taxa_ocupacao: e.target.value } })}
                        placeholder="Ex: 60%"
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Coef. Aproveitamento (CA):</span>
                      <input 
                        type="text" 
                        value={checklistData.projeto_residencial?.coef_aproveitamento || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, coef_aproveitamento: e.target.value } })}
                        placeholder="Ex: 1.2"
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <label className="fca gap8" style={{ cursor: 'pointer', marginTop: '6px' }}>
                      <input 
                        type="checkbox" 
                        checked={checklistData.projeto_residencial?.projeto_assinado || false}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, projeto_assinado: e.target.checked } })}
                      />
                      <span>Verificar Projeto Assinado</span>
                    </label>
                  </div>
                </div>

                {/* BLOCO B: Tabela de Verificação */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    📊 2. Tabela de Verificação
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                    
                    {/* TSN */}
                    <div style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
                      <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--blue)' }}>Verificar Taxa de Solo Natural (TSN)</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '6px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área do Terreno (m²):</label>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.tsn_area_terreno || ''}
                            onChange={e => {
                              const v = e.target.value;
                              const tsnProj = checklistData.projeto_residencial?.tsn_area_projeto || '';
                              const tsnMin = checklistData.projeto_residencial?.tsn_taxa_anexo13 || '';
                              const res = calcTsnResultado(v, tsnProj, tsnMin);
                              setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, tsn_area_terreno: v, tsn_resultado: res } });
                            }}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área TSN PROJETO (m²):</label>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.tsn_area_projeto || ''}
                            onChange={e => {
                              const v = e.target.value;
                              const terreno = checklistData.projeto_residencial?.tsn_area_terreno || '';
                              const tsnMin = checklistData.projeto_residencial?.tsn_taxa_anexo13 || '';
                              const res = calcTsnResultado(terreno, v, tsnMin);
                              setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, tsn_area_projeto: v, tsn_resultado: res } });
                            }}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '100%' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>TSN ANEXO 13 (%):</label>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.tsn_taxa_anexo13 || ''}
                            onChange={e => {
                              const v = e.target.value;
                              const terreno = checklistData.projeto_residencial?.tsn_area_terreno || '';
                              const tsnProj = checklistData.projeto_residencial?.tsn_area_projeto || '';
                              const res = calcTsnResultado(terreno, tsnProj, v);
                              setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, tsn_taxa_anexo13: v, tsn_resultado: res } });
                            }}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '100%' }}
                          />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: checklistData.projeto_residencial?.tsn_resultado === 'CONFORME' ? 'rgba(34, 197, 94, 0.12)' : checklistData.projeto_residencial?.tsn_resultado === 'DIVERGENTE' ? 'rgba(239, 68, 68, 0.12)' : 'var(--body-bg)', color: checklistData.projeto_residencial?.tsn_resultado === 'CONFORME' ? 'var(--green)' : checklistData.projeto_residencial?.tsn_resultado === 'DIVERGENTE' ? 'var(--red)' : 'var(--text3)' }}>
                            {checklistData.projeto_residencial?.tsn_resultado || 'AGUARDANDO'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CA */}
                    <div>
                      <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--blue)' }}>Checar Coeficiente de Aproveitamento (CA)</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '6px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área do Terreno (m²):</label>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.ca_area_terreno || ''}
                            onChange={e => {
                              const v = e.target.value;
                              const constr = checklistData.projeto_residencial?.ca_area_construida || '';
                              const calcCA = calcCaProjeto(v, constr);
                              const res = calcCaResultado(calcCA, checklistData.projeto_residencial?.zona_kmz);
                              setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, ca_area_terreno: v, ca_projeto: calcCA, ca_resultado: res } });
                            }}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área Construída (m²):</label>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.ca_area_construida || ''}
                            onChange={e => {
                              const v = e.target.value;
                              const terreno = checklistData.projeto_residencial?.ca_area_terreno || '';
                              const calcCA = calcCaProjeto(terreno, v);
                              const res = calcCaResultado(calcCA, checklistData.projeto_residencial?.zona_kmz);
                              setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, ca_area_construida: v, ca_projeto: calcCA, ca_resultado: res } });
                            }}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '100%' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>CA DO PROJETO:</label>
                          <input 
                            type="text"
                            disabled
                            value={checklistData.projeto_residencial?.ca_projeto || ''}
                            style={{ padding: '2px 6px', fontSize: '11px', width: '100%', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', color: 'var(--text1)' }}
                          />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: '14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', background: checklistData.projeto_residencial?.ca_resultado === 'CONFORME' ? 'rgba(34, 197, 94, 0.12)' : checklistData.projeto_residencial?.ca_resultado === 'INCOMPATÍVEL' ? 'rgba(239, 68, 68, 0.12)' : 'var(--body-bg)', color: checklistData.projeto_residencial?.ca_resultado === 'CONFORME' ? 'var(--green)' : checklistData.projeto_residencial?.ca_resultado === 'INCOMPATÍVEL' ? 'var(--red)' : 'var(--text3)' }}>
                            {checklistData.projeto_residencial?.ca_resultado || 'AGUARDANDO'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO C: Medidas e Confrontantes */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    📏 3. Medidas e Confrontantes
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ background: 'var(--body-bg)', padding: '8px', borderRadius: '4px', marginBottom: '4px', border: '1px solid var(--border)' }}>
                      <strong style={{ display: 'block', fontSize: '11px', marginBottom: '6px', color: 'var(--text2)' }}>Medidas do Lote vs Escritura:</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <input 
                          type="text" 
                          placeholder="Lote Projeto" 
                          value={checklistData.projeto_residencial?.medidas_lote_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, medidas_lote_projeto: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Lote Escritura/Certidão" 
                          value={checklistData.projeto_residencial?.medidas_lote_certidao || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, medidas_lote_certidao: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Confrontantes Escritura / Certidão:</label>
                      <input 
                        type="text" 
                        value={checklistData.projeto_residencial?.confrontantes_escritura || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, confrontantes_escritura: e.target.value } })}
                        placeholder="Nº da Escritura ou Certidão"
                        style={{ padding: '3px 6px', fontSize: '11px', width: '100%', marginBottom: '4px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text3)' }}>Frente:</label>
                        <input 
                          type="text" 
                          value={checklistData.projeto_residencial?.confrontantes_frente || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, confrontantes_frente: e.target.value } })}
                          placeholder="Confrontantes Frente"
                          style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text3)' }}>Fundos:</label>
                        <input 
                          type="text" 
                          value={checklistData.projeto_residencial?.confrontantes_fundos || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, confrontantes_fundos: e.target.value } })}
                          placeholder="Confrontantes Fundos"
                          style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text3)' }}>Lado Direito:</label>
                        <input 
                          type="text" 
                          value={checklistData.projeto_residencial?.confrontantes_direito || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, confrontantes_direito: e.target.value } })}
                          placeholder="Lado Direito"
                          style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '9px', color: 'var(--text3)' }}>Lado Esquerdo:</label>
                        <input 
                          type="text" 
                          value={checklistData.projeto_residencial?.confrontantes_esquerdo || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, confrontantes_esquerdo: e.target.value } })}
                          placeholder="Lado Esquerdo"
                          style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO D: Uso Comum & Áreas Molhadas */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    🏢 4. Uso Comum & Áreas Molhadas
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Área de uso comum restrita a projetos multifamiliares:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'sim', label: 'SIM' },
                          { val: 'nsapl', label: 'NSAPL' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, area_comum_multifamiliar: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.area_comum_multifamiliar === opt.val ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              color: checklistData.projeto_residencial?.area_comum_multifamiliar === opt.val ? 'var(--blue)' : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.area_comum_multifamiliar === opt.val ? 'var(--blue)' : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Verificar revestimento cerâmico ou equivalente em áreas molhadas:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'sim', label: 'Cerâmico SIM' },
                          { val: 'nao', label: 'Cerâmico NÃO' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, revestimento_ceramico: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.revestimento_ceramico === opt.val ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              color: checklistData.projeto_residencial?.revestimento_ceramico === opt.val ? 'var(--blue)' : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.revestimento_ceramico === opt.val ? 'var(--blue)' : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tinta impermeável aplicada nas áreas adequadas:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'sim', label: 'Impermeável SIM' },
                          { val: 'nao', label: 'Impermeável NÃO' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, tinta_impermeavel: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.tinta_impermeavel === opt.val ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              color: checklistData.projeto_residencial?.tinta_impermeavel === opt.val ? 'var(--blue)' : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.tinta_impermeavel === opt.val ? 'var(--blue)' : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO E: Acessibilidade */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    ♿ 5. Acessibilidade
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Verificar a presença de piso tátil:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'sim', label: 'SIM' },
                          { val: 'nao', label: 'NÃO' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, piso_tatil: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.piso_tatil === opt.val ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              color: checklistData.projeto_residencial?.piso_tatil === opt.val ? 'var(--blue)' : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.piso_tatil === opt.val ? 'var(--blue)' : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO F: Ventilação & Afastamentos */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    💨 6. Afastamentos e Prisma de Ventilação
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Janelas voltadas para lotes vizinhos (Afastamento mínimo de 1.5 m):</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Distância lote vizinho (m):</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_residencial?.distancia_lote_vizinho || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, distancia_lote_vizinho: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                      <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--blue)' }}>Prisma de ventilação (Art. 13 - L = 1/3 * H)</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Altura da edificação H (m):</label>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.prisma_altura_h || ''}
                            onChange={e => {
                              const h = e.target.value;
                              const res = h ? (parseFloat(h) / 3).toFixed(2) + ' m' : '';
                              setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, prisma_altura_h: h, prisma_resultado: res } });
                            }}
                            style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'var(--text3)' }}>L (Resultado):</label>
                          <input 
                            type="text"
                            disabled
                            value={checklistData.projeto_residencial?.prisma_resultado || ''}
                            style={{ padding: '3px 6px', fontSize: '11px', width: '100%', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', color: 'var(--text1)' }}
                          />
                        </div>
                      </div>

                      {/* Caixa de informações legais com ícone (i) */}
                      <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '4px', color: 'var(--text2)', fontSize: '11px', lineHeight: '1.4' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '14px' }}>ℹ️</span>
                          <div>
                            <p style={{ margin: '0 0 6px 0' }}>O <strong>§ 3º</strong> do Art. 13 estabelece: <em>"Os vãos de iluminação e ventilação deverão obedecer à distância mínima de 1,50 m (um metro e cinquenta centímetros) das divisas do lote."</em></p>
                            <p style={{ margin: 0 }}>O <strong>§ 1º</strong> determina: <em>"O prisma de ventilação e iluminação poderá ter formato retangular, desde que o seu lado menor seja igual a 70% de L e a área resultante seja igual à calculada."</em></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO G: Áreas Arborizadas */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    🌳 7. Áreas Arborizadas do Imóvel
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: 'var(--text3)' }}>
                      Implantar arborização na calçada adjacente ao imóvel, mantendo a proporção de 01 (uma) árvore para cada 6 m de testada do imóvel.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Testada Total (m):</span>
                      <input 
                        type="number"
                        value={checklistData.projeto_residencial?.testada_total || ''}
                        onChange={e => {
                          const testada = e.target.value;
                          const arv = testada ? Math.ceil(parseFloat(testada) / 6).toString() : '';
                          setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, testada_total: testada, qtd_arvores: arv } });
                        }}
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Quantidade de Árvores:</span>
                      <input 
                        type="text"
                        disabled
                        value={checklistData.projeto_residencial?.qtd_arvores || ''}
                        style={{ padding: '3px 6px', fontSize: '11px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--blue)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* BLOCO H: Análise de Drenagem */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    🌊 8. Análise de Drenagem
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Área Alagável:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'sim', label: 'SIM' },
                          { val: 'nao', label: 'NÃO' },
                          { val: 'nsapl', label: 'NSAPL' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, drenagem_alagavel: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.drenagem_alagavel === opt.val ? (opt.val === 'sim' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)') : 'transparent',
                              color: checklistData.projeto_residencial?.drenagem_alagavel === opt.val ? (opt.val === 'sim' ? 'var(--red)' : 'var(--blue)') : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.drenagem_alagavel === opt.val ? (opt.val === 'sim' ? 'var(--red)' : 'var(--blue)') : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Área de Risco:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'sim', label: 'SIM' },
                          { val: 'nao', label: 'NÃO' },
                          { val: 'nsapl', label: 'NSAPL' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, drenagem_risco: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.drenagem_risco === opt.val ? (opt.val === 'sim' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)') : 'transparent',
                              color: checklistData.projeto_residencial?.drenagem_risco === opt.val ? (opt.val === 'sim' ? 'var(--red)' : 'var(--blue)') : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.drenagem_risco === opt.val ? (opt.val === 'sim' ? 'var(--red)' : 'var(--blue)') : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span>Distân. Riachos/Lagoas (m):</span>
                      <input 
                        type="number"
                        placeholder="Min 30 m"
                        value={checklistData.projeto_residencial?.drenagem_distancia_riacho || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, drenagem_distancia_riacho: e.target.value } })}
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>
                    {checklistData.projeto_residencial?.drenagem_distancia_riacho !== '' && parseFloat(checklistData.projeto_residencial?.drenagem_distancia_riacho) < 30 && (
                      <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: 'var(--red)', fontSize: '10px', fontWeight: '500', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        ⚠️ <strong>ATENÇÃO MÁXIMA:</strong> Distância menor que 30 m! Requer verificação adicional.
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Distân. Canais/Talvegues (m):</span>
                      <input 
                        type="number"
                        placeholder="Min 10 m"
                        value={checklistData.projeto_residencial?.drenagem_distancia_canal || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, drenagem_distancia_canal: e.target.value } })}
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>
                    {checklistData.projeto_residencial?.drenagem_distancia_canal !== '' && parseFloat(checklistData.projeto_residencial?.drenagem_distancia_canal) < 10 && (
                      <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: 'var(--red)', fontSize: '10px', fontWeight: '500', display: 'flex', gap: '4px', alignItems: 'center' }}>
                        ⚠️ <strong>ATENÇÃO MÁXIMA:</strong> Distância menor que 10 m! Requer verificação adicional.
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOCO I: Verificação da ART/RRT */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    📋 9. Verificação da ART/RRT
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div>
                      <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Atividade técnica descrita no conselho:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { val: 'corresponde', label: 'CORRESPONDE' },
                          { val: 'nao_corresponde', label: 'NÃO CORRESPONDE' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, art_rrt_atividade_corresponde: opt.val } })}
                            className="btn btn-xs"
                            style={{
                              flex: 1,
                              fontSize: '10px',
                              padding: '4px',
                              background: checklistData.projeto_residencial?.art_rrt_atividade_corresponde === opt.val ? (opt.val === 'corresponde' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'transparent',
                              color: checklistData.projeto_residencial?.art_rrt_atividade_corresponde === opt.val ? (opt.val === 'corresponde' ? 'var(--green)' : 'var(--red)') : 'var(--text2)',
                              border: `1px solid ${checklistData.projeto_residencial?.art_rrt_atividade_corresponde === opt.val ? (opt.val === 'corresponde' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--blue)' }}>Conferência de Áreas (ART vs RRT vs Projeto):</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px' }}>Área Construída ART (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.art_rrt_area_art || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, art_rrt_area_art: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px' }}>Área Construída RRT (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.art_rrt_area_rrt || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, art_rrt_area_rrt: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px' }}>Área Construída Projeto (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.art_rrt_area_projeto || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, art_rrt_area_projeto: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                      </div>

                      {(() => {
                        const areaArt = parseFloat(checklistData.projeto_residencial?.art_rrt_area_art?.toString().replace(',', '.')) || 0;
                        const areaRrt = parseFloat(checklistData.projeto_residencial?.art_rrt_area_rrt?.toString().replace(',', '.')) || 0;
                        const areaProj = parseFloat(checklistData.projeto_residencial?.art_rrt_area_projeto?.toString().replace(',', '.')) || 0;

                        const areasPreenchidas = [
                          { nome: 'ART', valor: areaArt, raw: checklistData.projeto_residencial?.art_rrt_area_art },
                          { nome: 'RRT', valor: areaRrt, raw: checklistData.projeto_residencial?.art_rrt_area_rrt },
                          { nome: 'Projeto', valor: areaProj, raw: checklistData.projeto_residencial?.art_rrt_area_projeto }
                        ].filter(item => item.raw && parseFloat(item.raw.toString().replace(',', '.')) > 0);

                        const hasAreaDivergencia = areasPreenchidas.length > 1 && !areasPreenchidas.every(item => item.valor === areasPreenchidas[0].valor);

                        if (hasAreaDivergencia) {
                          return (
                            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: 'var(--red)', fontSize: '10px', fontWeight: '500', marginTop: '6px' }}>
                              ⚠️ <strong>DIVERGÊNCIA DE ÁREA DETECTADA:</strong> As áreas informadas divergem entre si! Verifique os documentos.
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* BLOCO J: Dimensionamento de Estacionamento */}
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    🚗 10. Dimensionamento de Estacionamento (Lei 034/2022)
                  </strong>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                      <span>Área Total Construída (m²):</span>
                      <input 
                        type="number"
                        value={checklistData.projeto_residencial?.estac_area_total_construida || ''}
                        onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_area_total_construida: e.target.value } })}
                        style={{ padding: '3px 6px', fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                      <span style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: 'var(--blue)' }}>Deduções / Áreas Não Computáveis (Art. 137):</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span 
                            title="Compreende toda a área destinada à guarda de veículos (vagas), bem como as faixas de circulação, pistas de manobra e rampas de acesso veicular."
                            style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                          >
                            Estacionamento/Garagem (m²):
                          </span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.estac_deducao_garagem || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_deducao_garagem: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span 
                            title="Engloba compartimentos acessórios sem permanência humana prolongada (depósitos de material/lixo), além de áreas técnicas como casas de máquinas, barriletes, centrais de ar-condicionado e reservatórios (inferiores e superiores)."
                            style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                          >
                            Áreas Técnicas e Depósitos (m²):
                          </span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.estac_deducao_tecnica || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_deducao_tecnica: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span 
                            title="Corresponde ao somatório das áreas ocupadas por caixas de escadas, rampas de acessibilidade/pedestres e poços de elevadores, contabilizadas em todos os pavimentos por onde perpassam."
                            style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                          >
                            Circulação Vertical (m²):
                          </span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.estac_deducao_circulacao || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_deducao_circulacao: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span 
                            title="Salões de festas, jogos, academias ou áreas de convivência que sejam de uso comum do condomínio/edifício (aplicável se houver área comum de funcionários/público classificada como lazer)."
                            style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                          >
                            Lazer e Convivência (m²):
                          </span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.estac_deducao_lazer || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_deducao_lazer: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontWeight: '500' }}>Fachada Ativa no Térreo (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_residencial?.estac_deducao_fachada_ativa || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_deducao_fachada_ativa: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'rgba(0,0,0,0.01)', padding: '6px', borderRadius: '4px' }}>
                        <span>Total Não Computável: <strong>{resEstacTotalNaoComputavel.toFixed(2)} m²</strong></span>
                        <span>Área Computável Final: <strong>{resEstacAreaComputavel.toFixed(2)} m²</strong></span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Vagas Exigidas por Lei:</span>
                        <input 
                          type="text"
                          disabled
                          value={resEstacIsento ? 'ISENTO (≤ 500 m²)' : `${resEstacVagasExigidas} ${resEstacVagasExigidas === 1 ? 'vaga' : 'vagas'}`}
                          style={{ padding: '3px 6px', fontSize: '11px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--blue)' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Vagas no Projeto:</span>
                        <input 
                          type="number"
                          placeholder="Número de vagas"
                          value={checklistData.projeto_residencial?.estac_vagas_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_residencial: { ...checklistData.projeto_residencial, estac_vagas_projeto: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      {checklistData.projeto_residencial?.estac_area_total_construida !== '' && (
                        <div style={{ padding: '6px 8px', background: resEstacConforme ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${resEstacConforme ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, borderRadius: '4px', fontSize: '11px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {resEstacIsento ? 'Isento de Vagas' : `Projeto: ${resEstacVagasProjeto} de ${resEstacVagasExigidas}`}
                          </span>
                          <span style={{ fontWeight: 'bold', color: resEstacConforme ? 'var(--green)' : 'var(--red)' }}>
                            {resEstacIsento ? '✔️ ISENTO DE VAGAS' : resEstacConforme ? '✔️ CONFORME' : '❌ INSUFICIENTE'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );})()} 


          {/* Seção 4: Análise do Projeto Arquitetônico (Apenas no Comercial) */}
          {checklistType === 'comercial' && (() => {
            const comercialZona = checklistData.projeto_comercial?.zona_kmz || '';
            const comercialZonaInfo = ZONAS_ANEXO13[comercialZona] || null;
            const comercialNumPavimentos = parseInt(checklistData.projeto_comercial?.num_pavimentos) || 0;

            // Lógica de Afastamentos Comercial
            let comercialAfExigido = 0;
            let comercialAlfExigido = 0;
            let comercialAfastamentoDesc = '';

            if (comercialZona) {
              if (comercialNumPavimentos <= 2) {
                comercialAfExigido = 0;
                comercialAlfExigido = 0;
                comercialAfastamentoDesc = 'Edificações com até 02 pavimentos: Afastamento frontal predominante da quadra e laterais/fundos nulos (0m).';
              } else if (comercialNumPavimentos <= 4) {
                comercialAfExigido = 3;
                comercialAlfExigido = 2;
                comercialAfastamentoDesc = 'Edificações acima de 02 até 04 pavimentos: Afastamento frontal de 3m e laterais/fundos de 2m acima do 2º pavimento.';
              } else {
                comercialAfExigido = 5 + (comercialNumPavimentos - 4) * 0.20;
                comercialAlfExigido = 2 + (comercialNumPavimentos - 4) * 0.20;
                comercialAfastamentoDesc = `Edificações acima de 04 pavimentos: Progressivo (Art. 149). AFR = 5m + (${comercialNumPavimentos}-4) x 0,20m = ${comercialAfExigido.toFixed(2)}m. ALFR = 2m + (${comercialNumPavimentos}-4) x 0,20m = ${comercialAlfExigido.toFixed(2)}m.`;
              }
            }

            // Lógica de TSN
            const tsnMin = comercialZonaInfo ? parseFloat(comercialZonaInfo.tsn) : 0;
            const areaTerrenoTSN = parseFloat(checklistData.projeto_comercial?.tsn_area_terreno?.toString().replace(',', '.')) || 0;
            const areaProjetoTSN = parseFloat(checklistData.projeto_comercial?.tsn_area_projeto?.toString().replace(',', '.')) || 0;
            const tsnCalculada = areaTerrenoTSN > 0 ? (areaProjetoTSN / areaTerrenoTSN) * 100 : 0;
            const tsnConforme = tsnCalculada >= tsnMin;

            // Lógica de CA
            const caMaxStr = comercialZonaInfo?.caMax || '';
            const caMax = parseFloat(caMaxStr.replace(',', '.')) || 0;
            const areaTerrenoCA = parseFloat(checklistData.projeto_comercial?.ca_area_terreno?.toString().replace(',', '.')) || 0;
            const areaConstruidaCA = parseFloat(checklistData.projeto_comercial?.ca_area_construida?.toString().replace(',', '.')) || 0;
            const caCalculado = areaTerrenoCA > 0 ? (areaConstruidaCA / areaTerrenoCA) : 0;
            
            let caConforme = true;
            if (comercialZonaInfo) {
              if (caMaxStr === '-' || caMaxStr.toLowerCase() === 'e') {
                caConforme = true;
              } else if (caMax > 0) {
                caConforme = caCalculado <= caMax;
              }
            }

            // Lógica de Arborização
            const testadaComercial = parseFloat(checklistData.projeto_comercial?.testada_total?.toString().replace(',', '.')) || 0;
            const arvoresExigidasComercial = Math.ceil(testadaComercial / 6);
            const arvoresProjetoComercial = parseInt(checklistData.projeto_comercial?.qtd_arvores) || 0;

            // Lógica do Bloco 12 (Afastamentos e Prisma)
            const isPrismaNS = checklistData.projeto_comercial?.prisma_nsapl === 'NSAPL';

            // Lógica do Bloco 13 (Estacionamento)
            const estacAreaTotal = parseFloat(checklistData.projeto_comercial?.estac_area_total_construida?.toString().replace(',', '.')) || 0;
            const estacDedGaragem = parseFloat(checklistData.projeto_comercial?.estac_deducao_garagem?.toString().replace(',', '.')) || 0;
            const estacDedTecnica = parseFloat(checklistData.projeto_comercial?.estac_deducao_tecnica?.toString().replace(',', '.')) || 0;
            const estacDedCirculacao = parseFloat(checklistData.projeto_comercial?.estac_deducao_circulacao?.toString().replace(',', '.')) || 0;
            const estacDedLazer = parseFloat(checklistData.projeto_comercial?.estac_deducao_lazer?.toString().replace(',', '.')) || 0;
            const estacDedFachadaAtiva = parseFloat(checklistData.projeto_comercial?.estac_deducao_fachada_ativa?.toString().replace(',', '.')) || 0;

            const estacTotalNaoComputavel = estacDedGaragem + estacDedTecnica + estacDedCirculacao + estacDedLazer + estacDedFachadaAtiva;
            const estacAreaComputavel = Math.max(0, estacAreaTotal - estacTotalNaoComputavel);
            const estacVagasExigidas = estacAreaComputavel > 500 ? Math.ceil(estacAreaComputavel / 50) : 0;
            const estacVagasProjeto = parseInt(checklistData.projeto_comercial?.estac_vagas_projeto) || 0;
            const estacIsento = estacVagasExigidas === 0;
            const estacConforme = estacVagasProjeto >= estacVagasExigidas;

            return (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: 'var(--text1)' }}>
                  📐 3. Análise do Projeto Arquitetônico (Comercial)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                  
                  {/* BLOCO 1: Zoneamento e Parâmetros Gerais */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      🏢 1. Zoneamento & Parâmetros Gerais
                    </strong>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Zona do KMZ:</span>
                        <select 
                          value={comercialZona} 
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, zona_kmz: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                        >
                          <option value="">Selecione...</option>
                          {Object.keys(ZONAS_ANEXO13).map(z => (
                            <option key={z} value={z}>{ZONAS_ANEXO13[z].nome}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Nº Pavimentos:</span>
                        <input 
                          type="number" 
                          value={checklistData.projeto_comercial?.num_pavimentos || ''}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, num_pavimentos: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Recuo Frontal (m):</span>
                        <input 
                          type="number" 
                          value={checklistData.projeto_comercial?.recuo_frontal || ''}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, recuo_frontal: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Recuo Lateral (m):</span>
                        <input 
                          type="number" 
                          value={checklistData.projeto_comercial?.recuo_lateral || ''}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, recuo_lateral: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Recuo Fundos (m):</span>
                        <input 
                          type="number" 
                          value={checklistData.projeto_comercial?.recuo_fundos || ''}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, recuo_fundos: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Taxa de Ocupação:</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 0.50"
                          value={checklistData.projeto_comercial?.taxa_ocupacao || ''}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, taxa_ocupacao: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Coef. Aproveitamento:</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 1.20"
                          value={checklistData.projeto_comercial?.coef_aproveitamento || ''}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, coef_aproveitamento: e.target.value }
                          })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                        <input 
                          id="comercial_proj_assinado"
                          type="checkbox" 
                          checked={!!checklistData.projeto_comercial?.projeto_assinado}
                          onChange={e => setChecklistData({
                            ...checklistData,
                            projeto_comercial: { ...checklistData.projeto_comercial, projeto_assinado: e.target.checked }
                          })}
                          style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="comercial_proj_assinado" style={{ cursor: 'pointer', fontWeight: '500' }}>
                          Projeto devidamente assinado?
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 2: Tabela de Verificação (TSN e CA) */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      📊 2. Tabela de Verificação (TSN e CA)
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                      {/* TSN */}
                      <div>
                        <strong style={{ display: 'block', fontSize: '11px', color: 'var(--blue)', marginBottom: '8px' }}>
                          Verificação da Taxa de Solo Natural (TSN)
                        </strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '6px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área do Terreno (m²):</label>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.tsn_area_terreno || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, tsn_area_terreno: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área TSN Projeto (m²):</label>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.tsn_area_projeto || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, tsn_area_projeto: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                            />
                          </div>
                        </div>

                        {comercialZonaInfo && (
                          <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--body-bg)', border: '1px solid var(--border)', fontSize: '11px' }}>
                            <div>Zona: <strong>{comercialZona}</strong> | Mínimo Exigido: <strong>{tsnMin}%</strong></div>
                            <div>Calculado no Projeto: <strong>{tsnCalculada.toFixed(2)}%</strong></div>
                            <div style={{ marginTop: '4px', fontWeight: 'bold', color: tsnConforme ? 'var(--green)' : 'var(--red)' }}>
                              {tsnConforme ? '✔️ CONFORME' : `❌ INSUFICIENTE (Exige mínimo de ${tsnMin}%)`}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CA */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <strong style={{ display: 'block', fontSize: '11px', color: 'var(--blue)', marginBottom: '8px' }}>
                          Verificação do Coeficiente de Aproveitamento (CA)
                        </strong>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '6px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área do Terreno (m²):</label>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.ca_area_terreno || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, ca_area_terreno: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Área Construída (m²):</label>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.ca_area_construida || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, ca_area_construida: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                            />
                          </div>
                        </div>

                        {comercialZonaInfo && (
                          <div style={{ padding: '6px 8px', borderRadius: '4px', background: 'var(--body-bg)', border: '1px solid var(--border)', fontSize: '11px' }}>
                            <div>Zona: <strong>{comercialZona}</strong> | Máximo Permitido: <strong>{caMaxStr}</strong></div>
                            <div>Calculado no Projeto: <strong>{caCalculado.toFixed(2)}</strong></div>
                            <div style={{ marginTop: '4px', fontWeight: 'bold', color: caConforme ? 'var(--green)' : 'var(--red)' }}>
                              {caConforme ? '✔️ CONFORME' : `❌ EXTRAPOLA O LIMITE (Máximo: ${caMaxStr})`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 3: Áreas Arborizadas do Imóvel */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      🌳 3. Áreas Arborizadas do Imóvel
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--text3)', lineHeight: '1.4' }}>
                        Implantar arborização na calçada adjacente ao imóvel, na proporção de 01 (uma) árvore para cada 6 m de testada do imóvel.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Testada Total (m):</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.testada_total || ''}
                          onChange={e => {
                            const testada = e.target.value;
                            const arv = testada ? Math.ceil(parseFloat(testada) / 6).toString() : '';
                            setChecklistData({ 
                              ...checklistData, 
                              projeto_comercial: { ...checklistData.projeto_comercial, testada_total: testada, qtd_arvores: arv } 
                            });
                          }}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Árvores Exigidas:</span>
                        <input 
                          type="text"
                          disabled
                          value={checklistData.projeto_comercial?.qtd_arvores || ''}
                          style={{ padding: '3px 6px', fontSize: '11px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--blue)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 4: Análise de Drenagem */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      🌊 4. Análise de Drenagem
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Área Alagável:</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { val: 'sim', label: 'SIM' },
                            { val: 'nao', label: 'NÃO' },
                            { val: 'nsapl', label: 'NSAPL' }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, drenagem_alagavel: opt.val } })}
                              className="btn btn-xs"
                              style={{
                                flex: 1,
                                fontSize: '10px',
                                padding: '4px',
                                background: checklistData.projeto_comercial?.drenagem_alagavel === opt.val ? (opt.val === 'sim' ? 'rgba(239, 68, 68, 0.15)' : opt.val === 'nao' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)') : 'transparent',
                                color: checklistData.projeto_comercial?.drenagem_alagavel === opt.val ? (opt.val === 'sim' ? 'var(--red)' : opt.val === 'nao' ? 'var(--green)' : 'var(--text1)') : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.drenagem_alagavel === opt.val ? (opt.val === 'sim' ? 'var(--red)' : opt.val === 'nao' ? 'var(--green)' : 'var(--border)') : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Área de Risco:</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { val: 'sim', label: 'SIM' },
                            { val: 'nao', label: 'NÃO' },
                            { val: 'nsapl', label: 'NSAPL' }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, drenagem_risco: opt.val } })}
                              className="btn btn-xs"
                              style={{
                                flex: 1,
                                fontSize: '10px',
                                padding: '4px',
                                background: checklistData.projeto_comercial?.drenagem_risco === opt.val ? (opt.val === 'sim' ? 'rgba(239, 68, 68, 0.15)' : opt.val === 'nao' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)') : 'transparent',
                                color: checklistData.projeto_comercial?.drenagem_risco === opt.val ? (opt.val === 'sim' ? 'var(--red)' : opt.val === 'nao' ? 'var(--green)' : 'var(--text1)') : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.drenagem_risco === opt.val ? (opt.val === 'sim' ? 'var(--red)' : opt.val === 'nao' ? 'var(--green)' : 'var(--border)') : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '8px', alignItems: 'center' }}>
                            <span>Distân. Riachos/Lagoas (m):</span>
                            <input 
                              type={checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL' ? 'text' : 'number'}
                              placeholder={checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL' ? 'Não se aplica' : 'Min 30 m'}
                              disabled={checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL'}
                              value={checklistData.projeto_comercial?.drenagem_distancia_riacho || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, drenagem_distancia_riacho: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const isNS = checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL';
                                setChecklistData({
                                  ...checklistData,
                                  projeto_comercial: {
                                    ...checklistData.projeto_comercial,
                                    drenagem_distancia_riacho: isNS ? '' : 'NSAPL'
                                  }
                                });
                              }}
                              className="btn btn-xs"
                              style={{
                                padding: '3px 6px',
                                fontSize: '10px',
                                background: checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                color: checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL' ? 'var(--red)' : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.drenagem_distancia_riacho === 'NSAPL' ? 'var(--red)' : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              NSAPL
                            </button>
                          </div>
                          {checklistData.projeto_comercial?.drenagem_distancia_riacho !== '' && checklistData.projeto_comercial?.drenagem_distancia_riacho !== 'NSAPL' && parseFloat(checklistData.projeto_comercial?.drenagem_distancia_riacho) < 30 && (
                            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: 'var(--red)', fontSize: '10px', fontWeight: '500', display: 'flex', gap: '4px', alignItems: 'center' }}>
                              ⚠️ <strong>ATENÇÃO MÁXIMA:</strong> Distância menor que 30 m! Requer verificação adicional.
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '8px', alignItems: 'center' }}>
                            <span>Distân. Canais/Talvegues (m):</span>
                            <input 
                              type={checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL' ? 'text' : 'number'}
                              placeholder={checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL' ? 'Não se aplica' : 'Min 10 m'}
                              disabled={checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL'}
                              value={checklistData.projeto_comercial?.drenagem_distancia_canal || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, drenagem_distancia_canal: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const isNS = checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL';
                                setChecklistData({
                                  ...checklistData,
                                  projeto_comercial: {
                                    ...checklistData.projeto_comercial,
                                    drenagem_distancia_canal: isNS ? '' : 'NSAPL'
                                  }
                                });
                              }}
                              className="btn btn-xs"
                              style={{
                                padding: '3px 6px',
                                fontSize: '10px',
                                background: checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                color: checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL' ? 'var(--red)' : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.drenagem_distancia_canal === 'NSAPL' ? 'var(--red)' : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              NSAPL
                            </button>
                          </div>
                          {checklistData.projeto_comercial?.drenagem_distancia_canal !== '' && checklistData.projeto_comercial?.drenagem_distancia_canal !== 'NSAPL' && parseFloat(checklistData.projeto_comercial?.drenagem_distancia_canal) < 10 && (
                            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: 'var(--red)', fontSize: '10px', fontWeight: '500', display: 'flex', gap: '4px', alignItems: 'center' }}>
                              ⚠️ <strong>ATENÇÃO MÁXIMA:</strong> Distância menor que 10 m! Requer verificação adicional.
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* BLOCO 5: Verificação de ART/RRT */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      📋 5. Verificação da ART/RRT
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Atividade técnica descrita na ART/RRT corresponde?</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { val: 'corresponde', label: 'CORRESPONDE' },
                            { val: 'nao_corresponde', label: 'NÃO CORRESPONDE' }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, art_rrt_atividade_corresponde: opt.val } })}
                              className="btn btn-xs"
                              style={{
                                flex: 1,
                                fontSize: '10px',
                                padding: '4px',
                                background: checklistData.projeto_comercial?.art_rrt_atividade_corresponde === opt.val ? (opt.val === 'corresponde' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'transparent',
                                color: checklistData.projeto_comercial?.art_rrt_atividade_corresponde === opt.val ? (opt.val === 'corresponde' ? 'var(--green)' : 'var(--red)') : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.art_rrt_atividade_corresponde === opt.val ? (opt.val === 'corresponde' ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span>Área da ART (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_comercial?.art_rrt_area_art || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, art_rrt_area_art: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span>Área da RRT (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_comercial?.art_rrt_area_rrt || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, art_rrt_area_rrt: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span>Área do Projeto (m²):</span>
                          <input 
                            type="number"
                            value={checklistData.projeto_comercial?.art_rrt_area_projeto || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, art_rrt_area_projeto: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>

                        {(() => {
                          const areaArt = parseFloat(checklistData.projeto_comercial?.art_rrt_area_art?.toString().replace(',', '.')) || 0;
                          const areaRrt = parseFloat(checklistData.projeto_comercial?.art_rrt_area_rrt?.toString().replace(',', '.')) || 0;
                          const areaProj = parseFloat(checklistData.projeto_comercial?.art_rrt_area_projeto?.toString().replace(',', '.')) || 0;

                          const areasPreenchidas = [
                            { nome: 'ART', valor: areaArt, raw: checklistData.projeto_comercial?.art_rrt_area_art },
                            { nome: 'RRT', valor: areaRrt, raw: checklistData.projeto_comercial?.art_rrt_area_rrt },
                            { nome: 'Projeto', valor: areaProj, raw: checklistData.projeto_comercial?.art_rrt_area_projeto }
                          ].filter(item => item.raw && parseFloat(item.raw.toString().replace(',', '.')) > 0);

                          const hasAreaDivergencia = areasPreenchidas.length > 1 && !areasPreenchidas.every(item => item.valor === areasPreenchidas[0].valor);

                          if (hasAreaDivergencia) {
                            return (
                              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: 'var(--red)', fontSize: '10px', fontWeight: '500', marginTop: '6px' }}>
                                ⚠️ <strong>DIVERGÊNCIA DE ÁREA DETECTADA:</strong> As áreas informadas divergem entre si! Verifique os documentos.
                              </div>
                            );
                          } else if (areasPreenchidas.length > 1) {
                            return (
                              <div style={{ padding: '6px 8px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '4px', color: 'var(--green)', fontSize: '10px', fontWeight: '500', marginTop: '6px', textAlign: 'center' }}>
                                ✔️ Áreas em conformidade entre os documentos informados.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 6: Estudo de Impacto de Vizinhança (EIV) */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      📋 6. Estudo de Impacto de Vizinhança (EIV)
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Área Terreno (m²):</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.eiv_terreno_area || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, eiv_terreno_area: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Área Construída (m²):</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.eiv_construida_area || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, eiv_construida_area: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      {(() => {
                        const areaTerr = parseFloat(checklistData.projeto_comercial?.eiv_terreno_area) || 0;
                        const areaConst = parseFloat(checklistData.projeto_comercial?.eiv_construida_area) || 0;
                        const eivObrigatorio = areaTerr >= 10000 || areaConst >= 5000;

                        return (
                          <div style={{ 
                            padding: '10px', 
                            background: eivObrigatorio ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)', 
                            border: `1px solid ${eivObrigatorio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`, 
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '11px',
                            textAlign: 'center',
                            color: eivObrigatorio ? 'var(--red)' : 'var(--green)',
                            marginTop: '8px'
                          }}>
                            {eivObrigatorio ? '⚠️ EIV OBRIGATÓRIO (Terreno ≥ 10.000m² ou Const. ≥ 5.000m²)' : '✔️ DISPENSADO DE EIV'}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* BLOCO 7: Depósito de Lixo */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      🗑️ 7. Depósito de Lixo (Art. 19)
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Nº de Pavimentos:</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.lixo_pavimentos || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, lixo_pavimentos: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Nº de Economias:</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.lixo_economias || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, lixo_economias: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      {(() => {
                        const pavs = parseInt(checklistData.projeto_comercial?.lixo_pavimentos) || 0;
                        const econs = parseInt(checklistData.projeto_comercial?.lixo_economias) || 0;
                        const lixoObrigatorio = pavs > 2 || econs > 2;

                        return (
                          <div style={{ 
                            padding: '10px', 
                            background: lixoObrigatorio ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)', 
                            border: `1px solid ${lixoObrigatorio ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`, 
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '11px',
                            color: lixoObrigatorio ? 'var(--red)' : 'var(--green)',
                            marginTop: '8px',
                            lineHeight: '1.4'
                          }}>
                            {lixoObrigatorio ? (
                              <div>
                                ⚠️ <strong>DEPÓSITO DE LIXO OBRIGATÓRIO:</strong>
                                <span style={{ display: 'block', fontWeight: 'normal', fontSize: '10px', marginTop: '4px', color: 'var(--text2)' }}>
                                  Área mínima de 6m² revestida com material impermeável até 2,00m de altura.
                                </span>
                              </div>
                            ) : (
                              '✔️ DISPENSADO DE DEPÓSITO DE LIXO'
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* BLOCO 8: Pé-Direito Comercial e Jirau */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      📐 8. Pé-Direito Comercial e Jirau (Art. 27)
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Nome Compartimento:</span>
                        <input 
                          type="text"
                          placeholder="Ex: Salão Principal"
                          value={checklistData.projeto_comercial?.pe_direito_sala_name || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_sala_name: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Área (m²):</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.pe_direito_sala_area || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_sala_area: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Pé-direito (m):</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={checklistData.projeto_comercial?.pe_direito_sala_pe || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_sala_pe: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      {checklistData.projeto_comercial?.pe_direito_sala_area !== '' && checklistData.projeto_comercial?.pe_direito_sala_pe !== '' && (() => {
                        const area = parseFloat(checklistData.projeto_comercial.pe_direito_sala_area) || 0;
                        const pe = parseFloat(checklistData.projeto_comercial.pe_direito_sala_pe) || 0;
                        const peExigido = area > 75 ? 3.50 : 3.00;
                        const ok = pe >= peExigido;

                        return (
                          <div style={{ padding: '6px 8px', background: ok ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${ok ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, borderRadius: '4px', fontSize: '11px', fontWeight: '500', color: ok ? 'var(--green)' : 'var(--red)', marginTop: '4px' }}>
                            {ok ? `✔️ Pé-direito conforme (Exigido: ${peExigido.toFixed(2)}m)` : `❌ INSUFICIENTE: Exige pé-direito mínimo de ${peExigido.toFixed(2)}m para salas com ${area > 75 ? 'mais' : 'até'} de 75m².`}
                          </div>
                        );
                      })()}

                      {/* Jirau */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '6px' }}>
                        <span style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>Há Jirau (Mezanino) no Projeto?</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { val: 'sim', label: 'SIM' },
                            { val: 'nao', label: 'NÃO' }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_jirau_existe: opt.val } })}
                              className="btn btn-xs"
                              style={{
                                flex: 1,
                                fontSize: '10px',
                                padding: '4px',
                                background: checklistData.projeto_comercial?.pe_direito_jirau_existe === opt.val ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: checklistData.projeto_comercial?.pe_direito_jirau_existe === opt.val ? 'var(--blue)' : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.pe_direito_jirau_existe === opt.val ? 'var(--blue)' : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {checklistData.projeto_comercial?.pe_direito_jirau_existe === 'sim' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--body-bg)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '4px' }}>
                          <strong style={{ fontSize: '11px', color: 'var(--blue)', marginBottom: '4px' }}>Medidas do Jirau</strong>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span>Área Jirau (m²):</span>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.pe_direito_jirau_area || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_jirau_area: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          {checklistData.projeto_comercial?.pe_direito_sala_area && checklistData.projeto_comercial?.pe_direito_jirau_area && (() => {
                            const areaSala = parseFloat(checklistData.projeto_comercial.pe_direito_sala_area) || 0;
                            const areaJirau = parseFloat(checklistData.projeto_comercial.pe_direito_jirau_area) || 0;
                            const limite = areaSala * 0.30;
                            const ok = areaJirau <= limite;
                            return (
                              <div style={{ fontSize: '10px', color: ok ? 'var(--green)' : 'var(--red)', fontWeight: '600' }}>
                                {ok ? `✔️ Área ocupada (${areaJirau.toFixed(2)}m²) dentro do limite de 30% (${limite.toFixed(2)}m²)` : `❌ Ultrapassa limite de 30% (${limite.toFixed(2)}m²)`}
                              </div>
                            );
                          })()}

                          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <span>Pé-direito Acima (m):</span>
                            <input 
                              type="number"
                              step="0.01"
                              value={checklistData.projeto_comercial?.pe_direito_jirau_acima || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_jirau_acima: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span>Pé-direito Abaixo (m):</span>
                            <input 
                              type="number"
                              step="0.01"
                              value={checklistData.projeto_comercial?.pe_direito_jirau_abaixo || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, pe_direito_jirau_abaixo: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          {checklistData.projeto_comercial?.pe_direito_jirau_acima && checklistData.projeto_comercial?.pe_direito_jirau_abaixo && (() => {
                            const acimaJ = parseFloat(checklistData.projeto_comercial.pe_direito_jirau_acima) || 0;
                            const abaixoJ = parseFloat(checklistData.projeto_comercial.pe_direito_jirau_abaixo) || 0;
                            const ok = acimaJ >= 2.20 && abaixoJ >= 2.20;
                            return (
                              <div style={{ fontSize: '10px', color: ok ? 'var(--green)' : 'var(--red)', fontWeight: '600' }}>
                                {ok ? '✔️ Pés-direitos acima/abaixo do Jirau conforme (≥ 2.20m)' : '❌ Pé-direito acima/abaixo deve ser de no mínimo 2.20m (Art. 27).'}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BLOCO 9: Medidas do Lote vs Escritura */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      📐 9. Medidas do Lote vs Escritura
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>Lote Projeto (Projeto Arquitetônico):</span>
                        <textarea 
                          rows={2}
                          value={checklistData.projeto_comercial?.medidas_lote_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, medidas_lote_projeto: e.target.value } })}
                          style={{ padding: '4px 6px', fontSize: '11px', width: '100%', resize: 'vertical' }}
                          placeholder="Digite as dimensões do lote segundo o projeto..."
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                        <span>Lote Certidão de Inteiro Teor / Escritura:</span>
                        <textarea 
                          rows={2}
                          value={checklistData.projeto_comercial?.medidas_lote_certidao || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, medidas_lote_certidao: e.target.value } })}
                          style={{ padding: '4px 6px', fontSize: '11px', width: '100%', resize: 'vertical' }}
                          placeholder="Digite as dimensões do lote segundo a escritura/certidão..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 10: Confrontantes */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      👥 10. Confrontantes (Confrontam com Escritura ou Certidão)
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <strong style={{ fontSize: '11px', color: 'var(--blue)' }}>Confrontantes no Projeto:</strong>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>Frente:</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_frente_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_frente_projeto: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>Fundos:</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_fundos_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_fundos_projeto: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>LD (Dir.):</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_ld_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_ld_projeto: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>LE (Esq.):</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_le_projeto || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_le_projeto: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <strong style={{ fontSize: '11px', color: 'var(--blue)', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '6px' }}>Confrontantes na Certidão/Escritura:</strong>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>Frente:</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_frente_certidao || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_frente_certidao: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>Fundos:</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_fundos_certidao || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_fundos_certidao: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>LD (Dir.):</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_ld_certidao || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_ld_certidao: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: '6px', alignItems: 'center' }}>
                        <span>LE (Esq.):</span>
                        <input 
                          type="text"
                          value={checklistData.projeto_comercial?.confrontantes_le_certidao || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, confrontantes_le_certidao: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 11: Área de Uso Comum & Molhadas */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      🏢 11. Área de Uso Comum & Áreas Molhadas
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Área de Uso Comum:</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[
                            { val: 'sim', label: 'SIM' },
                            { val: 'nsapl', label: 'NSAPL' }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, area_comum_comercial: opt.val } })}
                              className="btn btn-xs"
                              style={{
                                flex: 1,
                                fontSize: '10px',
                                padding: '4px',
                                background: checklistData.projeto_comercial?.area_comum_comercial === opt.val ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                color: checklistData.projeto_comercial?.area_comum_comercial === opt.val ? 'var(--blue)' : 'var(--text2)',
                                border: `1px solid ${checklistData.projeto_comercial?.area_comum_comercial === opt.val ? 'var(--blue)' : 'var(--border)'}`,
                                fontWeight: '600'
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <strong style={{ fontSize: '11px', color: 'var(--blue)', marginBottom: '4px' }}>Especificações de Áreas Molhadas:</strong>
                        
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input 
                            id="comercial_revestimento"
                            type="checkbox"
                            checked={!!checklistData.projeto_comercial?.revestimento_ceramico}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, revestimento_ceramico: e.target.checked } })}
                            style={{ cursor: 'pointer' }}
                          />
                          <label htmlFor="comercial_revestimento" style={{ cursor: 'pointer' }}>Revestimento cerâmico/equiv. em áreas molhadas?</label>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input 
                            id="comercial_tinta"
                            type="checkbox"
                            checked={!!checklistData.projeto_comercial?.tinta_impermeavel}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, tinta_impermeavel: e.target.checked } })}
                            style={{ cursor: 'pointer' }}
                          />
                          <label htmlFor="comercial_tinta" style={{ cursor: 'pointer' }}>Tinta impermeável aplicada nas áreas adequadas?</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 12: Afastamentos e Prisma de Ventilação */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text2)' }}>
                        💨 12. Afastamentos e Prisma de Ventilação
                      </strong>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { val: 'APLICAVEL', label: 'APLICÁVEL' },
                          { val: 'NSAPL', label: 'NSAPL' }
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => {
                              const isNS = opt.val === 'NSAPL';
                              setChecklistData({
                                ...checklistData,
                                projeto_comercial: {
                                  ...checklistData.projeto_comercial,
                                  prisma_nsapl: opt.val,
                                  ...(isNS ? { distancia_lote_vizinho: '', prisma_altura_h: '', prisma_resultado: '' } : {})
                                }
                              });
                            }}
                            className="btn btn-xs"
                            style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              background: (checklistData.projeto_comercial?.prisma_nsapl || 'APLICAVEL') === opt.val ? (opt.val === 'APLICAVEL' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'transparent',
                              color: (checklistData.projeto_comercial?.prisma_nsapl || 'APLICAVEL') === opt.val ? (opt.val === 'APLICAVEL' ? 'var(--blue)' : 'var(--red)') : 'var(--text2)',
                              border: `1px solid ${(checklistData.projeto_comercial?.prisma_nsapl || 'APLICAVEL') === opt.val ? (opt.val === 'APLICAVEL' ? 'var(--blue)' : 'var(--red)') : 'var(--border)'}`,
                              fontWeight: '600'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', opacity: isPrismaNS ? 0.5 : 1, pointerEvents: isPrismaNS ? 'none' : 'auto' }}>
                      <div>
                        <span style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Janelas voltadas para lotes vizinhos (Afastamento mínimo de 1.5 m):</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Distância lote vizinho (m):</span>
                          <input 
                            type="number"
                            disabled={isPrismaNS}
                            value={checklistData.projeto_comercial?.distancia_lote_vizinho || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, distancia_lote_vizinho: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>
                        {checklistData.projeto_comercial?.distancia_lote_vizinho !== '' && !isPrismaNS && (() => {
                          const val = parseFloat(checklistData.projeto_comercial?.distancia_lote_vizinho);
                          const ok = val >= 1.5;
                          return (
                            <div style={{ alignSelf: 'flex-end', fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '3px', color: ok ? 'var(--green)' : 'var(--red)', background: ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'inline-block', marginTop: '4px' }}>
                              {ok ? '✔️ CONFORME' : '❌ DIVERGENTE (Mínimo: 1.50 m)'}
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--blue)' }}>Prisma de ventilação (Art. 13 - L = 1/3 * H)</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text3)' }}>Altura da edificação H (m):</label>
                            <input 
                              type="number"
                              disabled={isPrismaNS}
                              value={checklistData.projeto_comercial?.prisma_altura_h || ''}
                              onChange={e => {
                                const h = e.target.value;
                                const res = h ? (parseFloat(h) / 3).toFixed(2) + ' m' : '';
                                setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, prisma_altura_h: h, prisma_resultado: res } });
                              }}
                              style={{ padding: '3px 6px', fontSize: '11px', width: '100%' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--text3)' }}>L (Resultado):</label>
                            <input 
                              type="text"
                              disabled
                              value={checklistData.projeto_comercial?.prisma_resultado || ''}
                              style={{ padding: '3px 6px', fontSize: '11px', width: '100%', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', color: 'var(--text1)' }}
                            />
                          </div>
                        </div>

                        <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '4px', color: 'var(--text2)', fontSize: '11px', lineHeight: '1.4' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '14px' }}>ℹ️</span>
                            <div>
                              <p style={{ margin: '0 0 6px 0' }}>O <strong>§ 3º</strong> do Art. 13 estabelece: <em>"Os vãos de iluminação e ventilação deverão obedecer à distância mínima de 1,50 m (um metro e cinquenta centímetros) das divisas do lote."</em></p>
                              <p style={{ margin: 0 }}>O <strong>§ 1º</strong> determina: <em>"O prisma de ventilação e iluminação poderá ter formato retangular, desde que o seu lado menor seja igual a 70% de L e a área resultante seja igual à calculada."</em></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 13: Dimensionamento de Estacionamento */}
                  <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', marginBottom: '12px', color: 'var(--text2)', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                      🚗 13. Dimensionamento de Estacionamento (Lei 034/2022)
                    </strong>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                        <span>Área Total Construída (m²):</span>
                        <input 
                          type="number"
                          value={checklistData.projeto_comercial?.estac_area_total_construida || ''}
                          onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_area_total_construida: e.target.value } })}
                          style={{ padding: '3px 6px', fontSize: '11px' }}
                        />
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: 'var(--blue)' }}>Deduções / Áreas Não Computáveis (Art. 137):</span>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span 
                              title="Compreende toda a área destinada à guarda de veículos (vagas), bem como as faixas de circulação, pistas de manobra e rampas de acesso veicular."
                              style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                            >
                              Estacionamento/Garagem (m²):
                            </span>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.estac_deducao_garagem || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_deducao_garagem: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span 
                              title="Engloba compartimentos acessórios sem permanência humana prolongada (depósitos de material/lixo), além de áreas técnicas como casas de máquinas, barriletes, centrais de ar-condicionado e reservatórios (inferiores e superiores)."
                              style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                            >
                              Áreas Técnicas e Depósitos (m²):
                            </span>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.estac_deducao_tecnica || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_deducao_tecnica: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span 
                              title="Corresponde ao somatório das áreas ocupadas por caixas de escadas, rampas de acessibilidade/pedestres e poços de elevadores, contabilizadas em todos os pavimentos por onde perpassam."
                              style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                            >
                              Circulação Vertical (m²):
                            </span>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.estac_deducao_circulacao || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_deducao_circulacao: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span 
                              title="Salões de festas, jogos, academias ou áreas de convivência que sejam de uso comum do condomínio/edifício (aplicável se houver área comum de funcionários/público classificada como lazer)."
                              style={{ borderBottom: '1px dotted var(--text2)', cursor: 'help' }}
                            >
                              Lazer e Convivência (m²):
                            </span>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.estac_deducao_lazer || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_deducao_lazer: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontWeight: '500' }}>Fachada Ativa no Térreo (m²):</span>
                            <input 
                              type="number"
                              value={checklistData.projeto_comercial?.estac_deducao_fachada_ativa || ''}
                              onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_deducao_fachada_ativa: e.target.value } })}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', background: 'rgba(0,0,0,0.01)', padding: '6px', borderRadius: '4px' }}>
                          <span>Total Não Computável: <strong>{estacTotalNaoComputavel.toFixed(2)} m²</strong></span>
                          <span>Área Computável Final: <strong>{estacAreaComputavel.toFixed(2)} m²</strong></span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span>Vagas Exigidas por Lei:</span>
                          <input 
                            type="text"
                            disabled
                            value={estacIsento ? 'ISENTO (≤ 500 m²)' : `${estacVagasExigidas} ${estacVagasExigidas === 1 ? 'vaga' : 'vagas'}`}
                            style={{ padding: '3px 6px', fontSize: '11px', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--blue)' }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px', alignItems: 'center' }}>
                          <span>Vagas no Projeto:</span>
                          <input 
                            type="number"
                            placeholder="Número de vagas"
                            value={checklistData.projeto_comercial?.estac_vagas_projeto || ''}
                            onChange={e => setChecklistData({ ...checklistData, projeto_comercial: { ...checklistData.projeto_comercial, estac_vagas_projeto: e.target.value } })}
                            style={{ padding: '3px 6px', fontSize: '11px' }}
                          />
                        </div>

                        {checklistData.projeto_comercial?.estac_area_total_construida !== '' && (
                          <div style={{ padding: '6px 8px', background: estacConforme ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${estacConforme ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, borderRadius: '4px', fontSize: '11px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              {estacIsento ? 'Isento de Vagas' : `Projeto: ${estacVagasProjeto} de ${estacVagasExigidas}`}
                            </span>
                            <span style={{ fontWeight: 'bold', color: estacConforme ? 'var(--green)' : 'var(--red)' }}>
                              {estacIsento ? '✔️ ISENTO DE VAGAS' : estacConforme ? '✔️ CONFORME' : '❌ INSUFICIENTE'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* ═══════════════════════════════════════════════════════════════
              CARD 5 — ANÁLISE DE AFASTAMENTOS (residencial e comercial)
          ═══════════════════════════════════════════════════════════════ */}
          <CardAfastamentos
            zonaKey={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.zona_kmz || '')
                : (checklistData.projeto_residencial?.zona_kmz || '')
            }
            numPavimentos={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.num_pavimentos || '')
                : (checklistData.projeto_residencial?.num_pavimentos || '')
            }
            nsapl={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_nsapl || false)
                : (checklistData.projeto_residencial?.afast_nsapl || false)
            }
            setNsapl={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_nsapl: val }
              }));
            }}
            esquina={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_esquina || 'nao')
                : (checklistData.projeto_residencial?.afast_esquina || 'nao')
            }
            setEsquina={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_esquina: val }
              }));
            }}
            adotaAlinhamento={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_adota_alinhamento || false)
                : (checklistData.projeto_residencial?.afast_adota_alinhamento || false)
            }
            setAdotaAlinhamento={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_adota_alinhamento: val }
              }));
            }}
            frontal1={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_frontal1 || '')
                : (checklistData.projeto_residencial?.afast_frontal1 || '')
            }
            setFrontal1={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_frontal1: val }
              }));
            }}
            frontal2={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_frontal2 || '')
                : (checklistData.projeto_residencial?.afast_frontal2 || '')
            }
            setFrontal2={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_frontal2: val }
              }));
            }}
            lateral={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_lateral || '')
                : (checklistData.projeto_residencial?.afast_lateral || '')
            }
            setLateral={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_lateral: val }
              }));
            }}
            fundos={
              checklistType === 'comercial'
                ? (checklistData.projeto_comercial?.afast_fundos || '')
                : (checklistData.projeto_residencial?.afast_fundos || '')
            }
            setFundos={val => {
              const key = checklistType === 'comercial' ? 'projeto_comercial' : 'projeto_residencial';
              setChecklistData(prev => ({
                ...prev,
                [key]: { ...prev[key], afast_fundos: val }
              }));
            }}
          />

          <hr style={{ border: '0', borderTop: '1px solid var(--border)', margin: '24px 0' }} />

          {/* Ações Técnicas finais (Salvar e Minuta de Exigências) */}
          <div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSaveChecklist()}
                disabled={saveLoading}
                style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {saveLoading ? '💾 Salvando...' : '💾 Salvar Auditoria Técnica'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={handleGenerateMinuta}
                style={{ padding: '10px 20px', borderColor: 'var(--amber)', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📝 Gerar Minuta de Exigências
              </button>
            </div>

            {/* Minuta de Exigências */}
            {draftMinuta && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'var(--body-bg)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <strong style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: 'var(--text1)' }}>
                  Minuta de Exigências do Relatório Técnico
                </strong>
                <textarea 
                  value={draftMinuta}
                  onChange={e => setDraftMinuta(e.target.value)}
                  style={{ width: '100%', height: '180px', fontFamily: 'monospace', fontSize: '12px', padding: '10px', background: '#111', color: '#ccc', borderRadius: '4px', border: '1px solid #333' }}
                />
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm" 
                  onClick={() => {
                    navigator.clipboard.writeText(draftMinuta);
                    alert('Minuta de exigências copiada com sucesso!');
                  }}
                  style={{ marginTop: '10px', fontSize: '11px' }}
                >
                  📋 Copiar Minuta
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: VISTORIA 360° */}
      {activeTab === 'tour' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '20px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'var(--text1)' }}>
            📸 Vistoria Virtual 360º Integrada
          </h3>
          <Tour360 processId={proc.id} user={user} />
        </div>
      )}

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
            
            <div style={{position: 'relative', marginBottom: '10px'}}>
              <div id="leaflet-picker-map" style={{height: '400px', borderRadius: '8px', border: '1px solid var(--border)'}}></div>
              
              <div style={{position: 'absolute', top: '10px', left: '50px', zIndex: 1000, background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', width: '280px'}}>
                <div style={{marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '6px'}}>
                  <strong style={{display: 'block', fontSize: '12px', marginBottom: '4px'}}>1. Selecione a Ferramenta:</strong>
                  <div style={{display: 'flex', gap: '6px'}}>
                    <button 
                      type="button"
                      onClick={() => setPlacementMode(placementMode === 'main' ? null : 'main')} 
                      className={`btn btn-sm ${placementMode === 'main' ? 'btn-primary' : 'btn-outline'}`} 
                      style={{fontSize: '11px', flex: 1, padding: '4px'}}
                    >📍 Local</button>
                    <button 
                      type="button"
                      onClick={() => setPlacementMode(placementMode === 'ref' ? null : 'ref')} 
                      className="btn btn-sm"
                      style={{fontSize: '11px', flex: 1, padding: '4px', border: '1px solid #d97706', color: placementMode === 'ref' ? 'white' : '#d97706', background: placementMode === 'ref' ? '#d97706' : 'transparent'}}
                    >📍 Referência</button>
                  </div>
                  {placementMode && <div style={{fontSize: '10px', color: 'var(--blue)', marginTop: '4px', fontWeight: 'bold', textAlign: 'center'}}>👆 Clique no mapa para posicionar.</div>}
                </div>
                <div>
                  <strong style={{display: 'block', fontSize: '12px', marginBottom: '4px'}}>2. Editar Textos dos Balões:</strong>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    <input type="text" value={mainLabel} onChange={e => setMainLabel(e.target.value)} style={{fontSize: '11px', padding: '4px', border: '1px solid #0056b3'}} title="Texto do balão do Local Principal" />
                    <input type="text" value={refLabel} onChange={e => setRefLabel(e.target.value)} style={{fontSize: '11px', padding: '4px', border: '1px solid #d97706'}} title="Texto do balão de Referência" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="fca gap12" style={{background: 'var(--body-bg)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '12px'}}>
              <div><strong>Lat (Local):</strong> <span className="mono" style={{color: 'var(--blue)', fontWeight: 'bold'}}>{tempLat || '---'}</span></div>
              <div><strong>Lng (Local):</strong> <span className="mono" style={{color: 'var(--blue)', fontWeight: 'bold'}}>{tempLng || '---'}</span></div>
              <div style={{borderLeft: '1px solid var(--border)', paddingLeft: '12px'}}><strong>Lat (Ref):</strong> <span className="mono" style={{color: '#d97706', fontWeight: 'bold'}}>{refLat || '---'}</span></div>
              <div><strong>Lng (Ref):</strong> <span className="mono" style={{color: '#d97706', fontWeight: 'bold'}}>{refLng || '---'}</span></div>
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

      {activeObsKey && (
        <Modal
          title={`Observações Detalhadas: ${activeObsKey.toUpperCase()}`}
          onClose={() => setActiveObsKey(null)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setActiveObsKey(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => {
              const newConf = { ...checklistData.confrontacao, [`${activeObsKey}_obs`]: tempObsVal };
              setChecklistData({ ...checklistData, confrontacao: newConf });
              setActiveObsKey(null);
            }}>Salvar Observação</button>
          </>}
        >
          <div className="fg">
            <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block', color: 'var(--text2)' }}>
              Anotações, Pendências ou Divergências para: <span style={{ color: 'var(--blue)', fontWeight: 'bold' }}>{activeObsKey.toUpperCase()}</span>
            </label>
            <textarea
              value={tempObsVal}
              onChange={e => setTempObsVal(e.target.value)}
              placeholder="Digite aqui as observações detalhadas..."
              rows={8}
              style={{ width: '100%', padding: '10px', fontSize: '13px', background: 'var(--body-bg)', color: 'var(--text1)', border: '1px solid var(--border)', borderRadius: '4px' }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
