import { useState, useEffect, useCallback } from 'react';
import { getAnalytics } from '../api';

const EMPTY = {
  kpis: {
    valor_cartera: { value: 0, contratos: 0 },
    arr: { value: 0 },
    ticket_promedio: { value: 0 },
    duracion_media: { value: 0 },
    mix_recurrente: { value: 0 },
  },
  salud_cartera: { por_estado: [], pct_riesgo: 0, monto_riesgo: 0, contratos_riesgo: [] },
  flujo_contratos: [],
  vencimientos: [],
  por_software: [],
  top_clientes: [],
  por_tipo: [],
  por_sla: [],
};

// Caché en memoria para evitar recargas al navegar
let cachedAnalyticsData = null;

/**
 * Hook que carga las métricas analíticas desde el backend.
 */
export function useAnalytics() {
  const [data, setData] = useState(cachedAnalyticsData || EMPTY);
  const [loading, setLoading] = useState(!cachedAnalyticsData);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    if (!force && cachedAnalyticsData) {
      setData(cachedAnalyticsData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getAnalytics();
      const newData = {
        ...EMPTY,
        ...result,
        kpis: { ...EMPTY.kpis, ...(result.kpis || {}) },
        salud_cartera: { ...EMPTY.salud_cartera, ...(result.salud_cartera || {}) },
      };
      cachedAnalyticsData = newData;
      setData(newData);
    } catch (err) {
      setError(err.message || 'Error al cargar analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { ...data, loading, error, refetch };
}
