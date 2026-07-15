import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientes } from '../api';

const DEFAULT_FILTERS = {
  search: '',
  estado: 'Todos',
  tipo: 'Todos',
  fecha_desde: '',
  fecha_hasta: '',
  ordering: '',
};

const PAGE_SIZE = 20;

/**
 * Hook que gestiona la carga de clientes desde el backend con:
 * - Paginación
 * - Filtros (search, estado, tipo, fechas)
 * - Debounce en búsqueda
 * - Estado de carga y errores
 */
export function useClientes() {
  const [data, setData]         = useState(null);   // Respuesta completa del backend
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [page, setPage]         = useState(1);
  const [filters, setFilters]   = useState(DEFAULT_FILTERS);

  // Cache para los resultados ya visitados
  const cache = useRef({});

  // Guard contra race conditions: si el usuario cambia filtros rápido, una
  // respuesta lenta y vieja no debe pisar a la más reciente.
  const requestSeq = useRef(0);

  // Debounce para búsqueda de texto
  const searchTimerRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Cuando cambia el texto de búsqueda, aplicar debounce de 350ms
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [filters.search]);

  // Fetch principal — se dispara cuando cambian filtros o página
  const fetchData = useCallback(async (options = { force: false }) => {
    const isForceRefetch = options?.force === true;
    const cacheKey = JSON.stringify({
      search: debouncedSearch,
      estado: filters.estado,
      tipo: filters.tipo,
      fecha_desde: filters.fecha_desde,
      fecha_hasta: filters.fecha_hasta,
      ordering: filters.ordering,
      page
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
      const result = await getClientes({
        search:      debouncedSearch,
        estado:      filters.estado,
        tipo:        filters.tipo,
        fecha_desde: filters.fecha_desde,
        fecha_hasta: filters.fecha_hasta,
        ordering:    filters.ordering,
        page,
        page_size: PAGE_SIZE,
      });
      cache.current[cacheKey] = result;
      if (seq !== requestSeq.current) return;
      setData(result);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err.message || 'Error al cargar clientes');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [debouncedSearch, filters.estado, filters.tipo, filters.fecha_desde, filters.fecha_hasta, filters.ordering, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actualizar un filtro individual y volver a página 1
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key !== 'search') setPage(1);  // search tiene su propio debounce
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const updateClientLocally = useCallback((updatedClient) => {
    if (!updatedClient) return;
    setData(prev => {
      if (!prev) return prev;
      const oldClient = prev.results?.find(c => c.id === updatedClient.id);
      const updatedResults = prev.results?.map(c => c.id === updatedClient.id ? { ...c, ...updatedClient } : c) ?? [];

      let nextStats = prev.stats;
      if (oldClient && prev.stats && oldClient.estado !== updatedClient.estado) {
        nextStats = { ...prev.stats };
        // Decrement old state
        if (oldClient.estado === 'Activo') nextStats.activos = Math.max(0, nextStats.activos - 1);
        else if (oldClient.estado === 'En revisión') nextStats.en_revision = Math.max(0, nextStats.en_revision - 1);
        else if (oldClient.estado === 'Inactivo') nextStats.inactivos = Math.max(0, nextStats.inactivos - 1);

        // Increment new state
        if (updatedClient.estado === 'Activo') nextStats.activos = (nextStats.activos || 0) + 1;
        else if (updatedClient.estado === 'En revisión') nextStats.en_revision = (nextStats.en_revision || 0) + 1;
        else if (updatedClient.estado === 'Inactivo') nextStats.inactivos = (nextStats.inactivos || 0) + 1;
      }

      return {
        ...prev,
        results: updatedResults,
        stats: nextStats,
      };
    });
    cache.current = {};
  }, []);

  const addClientLocally = useCallback((newClient) => {
    if (!newClient) return;
    setData(prev => {
      if (!prev) return prev;
      const updatedResults = [newClient, ...(prev.results ?? [])];
      if (updatedResults.length > PAGE_SIZE) {
        updatedResults.pop();
      }

      let nextStats = prev.stats;
      if (prev.stats) {
        nextStats = {
          ...prev.stats,
          total: (prev.stats.total || 0) + 1,
        };
        if (newClient.estado === 'Activo') nextStats.activos = (nextStats.activos || 0) + 1;
        else if (newClient.estado === 'En revisión') nextStats.en_revision = (nextStats.en_revision || 0) + 1;
        else if (newClient.estado === 'Inactivo') nextStats.inactivos = (nextStats.inactivos || 0) + 1;
      }

      return {
        ...prev,
        count: (prev.count ?? 0) + 1,
        results: updatedResults,
        stats: nextStats,
      };
    });
    cache.current = {};
  }, []);

  return {
    // Datos
    clientes:   data?.results ?? [],
    stats:      data?.stats ?? { total: 0, activos: 0, en_revision: 0, inactivos: 0 },
    totalCount: data?.count ?? 0,
    totalPages: data?.total_pages ?? 1,
    // Estado
    loading,
    error,
    // Paginación
    page,
    pageSize: PAGE_SIZE,
    setPage,
    // Filtros
    filters,
    updateFilter,
    resetFilters,
    // Refetch manual
    refetch: () => fetchData({ force: true }),
    // Actualizaciones locales
    updateClientLocally,
    addClientLocally,
  };
}
