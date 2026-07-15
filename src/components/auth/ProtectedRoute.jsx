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

// Ruta a la que cae un usuario sin acceso a la página que intentó abrir.
// Moderador/Trabajador solo tienen garantizado /clientes (sin plan propio);
// el resto de roles siempre tiene 'contratos' en su plan (está en todas las
// categorías), así que '/' (Dashboard) nunca les queda inaccesible.
export function defaultRouteFor(auth) {
  return auth.isPlatformStaff ? '/clientes' : '/';
}

/**
 * Guard de página además de sesión: antes solo existía el Sidebar ocultando
 * ítems de menú, evitable escribiendo la URL directo — un usuario sin la
 * feature/rol requerido igual montaba la página y esta le pegaba a una API
 * que respondía 403. `require` recibe el objeto completo de useAuth() y
 * decide si esta ruta es visitable; si no, redirige a un destino que el
 * propio actor sí puede ver (nunca a /login: eso es solo para 401).
 */
export function RequireAccess({ require, children }) {
  const auth = useAuth();
  const { user, checking } = auth;

  if (checking) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!require(auth)) return <Navigate to={defaultRouteFor(auth)} replace />;

  return children;
}
