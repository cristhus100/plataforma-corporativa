'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchPaginated } from '@/lib/supabase/paginacion';
import Pagination from '@/components/ui/Pagination';
import usePaginacion from '@/hooks/usePaginacion';
import { useRole } from '@/context/RoleContext';
import { formatValorContable } from '@/lib/utils/contabilidad';
import {
  Search,
  Plus,
  Eye,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';

export default function ComprobantesPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [tipos, setTipos] = useState([]);

  // Cargar tipos para el filtro
  useEffect(() => {
    supabase
      .from('tipo_comprobantes')
      .select('id, codigo, nombre')
      .order('codigo')
      .then(({ data }) => { if (data) setTipos(data); });
  }, [supabase]);

  const fetchFn = useCallback(async ({ page, limit, search, filtros }) => {
    let query = supabase
      .from('comprobantes')
      .select(`
        id,
        numero_comprobante,
        fecha,
        concepto,
        total_debito,
        total_credito,
        estado,
        origen,
        tipo_comprobante_id,
        tipo_comprobantes ( id, codigo, nombre )
      `, { count: 'exact' });

    if (filtros?.tipo) {
      query = query.eq('tipo_comprobante_id', filtros.tipo);
    }
    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.fecha_desde) {
      query = query.gte('fecha', filtros.fecha_desde);
    }
    if (filtros?.fecha_hasta) {
      query = query.lte('fecha', filtros.fecha_hasta + 'T23:59:59');
    }
    if (search) {
      const term = `%${search}%`;
      query = query.or(`numero_comprobante.ilike.${term},concepto.ilike.${term}`);
    }

    query = query.order('fecha', { ascending: false });
    return fetchPaginated(query, page, limit);
  }, [supabase]);

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
    filtrosIniciales: { tipo: '', estado: '', fecha_desde: '', fecha_hasta: '' },
  });

  function getEstadoBadge(estado) {
    if (estado === 'activo') {
      return 'border-green-200 bg-green-50 text-green-700';
    }
    return 'border-red-200 bg-red-50 text-red-700';
  }

  function getEstadoDot(estado) {
    return estado === 'activo' ? 'bg-green-500' : 'bg-red-500';
  }

  const hayFiltrosActivos = paginacion.search || paginacion.filtros.tipo || paginacion.filtros.estado || paginacion.filtros.fecha_desde || paginacion.filtros.fecha_hasta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comprobantes Contables</h1>
          <p className="text-sm text-gray-600">Gestión de comprobantes y asientos contables</p>
        </div>
        {isAdmin && (
          <Link
            href="/contabilidad/comprobante/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Comprobante
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número o concepto..."
                value={paginacion.search}
                onChange={(e) => paginacion.setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <select
              value={paginacion.filtros.tipo}
              onChange={(e) => paginacion.setFiltro('tipo', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={paginacion.filtros.estado}
              onChange={(e) => paginacion.setFiltro('estado', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={paginacion.filtros.fecha_desde}
              onChange={(e) => paginacion.setFiltro('fecha_desde', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Desde"
              title="Fecha desde"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={paginacion.filtros.fecha_hasta}
              onChange={(e) => paginacion.setFiltro('fecha_hasta', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Hasta"
              title="Fecha hasta"
            />
          </div>
        </div>

        {hayFiltrosActivos && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando <strong>{paginacion.total}</strong> resultados
            </span>
            <button onClick={paginacion.limpiarFiltros} className="text-blue-600 hover:text-blue-700 font-medium">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {paginacion.loading ? (
          <div className="p-12 text-center text-gray-500">Cargando comprobantes...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {paginacion.total === 0 ? 'No hay comprobantes registrados' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {paginacion.total === 0 ? 'Comienza registrando el primer comprobante.' : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {paginacion.total === 0 && isAdmin && (
              <Link
                href="/contabilidad/comprobante/nuevo"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo Comprobante
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">N°</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Concepto</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Débitos</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Créditos</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link href={`/contabilidad/comprobante/${c.id}`} className="hover:text-blue-600 transition">
                        {c.numero_comprobante}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{c.tipo_comprobantes?.codigo || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {new Date(c.fecha).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{c.concepto}</td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-gray-700">
                      {formatValorContable(c.total_debito)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-gray-700">
                      {formatValorContable(c.total_credito)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEstadoBadge(c.estado)}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getEstadoDot(c.estado)}`} />
                        {c.estado === 'activo' ? 'Activo' : 'Anulado'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/contabilidad/comprobante/${c.id}`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!paginacion.loading && paginacion.totalPages > 1 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4">
            <Pagination
              page={paginacion.page}
              totalPages={paginacion.totalPages}
              onPageChange={paginacion.setPage}
              isLoading={paginacion.loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
