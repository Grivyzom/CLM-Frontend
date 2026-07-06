import { useState, useEffect, useCallback } from 'react';
import { getDashboard } from '../api';

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

/**
 * Hook que carga los datos agregados del dashboard desde el backend.
 */
export function useDashboard() {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboard();
      setData({ ...EMPTY, ...result, kpis: { ...EMPTY.kpis, ...(result.kpis || {}) } });
    } catch (err) {
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, loading, error, refetch: fetchData };
}
