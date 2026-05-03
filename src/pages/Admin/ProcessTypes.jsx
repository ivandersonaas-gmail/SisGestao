import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Modal } from '../../components/UI/Modal';

export function ProcessTypes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cur, setCur] = useState({ id: null, name: '', active: true });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getAllProcessTypes();
      setData(res);
    } catch(e) {
      alert('Erro: ' + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    try {
      await api.saveProcessType(cur);
      setModalOpen(false);
      loadData();
    } catch(err) { alert('Erro: ' + err.message); }
  };

  return (
    <>
      <div className="card">
        <div className="card-title">
          Tipos de Processo
          <button className="btn btn-primary btn-sm" onClick={() => { setCur({ id: null, name: '', active: true }); setModalOpen(true); }}>+ Novo Tipo</button>
        </div>
        {loading ? <div className="empty">Carregando...</div> : (
          <table className="rt">
            <thead><tr><th>Nome / Descrição</th><th>Status</th></tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id} className="clickable" onClick={() => { setCur(d); setModalOpen(true); }}>
                  <td data-label="Nome">{d.name}</td>
                  <td data-label="Status">{d.active ? <span className="badge b-green">Ativo</span> : <span className="badge b-red">Inativo</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={cur.id ? "Editar Tipo" : "Novo Tipo"} onClose={() => setModalOpen(false)}
          footer={<><button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}>Salvar</button></>}
        >
          <div className="fg" style={{marginBottom: 10}}>
            <label>Descrição</label>
            <input value={cur.name} onChange={e => setCur({...cur, name: e.target.value})} />
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 15, cursor: 'pointer', fontSize: 13}}>
            <input type="checkbox" checked={cur.active} onChange={e => setCur({...cur, active: e.target.checked})} style={{width:'auto'}} /> Ativo
          </label>
        </Modal>
      )}
    </>
  );
}
