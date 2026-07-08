import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiMe } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Estado inicial optimista (solo para pintar nombre/iniciales sin flash);
  // la fuente de verdad real es la cookie de sesión Django, verificada abajo.
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('clm_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [checking, setChecking] = useState(true);

  // Al montar, valida contra el backend que la sesión Django siga activa.
  // Si expiró o nunca existió, limpia el estado local (localStorage no es
  // fuente de autenticación, solo cache de display).
  useEffect(() => {
    let cancelled = false;
    apiMe()
      .then((data) => {
        if (cancelled) return;
        const freshUser = {
          name: data.username,
          role: data.is_staff ? 'Administrador' : 'Usuario',
          initials: data.username.substring(0, 2).toUpperCase(),
        };
        setUser(freshUser);
        localStorage.setItem('clm_user', JSON.stringify(freshUser));
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        localStorage.removeItem('clm_user');
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => { cancelled = true; };
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('clm_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('clm_user');
  };

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
