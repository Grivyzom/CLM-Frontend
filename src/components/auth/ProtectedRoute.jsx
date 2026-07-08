import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  // Mientras se valida la sesión real contra el backend, no redirigir todavía
  // (evita expulsar al login a un usuario con sesión válida por un flash inicial).
  if (checking) {
    return null;
  }

  if (!user) {
    // Redirige al login y guarda la ruta intentada para volver luego
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
