import { useState, useEffect, useCallback } from 'react';
import { getDashboard } from '../api';

const EMPTY = {
  kpis: {
    contratos_activos: { value: 0, nuevos_mes: 0 },
    clientes_activos: { value: 0, nuevos_mes: 0 },
    ingresos_mes: { value: 0, variacion_pct: 0 },
    tasa_retencion: { value: 0 },
    por_vencer_7dias: { value: 0 },
    servicios: { activos: 0, total: 0 },
  },
  chart_area: { softwares: [], data: [] },
  chart_bar: { softwares: [], data: [] },
  urgent_contracts: [],
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
      setData(result);
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
