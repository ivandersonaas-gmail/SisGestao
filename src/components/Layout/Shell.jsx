import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES, avcol } from '../../config/constants';
import { Avatar } from '../UI/Avatar';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  PlusSquare, 
  BarChart2, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Bell, 
  List, 
  Scan,
  Menu
} from 'lucide-react';

export function Shell({ children, title, actions, armLen = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const r = user.role;
  const c = avcol(user.username);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavItem = ({ icon: Icon, label, to, badge }) => (
    <NavLink 
      to={to} 
      className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
      onClick={() => setSidebarOpen(false)}
    >
      <Icon size={16} />
      <span>{label}</span>
      {badge ? <span className="nav-badge">{badge}</span> : null}
    </NavLink>
  );

  return (
    <div className="shell">
      {sidebarOpen && (
        <div 
          className="sidebar-overlay show" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="main-sidebar">
        <div className="sb-logo">
          <div className="logo-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize: '13px', fontWeight: 500}}>SisGestão</div>
            <div style={{fontSize: '10px', color: 'var(--text3)'}}>Processos Urbanos</div>
          </div>
        </div>
        
        <nav className="sb-nav">
          {r === 'protocol' && (
            <>
              <div className="nav-section">Protocolo</div>
              <NavItem icon={LayoutDashboard} label="Dashboard" to="/" />
              <NavItem icon={PlusSquare} label="Novo Processo" to="/new" />
              <NavItem icon={FileText} label="Meus Processos" to="/processes" />
              <NavItem icon={Bell} label="Aguardando Ação" to="/pending" />
              <NavItem icon={Users} label="Gestão de Fiscais" to="/admin/fiscais" />
              <NavItem icon={Search} label="Consultar Processo" to="/consulta" />
            </>
          )}

          {r === 'analyst' && (
            <>
              <div className="nav-section">Analista</div>
              <NavItem icon={LayoutDashboard} label="Dashboard" to="/" />
              <NavItem icon={Scan} label="Registrar Recebimento" to="/receive" />
              <NavItem icon={Package} label="Armário do Setor" to="/armario" badge={armLen > 0 ? armLen : null} />
              <NavItem icon={FileText} label="Meus Processos" to="/processes" />
              <NavItem icon={Search} label="Consultar Processo" to="/consulta" />
              <NavItem icon={BarChart2} label="Minha Produtividade" to="/productivity" />
              <NavItem icon={BarChart2} label="Relatórios Avançados" to="/reports" />
            </>
          )}

          {r === 'secretary' && (
            <>
              <div className="nav-section">Secretaria</div>
              <NavItem icon={LayoutDashboard} label="Painel Geral" to="/" />
              <NavItem icon={FileText} label="Todos os Processos" to="/processes" />
              <NavItem icon={Bell} label="Aguard. Assinatura" to="/pending" />
              <NavItem icon={Package} label="Armário do Setor" to="/armario" badge={armLen > 0 ? armLen : null} />
              <NavItem icon={Search} label="Consultar Processo" to="/consulta" />
              <NavItem icon={BarChart2} label="Produtividade" to="/productivity" />
            </>
          )}

          {r === 'admin' && (
            <>
              <div className="nav-section">Gestão</div>
              <NavItem icon={LayoutDashboard} label="Painel Geral" to="/" />
              <NavItem icon={FileText} label="Todos os Processos" to="/processes" />
              <NavItem icon={PlusSquare} label="Novo Processo" to="/new" />
              <NavItem icon={Bell} label="Aguardando Ação" to="/pending" />
              <NavItem icon={Package} label="Armário do Setor" to="/armario" badge={armLen > 0 ? armLen : null} />
              <NavItem icon={Search} label="Consultar Processo" to="/consulta" />
              <NavItem icon={BarChart2} label="Produtividade" to="/productivity" />
              
              <div className="nav-section">Administração</div>
              <NavItem icon={Users} label="Usuários" to="/admin/users" />
              <NavItem icon={List} label="Tipos de Processo" to="/admin/proc-types" />
              <NavItem icon={ShieldCheck} label="Restrições" to="/admin/restricoes" />
              <NavItem icon={Users} label="Gestão de Fiscais" to="/admin/fiscais" />
              <NavItem icon={BarChart2} label="Relatórios" to="/reports" />
              <NavItem icon={ShieldCheck} label="Auditoria" to="/admin/audit" />
            </>
          )}
        </nav>
        
        <div className="sb-user">
          <div className="sb-user-info">
            <Avatar user={user} size={40} />
            <div style={{flex: 1, minWidth: 0}}>
              <div className="sb-user-name">{user.name}</div>
              <div className="sb-user-role">{ROLES[user.role]?.label}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={15} />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>
      
      <div className="content">
        <div className="topbar no-print">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} color="var(--text)" />
          </button>
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">{actions}</div>
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
