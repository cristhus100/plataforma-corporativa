'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook de paginación server-side.
 *
 * Recibe una función `fetchFn` que hace la llamada al backend
 * con los parámetros { page, limit, search, filtros }
 * y debe retornar { data: [], total: number }.
 *
 * Uso:
 *   const paginacion = usePaginacion({
 *     fetchFn: async ({ page, limit, search }) => {
 *       const { data, count } = await supabase...
 *         .range((page-1)*limit, page*limit - 1)
 *       return { data, total: count };
 *     },
 *     limit: 25,
 *     searchDelay: 300,
 *   });
 *
 *   // paginacion.data        -> array de la página actual
 *   // paginacion.total        -> total de registros (sin paginar)
 *   // paginacion.totalPages   -> Math.ceil(total / limit)
 *   // paginacion.page         -> página actual
 *   // paginacion.setPage(n)
 *   // paginacion.search       -> string de búsqueda
 *   // paginacion.setSearch(s)
 *   // paginacion.filtros      -> { key: value }
 *   // paginacion.setFiltro(key, value)
 *   // paginacion.limpiarFiltros()
 *   // paginacion.loading      -> boolean
 *   // paginacion.refetch()
 */
export default function usePaginacion({
  fetchFn,
  limit: initialLimit = 25,
  searchDelay = 300,
  filtrosIniciales = {},
}) {
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [search, setSearch] = useState('');
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  // Reiniciar página al cambiar filtros o búsqueda
  const setSearchDebounced = useCallback(
    (value) => {
      setSearch(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setPage(1);
      }, searchDelay);
    },
    [searchDelay]
  );

  const setFiltro = useCallback((key, value) => {
    setFiltros((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
    setPage(1);
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros(filtrosIniciales);
    setSearch('');
    setPage(1);
  }, [filtrosIniciales]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchData = useCallback(async () => {
    if (!fetchFn) return;
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn({ page, limit, search, filtros });
      if (mountedRef.current) {
        setData(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (err) {
      console.error('Error en usePaginacion:', err);
      if (mountedRef.current) {
        setError(err?.message || 'Error al cargar datos');
        setData([]);
        setTotal(0);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, page, limit, search, filtros]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    total,
    totalPages,
    page,
    setPage,
    search,
    setSearch: setSearchDebounced,
    filtros,
    setFiltro,
    limpiarFiltros,
    loading,
    error,
    refetch: fetchData,
  };
}
