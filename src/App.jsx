import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Shell } from './components/Layout/Shell';
import { AppRoutes } from './router';

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return <AppRoutes />;
  }

  return (
    <Shell title="SisGestão - V3" armLen={0}>
      <AppRoutes />
    </Shell>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
