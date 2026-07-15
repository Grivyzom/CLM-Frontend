import { useState, useEffect, useCallback, useRef } from 'react';
import { getContratos, getContratoStats } from '../api';
import { useActiveView } from '../contexts/ActiveViewContext';

const DEFAULT_FILTERS = {
  search: '',
  etapa: 'Todos',
  software: '',
  ordering: '',
};

const DEFAULT_PAGE_SIZE = 20;

/**
 * Hook que gestiona la carga de contratos desde el backend con:
 * - Paginación
 * - Filtros (search, etapa, software)
 * - Debounce en búsqueda
 * - Stats globales (StatsStrip)
 * - Estado de carga y errores
 *
 * @param {Object} [options]
 * @param {number} [options.pageSize] - Tamaño de página (la vista Kanban pide uno mayor
 *   que la tabla para poder repartir tarjetas entre las columnas de etapa).
 */
export function useContratos({ pageSize = DEFAULT_PAGE_SIZE } = {}) {
  // Vista activa: con un cliente seleccionado, lista y stats se acotan a él.
  const { activeCliente } = useActiveView();
  const clienteId = activeCliente?.id || null;

  const [data, setData]       = useState(null);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const cache = useRef({});

  // Guard contra race conditions: si el usuario cambia filtros rápido, una
  // respuesta lenta y vieja no debe pisar a la más reciente.
  const requestSeq = useRef(0);

  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [filters.search]);

  const fetchData = useCallback(async (options = { force: false }) => {
    const isForceRefetch = options?.force === true;
    const cacheKey = JSON.stringify({
      search: debouncedSearch,
      etapa: filters.etapa,
      software: filters.software,
      ordering: filters.ordering,
      cliente: clienteId,
      page,
      pageSize,
    });

    if (!isForceRefetch && cache.current[cacheKey]) {
      setData(cache.current[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getContratos({
        search:   debouncedSearch,
        etapa:    filters.etapa,
        software: filters.software,
        cliente:  clienteId,
        ordering: filters.ordering,
        page,
        page_size: pageSize,
      });
      cache.current[cacheKey] = result;
      if (seq !== requestSeq.current) return;
      setData(result);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message || 'Error al cargar contratos');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, filters.etapa, filters.software, filters.ordering, clienteId, page, pageSize]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getContratoStats(clienteId ? { cliente: clienteId } : {});
      setStats(result);
    } catch (err) {
      // Stats son secundarios: no bloquean la vista si fallan.
      setStats(null);
    }
  }, [clienteId]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, clienteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key !== 'search') setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const refetch = useCallback(() => {
    fetchData({ force: true });
    fetchStats();
  }, [fetchData, fetchStats]);

  return {
    contratos:  data?.results ?? [],
    stats,
    totalCount: data?.count ?? 0,
    totalPages: data?.total_pages ?? 1,
    loading,
    error,
    page,
    pageSize,
    setPage,
    filters,
    updateFilter,
    resetFilters,
    refetch,
  };
}
