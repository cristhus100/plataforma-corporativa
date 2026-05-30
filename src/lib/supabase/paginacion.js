/**
 * Ejecuta una consulta Supabase con paginación server-side.
 *
 * @param {object} query - Supabase query builder (ej: supabase.from('tabla').select('*').eq(...))
 * @param {number} page - Número de página (1-indexed)
 * @param {number} limit - Registros por página
 * @returns {Promise<{data: Array, total: number}>}
 */
export async function fetchPaginated(query, page, limit) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, count, error } = await query
    .range(from, to)
    .count('exact', { head: true });

  if (error) throw error;
  return { data: data || [], total: count || 0 };
}
