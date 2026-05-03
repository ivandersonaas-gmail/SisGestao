import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

const AL={LOGIN:'b-green',LOGOUT:'b-gray',CADASTRO:'b-blue',MOVIMENTO:'b-purple',ASSUMIDO:'b-amber',ATRIBUIÇÃO:'b-teal',USUARIO_CRIADO:'b-blue',USUARIO_EDITADO:'b-amber',USUARIO_ATIVADO:'b-green',USUARIO_DESATIVADO:'b-red',SENHA_RESET:'b-amber',SISTEMA_INICIADO:'b-gray'};

export function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAudit().then(setLogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <div className="card-title">Auditoria do Sistema (Últimos 200 eventos)</div>
      {loading ? <div className="empty">Carregando auditoria...</div> : (
        <table className="rt" style={{fontSize: '12px'}}>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Alvo</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td data-label="Data">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                <td data-label="Usuário" style={{fontWeight: 500}}>{log.user_name}</td>
                <td data-label="Ação"><span className={`badge ${AL[log.action]||'b-gray'}`} style={{fontSize: '10px'}}>{log.action}</span></td>
                <td data-label="Alvo">{log.target}</td>
                <td data-label="Detalhes" style={{color: 'var(--text3)'}}>{log.details}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan="5"><div className="empty">Nenhum registro.</div></td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
