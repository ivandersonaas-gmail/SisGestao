import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'forgot'
  const [forgotUser, setForgotUser] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if(e) e.preventDefault();
    if (!username || !password) {
      setError('Preencha usuário e senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const users = await api.getUsers();
      const u = users.find(x => x.username === username.trim().toLowerCase());
      if (u) {
        setForgotUser(u);
      } else {
        setError('Usuário não encontrado.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div style={{textAlign: 'center', marginBottom: '22px'}}>
          <div style={{width: '48px', height: '48px', background: 'var(--blue)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div style={{fontSize: '18px', fontWeight: 500}}>SisGestão</div>
          <div style={{fontSize: '12px', color: 'var(--text3)', marginTop: '3px'}}>Controle de Processos Urbanos</div>
        </div>

        {error && <div className="alert alert-err" style={{marginBottom: '10px'}}>{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="fg" style={{marginBottom: '11px'}}>
              <label>Usuário</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                autoComplete="username" 
                placeholder="seu.login" 
                style={{fontSize: '16px'}} 
              />
            </div>
            <div className="fg" style={{marginBottom: '8px'}}>
              <label>Senha</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                style={{fontSize: '16px'}} 
              />
            </div>
            <div style={{textAlign: 'right', marginBottom: '16px'}}>
              <button 
                type="button" 
                onClick={() => { setMode('forgot'); setError(''); setForgotUser(null); }} 
                style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--blue)', fontFamily: 'inherit', padding: '4px'}}
              >
                Esqueci minha senha
              </button>
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-full" 
              disabled={loading} 
              style={{fontSize: '15px', padding: '12px'}}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <div>
            {!forgotUser ? (
              <form onSubmit={handleForgot}>
                <div className="alert alert-info" style={{marginBottom: '10px'}}>Informe seu usuário cadastrado.</div>
                <div className="fg" style={{marginBottom: '11px'}}>
                  <label>Usuário</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    style={{fontSize: '16px'}} 
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>
              </form>
            ) : (
              <div className="alert alert-ok" style={{marginBottom: '12px', lineHeight: 1.5}}>
                <strong>{forgotUser.name}</strong><br/>
                Contate o Administrador para redefinir sua senha.<br/>
                <span style={{fontSize: '11px'}}>admin@sistema.gov</span>
              </div>
            )}
            <button 
              onClick={() => { setMode('login'); setError(''); setForgotUser(null); }} 
              className="btn btn-outline btn-full" 
              style={{marginTop: '8px'}}
            >
              ← Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
