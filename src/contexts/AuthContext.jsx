import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('sg_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch(e) {
        localStorage.removeItem('sg_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const loggedInUser = await api.login(username, password);
    setUser(loggedInUser);
    localStorage.setItem('sg_user', JSON.stringify(loggedInUser));
    await api.log('LOGIN', loggedInUser.name, 'Login efetuado', loggedInUser);
  };

  const logout = async () => {
    if(user) {
      await api.log('LOGOUT', user.name, '', user).catch(() => {});
    }
    setUser(null);
    localStorage.removeItem('sg_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
