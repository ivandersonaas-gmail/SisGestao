import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Modal } from '../../components/UI/Modal';

export function Feriados() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cur, setCur] = useState({ id: null, data: '', nome: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getFeriados();
      setData(res);
    } catch (e) {
      console.error(e);
      alert('Erro ao carregar feriados: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!cur.data || !cur.nome.trim()) {
      alert('Preencha a data e o nome do feriado.');
      return;
    }
    try {
      await api.saveFeriado(cur);
      setModalOpen(false);
      loadData();
    } catch (err) {
      alert('Erro ao salvar feriado: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este feriado?')) return;
    try {
      await api.deleteFeriado(id);
      loadData();
    } catch (err) {
      alert('Erro ao excluir feriado: ' + err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <>
      <div className="card">
        <div className="card-title">
          Cadastro de Feriados
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => { setCur({ id: null, data: '', nome: '' }); setModalOpen(true); }}
          >
            + Novo Feriado
          </button>
        </div>
        <p style={{fontSize: '12px', color: 'var(--text3)', marginBottom: '15px'}}>
          Os feriados cadastrados aqui serão automaticamente deduzidos do cálculo de prazos de todos os processos (além dos sábados e domingos).
        </p>

        {loading ? (
          <div className="empty">Carregando feriados...</div>
        ) : data.length === 0 ? (
          <div className="empty">Nenhum feriado municipal ou nacional cadastrado. O sistema considerará apenas fins de semana por padrão.</div>
        ) : (
          <table className="rt">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome / Descrição</th>
                <th style={{width: '100px', textAlign: 'center'}}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id}>
                  <td data-label="Data" className="mono" style={{fontWeight: 500}}>
                    {formatDate(d.data)}
                  </td>
                  <td data-label="Descrição">{d.nome}</td>
                  <td data-label="Ações" style={{textAlign: 'center'}}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{color: 'var(--red)', padding: '2px 8px'}} 
                      onClick={() => handleDelete(d.id)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal 
          title="Cadastrar Feriado" 
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
            </>
          }
        >
          <div className="fg" style={{marginBottom: 12}}>
            <label>Data do Feriado</label>
            <input 
              type="date" 
              value={cur.data} 
              onChange={e => setCur({...cur, data: e.target.value})} 
            />
          </div>
          <div className="fg" style={{marginBottom: 12}}>
            <label>Nome / Descrição</label>
            <input 
              type="text" 
              placeholder="Ex: Tiradentes, Padroeira Municipal" 
              value={cur.nome} 
              onChange={e => setCur({...cur, nome: e.target.value})} 
            />
          </div>
        </Modal>
      )}
    </>
  );
}
