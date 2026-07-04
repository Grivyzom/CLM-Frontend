import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Estado inicial basado en localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('clm_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('clm_user', JSON.stringify(userData));
    localStorage.setItem('clm_token', 'mock_secure_jwt_token_123'); // Token de sesión falso para frontend
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('clm_user');
    localStorage.removeItem('clm_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
