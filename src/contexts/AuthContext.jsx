import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiMe } from '../api';

const AuthContext = createContext();

const ROLE_LABELS = {
  TENANT_ADMIN: 'Administrador de Cuenta',
  OPERADOR: 'Operador',
  AUDITOR: 'Auditor Legal',
  CLIENTE: 'Cliente',
  MODERADOR: 'Moderador',
  TRABAJADOR: 'Trabajador',
};

// Normaliza el payload de auth/login y auth/me a la forma que usa la UI.
// El gating visual (módulos por plan, acciones por rol) sale de acá; el
// backend revalida todo en cada petición — esto es solo UX.
export function buildUserFromApi(data) {
  // rawRole: rol de tenant (TENANT_ADMIN/OPERADOR/AUDITOR) o de plataforma
  // (MODERADOR/TRABAJADOR) — son planos distintos pero nunca coexisten
  // (platform_role solo viene poblado cuando tenant es null).
  const rawRole = data.role || data.platform_role || null;
  return {
    id: data.id,
    name: data.username,
    fullName: data.full_name || '',
    initials: data.username.substring(0, 2).toUpperCase(),
    role: data.is_superadmin ? 'Superadmin' : (ROLE_LABELS[rawRole] || 'Usuario'),
    rawRole,
    isSuperadmin: !!data.is_superadmin,
    clienteId: data.cliente_id || null,
    tenant: data.tenant || null,
    plan: data.plan || null,
    features: data.plan?.features || [],
  };
}

export function AuthProvider({ children }) {
  // Estado inicial optimista (solo para pintar nombre/iniciales sin flash);
  // la fuente de verdad real es la cookie de sesión Django, verificada abajo.
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('clm_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  // Al montar, valida contra el backend que la sesión Django siga activa.
  // Si expiró o nunca existió, limpia el estado local (localStorage no es
  // fuente de autenticación, solo cache de display).
  //
  // Excepción: si es un visitante anónimo fresco parado en /login (sin cache
  // previa), no tiene sentido pegarle a auth/me antes de que ingrese
  // credenciales. Solo se salta el fetch en ese caso puntual; con cache
  // existente o en cualquier otra ruta se valida igual que siempre.
  // Nota: `location` se lee a propósito solo en el valor inicial del mount —
  // este efecto corre una sola vez ([] deps) porque AuthProvider no se
  // remonta al navegar, así que no hace falta re-evaluarlo por ruta.
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      localStorage.removeItem('clm_user');
    };
    window.addEventListener('auth:logout', handleForceLogout);

    const isFreshVisitorOnLogin = location.pathname === '/login' && !localStorage.getItem('clm_user');
    if (isFreshVisitorOnLogin) {
      setChecking(false);
      return () => {
        window.removeEventListener('auth:logout', handleForceLogout);
      };
    }

    let cancelled = false;
    apiMe()
      .then((data) => {
        if (cancelled) return;
        const freshUser = buildUserFromApi(data);
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
      
    return () => { 
      cancelled = true; 
      window.removeEventListener('auth:logout', handleForceLogout);
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('clm_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('clm_user');
  };

  // Superadmin ve todo; usuarios de tenant, solo lo que su plan incluye.
  // Moderador/Trabajador no tienen plan (features=[]) — no deben leer aquí,
  // usar isPlatformStaff / canAccessClientes según corresponda.
  const hasFeature = (feature) =>
    !!user && (user.isSuperadmin || (user.features || []).includes(feature));

  const isModerador = !!user && user.rawRole === 'MODERADOR';
  const isTrabajador = !!user && user.rawRole === 'TRABAJADOR';
  const isPlatformStaff = !!user && (user.isSuperadmin || isModerador || isTrabajador);

  const isClienteExterno = !!user && user.rawRole === 'CLIENTE';

  // Vista Clientes: solo para administradores/moderadores y usuarios internos con permiso.
  // Un CLIENTE externo nunca debe ver esta vista.
  const canAccessClientes = !!user && !isClienteExterno && (hasFeature('clientes') || isPlatformStaff);

  // Escrituras bloqueadas para Auditor Legal, Cliente Externo, tenants suspendidos y Trabajador
  // (rol de solo lectura). Moderador escribe igual que Superadmin.
  const canWrite = !!user && (
    user.isSuperadmin || isModerador ||
    (!isPlatformStaff && user.rawRole !== 'AUDITOR' && user.rawRole !== 'CLIENTE' && user.tenant?.estado !== 'SUSPENDIDO')
  );

  const isTenantAdmin = !!user && (user.isSuperadmin || user.rawRole === 'TENANT_ADMIN');

  return (
    <AuthContext.Provider value={{
      user, checking, login, logout, hasFeature, canWrite, isTenantAdmin,
      isModerador, isTrabajador, isPlatformStaff, canAccessClientes, isClienteExterno,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
