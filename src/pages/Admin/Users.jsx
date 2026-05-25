import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ROLES } from '../../config/constants';
import { Modal } from '../../components/UI/Modal';
import { Avatar } from '../../components/UI/Avatar';

export function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para o filtro de perfis
  const [filterRole, setFilterRole] = useState('');
  
  // Estados para o modal de usuário
  const [modalOpen, setModalOpen] = useState(false);
  const [cur, setCur] = useState({ id: null, username: '', name: '', role: 'analyst', active: true, password_hash: '', email: '', initials: '' });

  // Estados para o modal de troca de senha rápido
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [curUserIdForPassword, setCurUserIdForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers({});
      setUsers(data);
    } catch(e) {
      alert('Erro: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    // Sanitização e validações cirúrgicas
    if (!cur.name || !cur.username || !cur.role) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }
    try {
      const payload = {
        name: cur.name,
        username: cur.username.toLowerCase(),
        role: cur.role,
        email: cur.email || '',
        initials: cur.initials || cur.name.substr(0, 2).toUpperCase(),
        active: cur.active
      };
      if (cur.id) {
        payload.id = cur.id;
      }
      if (cur.password_hash) {
        payload.password_hash = cur.password_hash;
      }
      
      await api.saveUser(payload);
      setModalOpen(false);
      loadData();
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      alert('A senha deve ter no mínimo 4 caracteres.');
      return;
    }
    try {
      await api.saveUser({ id: curUserIdForPassword, password_hash: newPassword });
      setPasswordModalOpen(false);
      setNewPassword('');
      alert('Senha redefinida com sucesso!');
    } catch (err) {
      alert('Erro ao redefinir senha: ' + err.message);
    }
  };

  const handleToggleActive = async (u) => {
    if (u.username === 'admin') {
      alert('O usuário administrador master não pode ser desativado.');
      return;
    }
    const action = u.active ? 'desativar' : 'ativar';
    if (!confirm(`Deseja realmente ${action} o usuário "${u.name}"?`)) return;
    try {
      await api.saveUser({ id: u.id, active: !u.active });
      loadData();
    } catch (err) {
      alert('Erro ao alterar status: ' + err.message);
    }
  };

  const filteredUsers = filterRole 
    ? users.filter(u => u.role === filterRole)
    : users;

  return (
    <>
      {/* Barra de controle premium: Filtro, Contagem e Adicionar */}
      <div className="fca gap8" style={{ marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select 
          value={filterRole} 
          onChange={e => setFilterRole(e.target.value)} 
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="">Todos os perfis</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        
        <span style={{ fontSize: '12px', color: 'var(--text3)', marginLeft: 'auto', fontWeight: 500 }}>
          {filteredUsers.length} usuário(s)
        </span>
        
        <button className="btn btn-primary btn-sm" onClick={() => {
          setCur({ id: null, username: '', name: '', role: 'analyst', active: true, password_hash: '', email: '', initials: '' });
          setModalOpen(true);
        }}>
          + Novo usuário
        </button>
      </div>
      
      {/* Card da tabela com padding zero e overflow hidden para bordas elegantes */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? <div className="empty" style={{ padding: '20px' }}>Carregando...</div> : (
          <table className="rt">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Login</th>
                <th>Perfil</th>
                <th className="hide-mobile">Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td data-label="Nome">
                    <div className="fca gap8">
                      <Avatar user={u} size={26} />
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td data-label="Login">
                    <span className="mono">{u.username}</span>
                  </td>
                  <td data-label="Perfil">
                    <span className={`badge ${ROLES[u.role]?.badge || 'b-gray'}`}>
                      {ROLES[u.role]?.label || u.role}
                    </span>
                  </td>
                  <td data-label="Status" className="hide-mobile">
                    {u.active ? (
                      <span className="badge b-green">Ativo</span>
                    ) : (
                      <span className="badge b-red">Inativo</span>
                    )}
                  </td>
                  <td data-label="Ações">
                    <div className="fca gap6">
                      <button 
                        className="btn btn-outline btn-sm" 
                        onClick={() => { setCur({ ...u, password_hash: '' }); setModalOpen(true); }}
                      >
                        Editar
                      </button>
                      <button 
                        className="btn btn-outline btn-sm" 
                        style={{ borderColor: '#eab308', color: '#eab308' }} 
                        onClick={() => { setCurUserIdForPassword(u.id); setPasswordModalOpen(true); }}
                      >
                        🔑
                      </button>
                      <button 
                        className="btn btn-outline btn-sm" 
                        disabled={u.username === 'admin'}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5">
                    <div className="empty" style={{ padding: '20px' }}>Nenhum usuário encontrado.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Clássico de Usuário */}
      {modalOpen && (
        <Modal 
          title={cur.id ? "Editar usuário" : "Novo usuário"} 
          onClose={() => setModalOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
          </>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <div className="fg" style={{ gridColumn: 'span 2' }}>
              <label>Nome completo *</label>
              <input value={cur.name} onChange={e => setCur({...cur, name: e.target.value})} placeholder="Nome completo" />
            </div>
            <div className="fg">
              <label>Login *</label>
              <input value={cur.username} onChange={e => setCur({...cur, username: e.target.value.toLowerCase()})} disabled={!!cur.id} placeholder="Ex: joao.silva" />
            </div>
            <div className="fg">
              <label>{cur.id ? "Nova senha (vazio=manter)" : "Senha *"}</label>
              <input value={cur.password_hash || ''} onChange={e => setCur({...cur, password_hash: e.target.value})} type="text" placeholder="Mínimo 4 caracteres" />
            </div>
            <div className="fg">
              <label>Perfil *</label>
              <select value={cur.role} onChange={e => setCur({...cur, role: e.target.value})}>
                {Object.keys(ROLES).map(k => <option key={k} value={k}>{ROLES[k].label}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>E-mail</label>
              <input value={cur.email || ''} onChange={e => setCur({...cur, email: e.target.value})} type="email" placeholder="email@dominio.com" />
            </div>
            <div className="fg" style={{ gridColumn: 'span 2' }}>
              <label>Iniciais (2-3 letras)</label>
              <input value={cur.initials || ''} onChange={e => setCur({...cur, initials: e.target.value.toUpperCase()})} maxLength={3} style={{ textTransform: 'uppercase' }} placeholder="Ex: JS" />
            </div>
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 15, cursor: 'pointer', fontSize: 13}}>
            <input type="checkbox" checked={cur.active} onChange={e => setCur({...cur, active: e.target.checked})} style={{width:'auto'}} />
            Usuário Ativo
          </label>
        </Modal>
      )}

      {/* Modal Rápido de Redefinição de Senha */}
      {passwordModalOpen && (
        <Modal 
          title="Redefinir senha" 
          onClose={() => setPasswordModalOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setPasswordModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleResetPassword}>Redefinir</button>
          </>}
        >
          <div className="fg" style={{ marginBottom: 10 }}>
            <label>Nova senha *</label>
            <input 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              type="text" 
              placeholder="Mínimo 4 caracteres"
              autoFocus
            />
          </div>
        </Modal>
      )}
    </>
  );
}
