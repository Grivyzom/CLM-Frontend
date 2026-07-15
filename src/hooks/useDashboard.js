import { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboard } from '../api';
import { useActiveView } from '../contexts/ActiveViewContext';

const EMPTY = {
  kpis: {
    mrr: { value: 0, variacion_pct: 0 },
    contratos_activos: { value: 0, nuevos_mes: 0 },
    clientes_activos: { value: 0, nuevos_mes: 0 },
    renovaciones_30d: { value: 0, monto: 0 },
    requieren_accion: { value: 0 },
    sin_documento: { value: 0 },
  },
  mrr_series: { softwares: [], data: [] },
  pipeline: [],
  renovaciones: [],
  urgent_contracts: [],
  actividad: [],
};

// Caché en memoria para evitar recargas al navegar, una entrada por vista
// activa ('global' o 'cliente:<id>').
const dashboardCache = {};

/**
 * Hook que carga los datos agregados del dashboard desde el backend.
 * Respeta la Vista activa: con un cliente seleccionado, las métricas
 * llegan acotadas a esa empresa.
 */
export function useDashboard() {
  const { activeCliente } = useActiveView();
  const clienteId = activeCliente?.id || null;
  const viewKey = clienteId ? `cliente:${clienteId}` : 'global';

  const [data, setData] = useState(dashboardCache[viewKey] || EMPTY);
  const [loading, setLoading] = useState(!dashboardCache[viewKey]);
  const [error, setError] = useState(null);

  // Guard anti-race: al cambiar de vista rápido, una respuesta vieja y lenta
  // no debe pisar a la de la vista actual.
  const requestSeq = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    if (!force && dashboardCache[viewKey]) {
      setData(dashboardCache[viewKey]);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboard(clienteId ? { cliente: clienteId } : {});
      const newData = { ...EMPTY, ...result, kpis: { ...EMPTY.kpis, ...(result.kpis || {}) } };
      dashboardCache[viewKey] = newData;
      if (seq !== requestSeq.current) return;
      setData(newData);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [viewKey, clienteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { ...data, loading, error, refetch };
}
