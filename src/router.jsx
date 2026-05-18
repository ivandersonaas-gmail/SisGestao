import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { ProcessList } from './pages/Processes/ProcessList';
import { ProcessDetail } from './pages/Processes/ProcessDetail';

import { Armario } from './pages/Protocol/Armario';
import { Consulta } from './pages/Consult/Consulta';
import { Pending } from './pages/Pending/Pending';
import { NewProcess } from './pages/Protocol/NewProcess';
import { Receive } from './pages/Protocol/Receive';

import { Users } from './pages/Admin/Users';
import { Fiscais } from './pages/Admin/Fiscais';
import { ProcessTypes } from './pages/Admin/ProcessTypes';
import { Audit } from './pages/Admin/Audit';
import { Restricoes } from './pages/Admin/Restricoes';

import { Productivity } from './pages/Reports/Productivity';
import { AdvancedReports } from './pages/Reports/AdvancedReports';
import { ProtocolReports } from './pages/Reports/ProtocolReports';

// ... (já temos Admin components importados)

// Placeholder para as páginas que ainda vamos migrar
const Placeholder = ({ name }) => (
  <div style={{padding: 20}}><h2>{name}</h2><p>Migração em andamento...</p></div>
);

export function AppRoutes() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/new" element={<NewProcess />} />
      <Route path="/processes" element={<ProcessList />} />
      <Route path="/proc/:id" element={<ProcessDetail />} />
      <Route path="/pending" element={<Pending />} />
      <Route path="/consulta" element={<Consulta />} />
      
      {/* Analista / Sec / Gestão */}
      <Route path="/receive" element={<Receive />} />
      <Route path="/armario" element={<Armario />} />
      <Route path="/productivity" element={<Productivity />} />
      <Route path="/reports" element={<AdvancedReports />} />
      <Route path="/protocol-reports" element={<ProtocolReports />} />
      
      {/* Admin */}
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/fiscais" element={<Fiscais />} />
      <Route path="/admin/proc-types" element={<ProcessTypes />} />
      <Route path="/admin/restricoes" element={<Restricoes />} />
      <Route path="/admin/audit" element={<Audit />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
