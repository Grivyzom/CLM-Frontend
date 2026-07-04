import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientes } from '../api';

const DEFAULT_FILTERS = {
  search: '',
  estado: 'Todos',
  tipo: 'Todos',
  fecha_desde: '',
  fecha_hasta: '',
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
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getClientes({
        search:      debouncedSearch,
        estado:      filters.estado,
        tipo:        filters.tipo,
        fecha_desde: filters.fecha_desde,
        fecha_hasta: filters.fecha_hasta,
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.estado, filters.tipo, filters.fecha_desde, filters.fecha_hasta, page]);

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
    refetch: fetchData,
  };
}
