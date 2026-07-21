import { useState, useEffect, useCallback, useRef } from 'react';
import { getResumenInicio } from '../api';
import { useActiveView } from '../contexts/ActiveViewContext';

const EMPTY = {
  mi_actividad: [],
  recomendaciones: [],
  resumen_semanal: null,
};

/**
 * Hook del "panorama de inicio": actividad propia, recomendaciones priorizadas
 * y resumen semanal. A diferencia de useDashboard(), pide los datos una sola
 * vez (sin polling) — esta información cambia a ritmo de horas/días, no de
 * segundos.
 */
export function useResumenInicio() {
  const { activeCliente } = useActiveView();
  const clienteId = activeCliente?.id || null;

  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSeq = useRef(0);

  const fetchData = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getResumenInicio(clienteId ? { cliente: clienteId } : {});
      if (seq !== requestSeq.current) return;
      setData({ ...EMPTY, ...result });
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message || 'Error al cargar el panorama de inicio');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, loading, error, refetch: fetchData };
}
