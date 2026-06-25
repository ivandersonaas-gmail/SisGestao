import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
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
    if(filters.type) {
      if(filters.type === 'Comercial') {
        q = q.ilike('type', '%comercial%')
      } else {
        q = q.eq('type', filters.type)
      }
    }
    if(filters.search){
      const s = filters.search
      q = q.or(`protocol.ilike."%${s}%",requester.ilike."%${s}%",analyst_name.ilike."%${s}%"`)
    }
    q = q.order('updated_at', {ascending:false})

    let allData = [];
    let from = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await q.range(from, from + limit - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < limit) break;
      from += limit;
    }
    return allData;
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

  async uploadFileWithProgress(file, onProgress) {
    // Sanitiza o nome do arquivo: remove acentos e caracteres especiais
    const sanitizedName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]/g, "_");

    const fileName = `${Date.now()}_${sanitizedName}`;
    const url = `${supabaseUrl}/storage/v1/object/attachments/${fileName}`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('apikey', supabaseKey);
      xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
      xhr.setRequestHeader('Content-Type', file.type);

      // Evento de progresso de upload
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/attachments/${fileName}`;
          resolve(publicUrl);
        } else {
          reject(new Error(`Erro no servidor: ${xhr.statusText} (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Erro na conexão de rede com o servidor.'));
      };

      xhr.send(file);
    });
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

  async updateMovementDate(movId, newDateISO, user, processProtocol, movementLabel){
    const {data, error} = await supabase.from('movements').update({ created_at: newDateISO }).eq('id', movId).select().single()
    if(error) throw error
    await this.log('ALTERACAO_DATA', `Processo`, `Ajuste de data do histórico (${movementLabel}) no proc. ${processProtocol} para ${new Date(newDateISO).toLocaleString('pt-BR')}`, user)
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
      const { id, ...payload } = pt;
      const {data,error} = await supabase.from('process_types').insert(payload).select().single()
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
      const { id, ...payload } = f;
      const {data,error} = await supabase.from('fiscais').insert(payload).select().single()
      if(error) throw error
      return data
    }
  },

  async armario(filters = {}){
    let q = supabase.from('processes_view').select('*')
      .eq('current_status','RECEBIDO_SETOR').is('assigned_to',null);
    
    if (filters.startDate) {
      q = q.gte('created_at', filters.startDate + 'T00:00:00');
    }
    if (filters.endDate) {
      q = q.lte('created_at', filters.endDate + 'T23:59:59');
    }

    const {data,error} = await q.order('updated_at',{ascending:false});
    if(error) throw error;
    return data||[];
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
      const { id, ...payload } = r;
      const {data,error} = await supabase.from('restricoes').insert(payload).select().single()
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
    let q = supabase.from('movements').select('*, process:processes_view(protocol, requester, type, current_status, assigned_to, latitude, longitude, report_observation)')
      .in('status', ['PARECER', 'ANUENCIA', 'ANUENCIA_SOLO', 'ENC_ASSINATURA', 'LIC_COND', 'ATO_APR', 'V2_ATO', 'V2_COND', 'ASSINADO'])
      .gte('created_at', startIso)
      .lte('created_at', endIso);
      
    if(isAnalyst) {
      q = q.eq('created_by_id', analystId);
    }
    
    const { data, error } = await q.order('created_at', {ascending: false});
    if(error) throw error;
    return data || [];
  },
  async getAdvancedReportsForProcesses(processIds, isAnalyst, analystId) {
    let q = supabase.from('movements').select('*, process:processes_view(protocol, requester, type, current_status, assigned_to, latitude, longitude, report_observation)')
      .in('process_id', processIds);
      
    const { data, error } = await q.order('created_at', {ascending: false});
    if(error) throw error;
    return data || [];
  },
  async getProtocolReports(startIso, endIso) {
    let q = supabase.from('movements').select('*, process:processes_view(protocol, requester, type, current_status, assigned_to, latitude, longitude, report_observation)')
      .in('status', ['ENTRADA', 'ENC_ANALISE', 'DEV_REQUERENTE', 'RETORNO_REQ', 'DISP_RETIRADA', 'FINALIZADO'])
      .gte('created_at', startIso)
      .lte('created_at', endIso);
      
    const { data, error } = await q.order('created_at', {ascending: false});
    if(error) throw error;
    return data || [];
  },
  async log(type, category, action, user) {
    const payload = {
      user_id: user.id,
      user_name: user.name,
      action: type,
      target: category,
      details: action
    };
    await supabase.from('audit_log').insert(payload).then(()=>{})
  },

  async unassignProcess(id, notes, user){
    const {error} = await supabase.from('processes').update({
      assigned_to: null,
      current_status: 'RECEBIDO_SETOR'
    }).eq('id', id)
    if(error) throw error
    await this.addMovement(id, 'RECEBIDO_SETOR', notes || 'Processo devolvido ao armário do setor.', user)
    await this.log('DESATRIBUIR', `Processo`, `Devolvido ao armário por ${user.name}`, user)
  },

  // Métodos para o Tour 360
  async getTourScenes(processId) {
    const { data, error } = await supabase.from('process_tours').select('*').eq('process_id', processId).order('created_at');
    if (error) throw error;
    return data || [];
  },
  async saveTourScene(scene) {
    const { data, error } = await supabase.from('process_tours').insert(scene).select().single();
    if (error) throw error;
    return data;
  },
  async deleteTourScene(id) {
    const { error } = await supabase.from('process_tours').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteProcess(id) {
    // 1. Deletar os movimentos vinculados ao processo primeiro (cascata de banco manual)
    const { error: e1 } = await supabase.from('movements').delete().eq('process_id', id);
    if (e1) throw e1;

    // 2. Deletar outros possíveis vinculos (tours 360, se houver)
    await supabase.from('process_tours').delete().eq('process_id', id);

    // 3. Deletar o processo da tabela processes
    const { error: e2 } = await supabase.from('processes').delete().eq('id', id);
    if (e2) throw e2;

    return true;
  },

  async getProcessChecklist(processId) {
    const { data, error } = await supabase
      .from('process_checklists')
      .select('*')
      .eq('process_id', processId)
      .maybeSingle();
    if (error) {
      if (error.code === '42P01') {
        throw new Error('TABELA_INEXISTENTE');
      }
      throw error;
    }
    return data;
  },

  async saveProcessChecklist(processId, checklistData) {
    const { data, error } = await supabase
      .from('process_checklists')
      .upsert(
        { 
          process_id: processId, 
          checklist_data: checklistData, 
          updated_at: new Date().toISOString() 
        }, 
        { onConflict: 'process_id' }
      )
      .select()
      .single();
    if (error) {
      if (error.code === '42P01') {
        throw new Error('TABELA_INEXISTENTE');
      }
      throw error;
    }
    return data;
  },

  async getFeriados() {
    try {
      const { data, error } = await supabase
        .from('feriados')
        .select('*')
        .order('data', { ascending: true });
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return data || [];
    } catch (e) {
      console.warn("Erro ao buscar feriados (tabela inexistente):", e);
      return [];
    }
  },

  async saveFeriado(f) {
    if (f.id) {
      const { data, error } = await supabase
        .from('feriados')
        .update(f)
        .eq('id', f.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { id, ...payload } = f;
      const { data, error } = await supabase
        .from('feriados')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async deleteFeriado(id) {
    const { error } = await supabase
      .from('feriados')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getProcessesForAnalytics() {
    let allData = [];
    let from = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('processes_view')
        .select('id, protocol, type, created_at, updated_at, current_status, requester, assigned_to, analyst_name')
        .range(from, from + limit - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < limit) break;
      from += limit;
    }
    return allData;
  },

  async getAllMovementsForAnalytics() {
    let allData = [];
    let from = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('movements')
        .select('id, process_id, status, created_at, created_by_name, notes')
        .range(from, from + limit - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < limit) break;
      from += limit;
    }
    return allData;
  },

  async getPinnedProcesses(userId) {
    try {
      const { data, error } = await supabase
        .from('user_pinned_processes')
        .select('process_id')
        .eq('user_id', userId);
      if (error) throw error;
      return data.map(row => row.process_id);
    } catch (e) {
      console.error("Erro ao buscar processos fixados:", e);
      return [];
    }
  },

  async getAllPinnedProcesses() {
    try {
      const { data, error } = await supabase
        .from('user_pinned_processes')
        .select('user_id, process_id');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error("Erro ao buscar todos os processos fixados:", e);
      return [];
    }
  },

  async togglePinProcess(userId, processId, isPinned) {
    try {
      if (isPinned) {
        // Desfixar (Remover)
        const { error } = await supabase
          .from('user_pinned_processes')
          .delete()
          .match({ user_id: userId, process_id: processId });
        if (error) throw error;
      } else {
        // Fixar (Inserir)
        const { error } = await supabase
          .from('user_pinned_processes')
          .insert({ user_id: userId, process_id: processId });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Erro ao alterar pin do processo:", e);
      throw e;
    }
  }
};
