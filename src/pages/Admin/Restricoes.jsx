import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Modal } from '../../components/UI/Modal';

export function Restricoes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cur, setCur] = useState({ id: null, nome: '', tipo: 'Bairro', motivo: '', active: true });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getAllRestricoes();
      setData(res);
    } catch(e) {
      alert('Erro: ' + e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!cur.nome) { alert('O nome é obrigatório.'); return; }
    try {
      await api.saveRestricao(cur);
      setModalOpen(false);
      loadData();
    } catch(err) { alert('Erro: ' + err.message); }
  };

  return (
    <>
      <div className="card">
        <div className="card-title">
          Restrições de Análise
          <button className="btn btn-primary btn-sm" onClick={() => { setCur({ id: null, nome: '', tipo: 'Bairro', motivo: '', active: true }); setModalOpen(true); }}>+ Nova Restrição</button>
        </div>
        <div className="alert alert-info" style={{marginBottom: 16}}>
          Cadastre bairros ou empreendimentos proibidos/suspensos para alertar a equipe durante a análise.
        </div>
        {loading ? <div className="empty">Carregando...</div> : (
          <table className="rt">
            <thead>
              <tr>
                <th>Nome (Bairro/Emp.)</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id} className="clickable" onClick={() => { setCur(d); setModalOpen(true); }}>
                  <td data-label="Nome"><strong>{d.nome}</strong></td>
                  <td data-label="Tipo"><span className="badge b-gray">{d.tipo}</span></td>
                  <td data-label="Motivo"><div className="ellipsis" title={d.motivo}>{d.motivo || '—'}</div></td>
                  <td data-label="Status">{d.active ? <span className="badge b-green">Ativo</span> : <span className="badge b-red">Inativo</span>}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan="4"><div className="empty">Nenhuma restrição cadastrada.</div></td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={cur.id ? "Editar Restrição" : "Nova Restrição"} onClose={() => setModalOpen(false)}
          footer={<><button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={handleSave}>Salvar</button></>}
        >
          <div className="fg" style={{marginBottom: 12}}>
            <label>Nome do Bairro ou Empreendimento *</label>
            <input value={cur.nome} onChange={e => setCur({...cur, nome: e.target.value})} placeholder="Ex: Bairro Santa Luzia" />
          </div>
          <div className="fg" style={{marginBottom: 12}}>
            <label>Tipo *</label>
            <select value={cur.tipo} onChange={e => setCur({...cur, tipo: e.target.value})}>
              <option value="Bairro">Bairro</option>
              <option value="Empreendimento">Empreendimento</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div className="fg" style={{marginBottom: 12}}>
            <label>Motivo da Restrição</label>
            <textarea value={cur.motivo} onChange={e => setCur({...cur, motivo: e.target.value})} placeholder="Explique o motivo do bloqueio..." />
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: 6, marginTop: 15, cursor: 'pointer', fontSize: 13}}>
            <input type="checkbox" checked={cur.active} onChange={e => setCur({...cur, active: e.target.checked})} style={{width:'auto'}} /> Ativa
          </label>
        </Modal>
      )}
    </>
  );
}
