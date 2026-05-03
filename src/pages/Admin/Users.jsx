import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ROLES } from '../../config/constants';
import { Modal } from '../../components/UI/Modal';

export function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [cur, setCur] = useState({ id: null, username: '', name: '', role: 'analyst', active: true, password_hash: '' });

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
    try {
      await api.saveUser(cur);
      setModalOpen(false);
      loadData();
    } catch(err) {
      alert('Erro: ' + err.message);
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-title">
          Gerenciar Usuários
          <button className="btn btn-primary btn-sm" onClick={() => {
            setCur({ id: null, username: '', name: '', role: 'analyst', active: true, password_hash: '' });
            setModalOpen(true);
          }}>+ Novo Usuário</button>
        </div>
        
        {loading ? <div className="empty">Carregando...</div> : (
          <table className="rt">
            <thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Status</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="clickable" onClick={() => { setCur(u); setModalOpen(true); }}>
                  <td data-label="Nome">{u.name}</td>
                  <td data-label="Usuário" className="mono">{u.username}</td>
                  <td data-label="Perfil"><span className={`badge ${ROLES[u.role]?.badge || 'b-gray'}`}>{ROLES[u.role]?.label}</span></td>
                  <td data-label="Status">{u.active ? <span className="badge b-green">Ativo</span> : <span className="badge b-red">Inativo</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal 
          title={cur.id ? "Editar Usuário" : "Novo Usuário"} 
          onClose={() => setModalOpen(false)}
          footer={<>
            <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
          </>}
        >
          <div className="fg" style={{marginBottom: 10}}>
            <label>Nome Completo</label>
            <input value={cur.name} onChange={e => setCur({...cur, name: e.target.value})} />
          </div>
          <div className="fg" style={{marginBottom: 10}}>
            <label>Username (Login)</label>
            <input value={cur.username} onChange={e => setCur({...cur, username: e.target.value.toLowerCase()})} disabled={!!cur.id} />
          </div>
          <div className="fg" style={{marginBottom: 10}}>
            <label>Perfil de Acesso</label>
            <select value={cur.role} onChange={e => setCur({...cur, role: e.target.value})}>
              {Object.keys(ROLES).map(k => <option key={k} value={k}>{ROLES[k].label}</option>)}
            </select>
          </div>
          {!cur.id && (
            <div className="fg" style={{marginBottom: 10}}>
              <label>Senha Inicial</label>
              <input value={cur.password_hash} onChange={e => setCur({...cur, password_hash: e.target.value})} />
            </div>
          )}
          <label style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 15, cursor: 'pointer', fontSize: 13}}>
            <input type="checkbox" checked={cur.active} onChange={e => setCur({...cur, active: e.target.checked})} style={{width:'auto'}} />
            Usuário Ativo
          </label>
        </Modal>
      )}
    </>
  );
}
