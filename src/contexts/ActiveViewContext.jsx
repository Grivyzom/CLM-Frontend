import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

/**
 * ActiveViewContext — "Vista activa" de la plataforma.
 *
 * Dos modos:
 *  - Administración Global (activeCliente = null): métricas y listados de
 *    todos los clientes del tenant.
 *  - Vista de cliente (activeCliente = { id, nombre }): dashboard, contratos
 *    y stats acotados a esa empresa (los hooks mandan ?cliente=<id> y el
 *    backend revalida el alcance con scoped()).
 *
 * La selección persiste en localStorage atada al id del usuario: al cambiar
 * de cuenta no se hereda la vista de otra persona.
 */

const STORAGE_KEY = 'clm_active_view';

const ActiveViewContext = createContext({
  activeCliente: null,
  isGlobalView: true,
  setClienteView: () => {},
  setGlobalView: () => {},
});

function readStored(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && saved.userId === userId && saved.cliente?.id) {
      return { id: saved.cliente.id, nombre: saved.cliente.nombre || '' };
    }
  } catch (_) {}
  return null;
}

export function ActiveViewProvider({ children }) {
  const { user, isClienteExterno } = useAuth();
  const userId = user?.id ?? null;

  const [activeCliente, setActiveCliente] = useState(() =>
    userId && !isClienteExterno ? readStored(userId) : null
  );

  // Al cambiar de usuario (login/logout) se restaura su vista guardada.
  // El rol CLIENTE ya viene acotado por el backend: siempre vista global.
  useEffect(() => {
    setActiveCliente(userId && !isClienteExterno ? readStored(userId) : null);
  }, [userId, isClienteExterno]);

  const persist = useCallback((cliente) => {
    if (!userId) return;
    if (cliente) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, cliente }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [userId]);

  const setClienteView = useCallback((cliente) => {
    if (!cliente?.id) return;
    const next = { id: cliente.id, nombre: cliente.nombre || '' };
    setActiveCliente(next);
    persist(next);
  }, [persist]);

  const setGlobalView = useCallback(() => {
    setActiveCliente(null);
    persist(null);
  }, [persist]);

  const value = useMemo(() => ({
    activeCliente,
    isGlobalView: !activeCliente,
    setClienteView,
    setGlobalView,
  }), [activeCliente, setClienteView, setGlobalView]);

  return (
    <ActiveViewContext.Provider value={value}>
      {children}
    </ActiveViewContext.Provider>
  );
}

export function useActiveView() {
  return useContext(ActiveViewContext);
}
