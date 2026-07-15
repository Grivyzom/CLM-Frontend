import { useState, useEffect, useCallback, useRef } from 'react';
import { getIncidencias, getIncidenciaStats, getIncidenciaDetail } from '../api';

const DEFAULT_FILTERS = {
  search: '',
  estado: '',
  severidad: '',
  asignado_a: '',
};

const DEFAULT_PAGE_SIZE = 20;
const DETAIL_POLL_MS = 30000;

/**
 * Hook que gestiona la carga de incidencias con:
 * - Paginación, filtros (search, estado, severidad, asignado_a), debounce en búsqueda
 * - Stats (solo relevantes para staff)
 * - Detalle de una incidencia seleccionada, con polling cada 30s para reflejar
 *   comentarios/cambios de estado hechos por la otra parte (cliente <-> staff)
 *   sin recargar la página (no hay WebSockets en el proyecto).
 */
export function useIncidencias({ pageSize = DEFAULT_PAGE_SIZE, canSeeStats = true } = {}) {
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const cache = useRef({});
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
      estado: filters.estado,
      severidad: filters.severidad,
      asignado_a: filters.asignado_a,
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
      const result = await getIncidencias({
        search: debouncedSearch,
        estado: filters.estado,
        severidad: filters.severidad,
        asignado_a: filters.asignado_a,
        page,
        page_size: pageSize,
      });
      cache.current[cacheKey] = result;
      if (seq !== requestSeq.current) return;
      setData(result);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message || 'Error al cargar incidencias');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, filters.estado, filters.severidad, filters.asignado_a, page, pageSize]);

  const fetchStats = useCallback(async () => {
    if (!canSeeStats) return;
    try {
      setStats(await getIncidenciaStats());
    } catch (err) {
      setStats(null);
    }
  }, [canSeeStats]);

  const fetchDetail = useCallback(async (id, { silent = false } = {}) => {
    if (!id) return;
    if (!silent) setDetailLoading(true);
    try {
      const result = await getIncidenciaDetail(id);
      setDetail(result);
    } catch (err) {
      if (!silent) setDetail(null);
    } finally {
      if (!silent) setDetailLoading(false);
    }
  }, []);

  useEffect(() => { setPage(1); }, [pageSize]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetchDetail(selectedId);
    const intervalId = setInterval(() => fetchDetail(selectedId, { silent: true }), DETAIL_POLL_MS);
    return () => clearInterval(intervalId);
  }, [selectedId, fetchDetail]);

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
    if (selectedId) fetchDetail(selectedId);
  }, [fetchData, fetchStats, fetchDetail, selectedId]);

  return {
    incidencias: data?.results ?? [],
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
    selectedId,
    setSelectedId,
    detail,
    detailLoading,
    refetch,
  };
}
