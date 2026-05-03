import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export function NewProcess() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [protocol, setProtocol] = useState('');
  const [requester, setRequester] = useState('');
  const [type, setType] = useState('');
  const [bairro, setBairro] = useState('');
  const [empreendimento, setEmpreendimento] = useState('');
  const [sysTypes, setSysTypes] = useState([]);
  const [restricoes, setRestricoes] = useState([]);
  const [restrictionAlert, setRestrictionAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProcessTypes().then(setSysTypes).catch(console.error);
    api.getRestricoes().then(setRestricoes).catch(console.error);
  }, []);

  const checkRestriction = (valor, tipo) => {
    if (!valor || valor.length < 3) {
      setRestrictionAlert(null);
      return;
    }
    const v = valor.toLowerCase().trim();
    const achado = restricoes.find(r => 
      r.active && 
      (r.tipo === tipo || r.tipo === 'Outro') && 
      v.includes(r.nome.toLowerCase().trim())
    );
    if (achado) {
      setRestrictionAlert({ nome: achado.nome, motivo: achado.motivo });
    } else {
      setRestrictionAlert(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!protocol || !requester || !type) {
      setError('Preencha os dados básicos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const proc = {
        protocol: protocol.toUpperCase(),
        requester: requester.toUpperCase(),
        type,
        bairro: bairro.toUpperCase(),
        empreendimento: empreendimento.toUpperCase(),
        created_by_id: user.id,
        created_by_name: user.name,
        current_status: 'ENTRADA',
        movement_count: 1
      };
      const created = await api.createProcess(proc);
      
      const mov = {
        process_id: created.id,
        status: 'ENTRADA',
        label: 'Entrada no Protocolo',
        notes: 'Processo recém autuado e incluído no sistema.',
        created_by_id: user.id,
        created_by_name: user.name
      };
      await api.addMovement(created.id, mov.status, mov.notes, user);
      
      navigate(`/proc/${created.id}`);
    } catch(err) {
      setError('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{maxWidth: '600px', margin: '0 auto'}}>
      <div className="card-title">Cadastrar Novo Processo</div>
      <div className="alert alert-info" style={{marginBottom: '16px'}}>
        Seja rigoroso ao digitar o número do protocolo.
      </div>
      <form onSubmit={handleSubmit}>
        <div className="fg" style={{marginBottom: '12px'}}>
          <label>Nº do Protocolo *</label>
          <input 
            type="text" 
            value={protocol} 
            onChange={e => setProtocol(e.target.value.toUpperCase())} 
            placeholder="Ex: 00123/2026" 
            autoFocus 
          />
        </div>
        <div className="fg" style={{marginBottom: '12px'}}>
          <label>Nome do Requerente *</label>
          <input 
            type="text" 
            value={requester} 
            onChange={e => setRequester(e.target.value.toUpperCase())} 
            placeholder="NOME COMPLETO" 
          />
        </div>
        <div className="fg" style={{marginBottom: '12px'}}>
          <label>Tipo de Processo *</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="">Selecione o tipo...</option>
            {sysTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px'}}>
          <div className="fg">
            <label>Bairro</label>
            <input 
              type="text" 
              value={bairro} 
              onChange={e => { setBairro(e.target.value); checkRestriction(e.target.value, 'Bairro'); }} 
              placeholder="Ex: Santa Luzia" 
            />
          </div>
          <div className="fg">
            <label>Empreendimento</label>
            <input 
              type="text" 
              value={empreendimento} 
              onChange={e => { setEmpreendimento(e.target.value); checkRestriction(e.target.value, 'Empreendimento'); }} 
              placeholder="Ex: Res. Sol Nascente" 
            />
          </div>
        </div>

        {restrictionAlert && (
          <div className="alert alert-warn" style={{borderLeft: '5px solid var(--red)', marginBottom: '16px'}}>
            <strong>⚠️ ALERTA DE RESTRIÇÃO: {restrictionAlert.nome.toUpperCase()}</strong><br/>
            <span style={{fontSize: '12px'}}>{restrictionAlert.motivo || 'Este local possui restrições para análise técnica.'}</span>
          </div>
        )}
        
        {error && <div className="alert alert-err">{error}</div>}
        
        <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Gravando...' : 'Cadastrar Processo'}
          </button>
        </div>
      </form>
    </div>
  );
}
