import { supabase } from './supabaseClient';
import { SM } from '../config/constants';

export const api = {
  async login(username, password){
    const {data,error} = await supabase.from('users').select('*').eq('username', username.toLowerCase()).eq('active', true).single()
    if(error||!data) throw new Error('Usuário não encontrado ou inativo.')
    if(data.password_hash !== password) throw new Error('Senha incorreta.')
    return data
  },

  async getUsers(filters={}){
    let q = supabase.from('users').select('*')
    if(filters.role) q = q.eq('role', filters.role)
    const {data,error} = await q.order('name')
    if(error) throw error
    return data||[]
  },

  async saveUser(user){
    if(user.id){
      const {data,error} = await supabase.from('users').update(user).eq('id',user.id).select().single()
      if(error) throw error
      return data
    } else {
      const {data,error} = await supabase.from('users').insert(user).select().single()
      if(error) throw error
      return data
    }
  },

  async getAnalysts(){
    const {data,error} = await supabase.from('users').select('*').eq('role','analyst').eq('active',true).order('name')
    if(error) throw error
    return data||[]
  },

  async getProcesses(role, userId, filters={}){
    let q = supabase.from('processes_view').select('*')
    if (role === 'analyst') {
      q = q.or(`assigned_to.eq.${userId},and(current_status.eq.RECEBIDO_SETOR,assigned_to.is.null)`);
    } else if (role === 'protocol') {
      q = q.or(`created_by.eq.${userId},current_status.in.(ENTRADA,ENC_ANALISE,DEV_PROTOCOLO,DEV_REQUERENTE,RETORNO_REQ,ANUENCIA_SOLO,ASSINADO,DISP_RETIRADA,FINALIZADO)`);
    }
    if(filters.status) q = q.eq('current_status', filters.status)
    if(filters.assignedTo) q = q.eq('analyst_username', filters.assignedTo)
    if(filters.search){
      const s = filters.search
      q = q.or(`protocol.ilike.%${s}%,requester.ilike.%${s}%`)
    }
    const {data,error} = await q.order('updated_at', {ascending:false})
    if(error) throw error
    return data||[]
  },

  async getProcess(id){
    const [{data:p,error:e1},{data:movs,error:e2}] = await Promise.all([
      supabase.from('processes_view').select('*').eq('id',id).single(),
      supabase.from('movements').select('*').eq('process_id',id).order('created_at',{ascending:true})
    ])
    if(e1) throw e1
    return {...p, movements: movs||[]}
  },

  async createProcess(proc){
    const {data,error} = await supabase.from('processes').insert(proc).select().single()
    if(error) throw error
    return data
  },

  async updateProcess(id, updates){
    const {data,error} = await supabase.from('processes').update(updates).eq('id',id).select().single()
    if(error) throw error
    return data
  },

  async uploadFile(file) {
    // Sanitiza o nome do arquivo: remove acentos e caracteres especiais
    const sanitizedName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]/g, "_");

    const fileName = `${Date.now()}_${sanitizedName}`;
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async editMovement(procId, movId, newStatus, newNotes, user, attachmentUrl = null){
    const s = SM[newStatus]
    const updates = {
      status: newStatus,
      label: s?.label||newStatus,
      notes: newNotes||''
    }
    if (attachmentUrl) updates.attachment_url = attachmentUrl;

    const {data,error} = await supabase.from('movements').update(updates).eq('id', movId).select().single()
    if(error) throw error
    const {error: e2} = await supabase.from('processes').update({ current_status: newStatus }).eq('id', procId)
    if(e2) throw e2
    await this.log('MOVIMENTO', `Processo`, `Correção de status para ${s?.label||newStatus}`, user)
    return data
  },

  async addMovement(procId, status, notes, user, attachmentUrl = null){
    const s = SM[status]
    const mov = {
      process_id: procId,
      status,
      label: s?.label||status,
      notes: notes||'',
      created_by_id: user.id,
      created_by_name: user.name,
      attachment_url: attachmentUrl
    }
    const {data,error} = await supabase.from('movements').insert(mov).select().single()
    if(error) throw error
    await this.log('MOVIMENTO', `Processo`, `→ ${s?.label||status}${notes?' — '+notes.slice(0,60):''}`, user)
    return data
  },

  async getProcessTypes() {
    const {data,error} = await supabase.from('process_types').select('*').eq('active', true).order('name')
    if(error) throw error
    return data||[]
  },
  async getAllProcessTypes() {
    const {data,error} = await supabase.from('process_types').select('*').order('name')
    if(error) throw error
    return data||[]
  },
  async saveProcessType(pt) {
    if(pt.id){
      const {data,error} = await supabase.from('process_types').update(pt).eq('id',pt.id).select().single()
      if(error) throw error
      return data
    } else {
      const {data,error} = await supabase.from('process_types').insert(pt).select().single()
      if(error) throw error
      return data
    }
  },

  async getFiscais() {
    const {data,error} = await supabase.from('fiscais').select('*').eq('active', true).order('name')
    if(error) throw error
    return data||[]
  },
  async getAllFiscais() {
    const {data,error} = await supabase.from('fiscais').select('*').order('name')
    if(error) throw error
    return data||[]
  },
  async saveFiscal(f) {
    if(f.id){
      const {data,error} = await supabase.from('fiscais').update(f).eq('id',f.id).select().single()
      if(error) throw error
      return data
    } else {
      const {data,error} = await supabase.from('fiscais').insert(f).select().single()
      if(error) throw error
      return data
    }
  },

  async armario(){
    const {data,error} = await supabase.from('processes_view').select('*')
      .eq('current_status','RECEBIDO_SETOR').is('assigned_to',null)
      .order('updated_at',{ascending:false})
    if(error) throw error
    return data||[]
  },

  async pending(role){
    let statuses = []
    if(role==='protocol'||role==='admin') statuses=['DEV_PROTOCOLO','RETORNO_REQ','ASSINADO','DISP_RETIRADA']
    else if(role==='secretary') statuses=['ENC_ASSINATURA']
    if(!statuses.length) return[]
    const {data,error} = await supabase.from('processes_view').select('*')
      .in('current_status', statuses).order('updated_at',{ascending:false})
    if(error) throw error
    return data||[]
  },

  async productivity(){
    const {data,error} = await supabase.from('analyst_productivity').select('*').order('total_processes',{ascending:false})
    if(error) throw error
    return data||[]
  },

  async getRestricoes() {
    const {data,error} = await supabase.from('restricoes').select('*').eq('active', true).order('nome')
    if(error) throw error
    return data||[]
  },
  async getAllRestricoes() {
    const {data,error} = await supabase.from('restricoes').select('*').order('nome')
    if(error) throw error
    return data||[]
  },
  async saveRestricao(r) {
    if(r.id){
      const {data,error} = await supabase.from('restricoes').update(r).eq('id',r.id).select().single()
      if(error) throw error
      return data
    } else {
      const {data,error} = await supabase.from('restricoes').insert(r).select().single()
      if(error) throw error
      return data
    }
  },

  async getAudit(){
    const {data,error} = await supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(200)
    if(error) throw error
    return data||[]
  },

  async getMovementsForProcesses(processIds) {
    if(!processIds || !processIds.length) return [];
    const { data, error } = await supabase.from('movements').select('process_id, notes, status').in('process_id', processIds).order('created_at', { ascending: false });
    if(error) throw error;
    return data || [];
  },

  async getAdvancedReports(startIso, endIso, isAnalyst, analystId) {
    let q = supabase.from('movements').select('*, process:processes_view(protocol, requester, type)')
      .in('status', ['PARECER', 'ANUENCIA', 'ANUENCIA_SOLO', 'ENC_ASSINATURA'])
      .gte('created_at', startIso)
      .lte('created_at', endIso);
      
    if(isAnalyst) {
      q = q.eq('created_by_id', analystId);
    }
    
    const { data, error } = await q.order('created_at', {ascending: false});
    if(error) throw error;
    return data || [];
  },

  async log(action, target, details, user){
    const payload = {
      user_id: user?.id || null,
      user_name: user?.name || 'Sistema',
      action,
      target,
      details
    }
    await supabase.from('audit_log').insert(payload).then(()=>{})
  }
};
