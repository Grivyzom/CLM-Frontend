import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirige al login y guarda la ruta intentada para volver luego
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
