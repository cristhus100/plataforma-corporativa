'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchPaginated } from '@/lib/supabase/paginacion';
import StatsCard from '@/components/ui/StatsCard';
import Pagination from '@/components/ui/Pagination';
import usePaginacion from '@/hooks/usePaginacion';
import { useRole } from '@/context/RoleContext';
import {
  getTipoBadge,
  getTipoDot,
  getPrioridadBadge,
  getPrioridadDot,
  getEstadoBadge,
  getEstadoDot,
  getEstadoLabel,
  getTipoLabel,
  getPrioridadLabel,
  formatearFecha,
  getEstadoProgramacion,
} from '@/lib/utils/ordenes_mantenimiento';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  Pencil,
  Filter,
  Calendar,
} from 'lucide-react';

export default function OrdenesMantenimientoPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [resumen, setResumen] = useState({ total: 0, pendientes: 0, enProceso: 0, completadas: 0 });

  // Cargar resumen al montar
  useEffect(() => {
    async function init() {
      const [totalRes, pendRes, procRes, compRes] = await Promise.all([
        supabase.from('ordenes_mantenimiento').select('id', { count: 'exact', head: true }),
        supabase.from('ordenes_mantenimiento').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('ordenes_mantenimiento').select('id', { count: 'exact', head: true }).eq('estado', 'en_proceso'),
        supabase.from('ordenes_mantenimiento').select('id', { count: 'exact', head: true }).eq('estado', 'completado'),
      ]);

      setResumen({
        total: totalRes.count || 0,
        pendientes: pendRes.count || 0,
        enProceso: procRes.count || 0,
        completadas: compRes.count || 0,
      });
    }
    init();
  }, [supabase]);

  // FetchFn con paginación server-side
  const fetchFn = useCallback(async ({ page, limit, search, filtros }) => {
    let query = supabase
      .from('ordenes_mantenimiento')
      .select(`
        *,
        maquinaria:maquinaria!maquinaria_id(id, codigo_interno, nombre),
        vehiculo:vehiculos!vehiculo_id(id, nombre, placa),
        frente_trabajo:frentes_trabajo!frente_trabajo_id(id, codigo, nombre),
        responsable:trabajadores!responsable_id(id, nombre, primer_apellido)
      `, { count: 'exact' });

    // Filtros
    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }
    if (filtros?.prioridad) {
      query = query.eq('prioridad', filtros.prioridad);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `codigo.ilike.${term},titulo.ilike.${term},descripcion.ilike.${term}`
      );
    }

    query = query.order('created_at', { ascending: false });
    return fetchPaginated(query, page, limit);
  }, [supabase]);

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
    filtrosIniciales: { estado: '', tipo: '', prioridad: '' },
  });

  const hayFiltrosActivos = paginacion.search || paginacion.filtros.estado || paginacion.filtros.tipo || paginacion.filtros.prioridad;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Mantenimiento</h1>
          <p className="text-sm text-gray-600">Gestión de mantenimientos programados y correctivos</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/mantenimiento/ordenes/nueva"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Órdenes" value={resumen.total} icon={ClipboardList} color="blue" />
        <StatsCard title="Pendientes" value={resumen.pendientes} icon={Clock} color="yellow" />
        <StatsCard title="En Proceso" value={resumen.enProceso} icon={AlertTriangle} color="orange" />
        <StatsCard title="Completadas" value={resumen.completadas} icon={CheckCircle2} color="green" />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código o título..."
                value={paginacion.search}
                onChange={(e) => paginacion.setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <select
              value={paginacion.filtros.estado}
              onChange={(e) => paginacion.setFiltro('estado', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completado">Completadas</option>
              <option value="cancelado">Canceladas</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={paginacion.filtros.tipo}
              onChange={(e) => paginacion.setFiltro('tipo', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
              <option value="predictivo">Predictivo</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={paginacion.filtros.prioridad}
              onChange={(e) => paginacion.setFiltro('prioridad', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
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

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {paginacion.loading ? (
          <div className="p-12 text-center text-gray-500">Cargando órdenes de mantenimiento...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {resumen.total === 0 ? 'No hay órdenes de mantenimiento' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {resumen.total === 0 ? 'Comienza creando tu primera orden de mantenimiento.' : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {resumen.total === 0 && isAdmin && (
              <Link href="/mantenimiento/ordenes/nueva" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Crear orden
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Equipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Frente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Programada</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map((o) => {
                  const progEstado = getEstadoProgramacion(o.fecha_programada, o.estado);
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                        <Link href={`/mantenimiento/ordenes/${o.id}`} className="hover:text-blue-600 transition">{o.codigo || '—'}</Link>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <Link href={`/mantenimiento/ordenes/${o.id}`} className="hover:text-blue-600 transition">{o.titulo}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTipoBadge(o.tipo)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${getTipoDot(o.tipo)}`} />
                          {getTipoLabel(o.tipo)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getPrioridadBadge(o.prioridad)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${getPrioridadDot(o.prioridad)}`} />
                          {getPrioridadLabel(o.prioridad)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEstadoBadge(o.estado)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${getEstadoDot(o.estado)}`} />
                          {getEstadoLabel(o.estado)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {o.maquinaria ? (
                          <Link href={`/maquinaria/${o.maquinaria_id}`} className="hover:text-blue-600">
                            {o.maquinaria.codigo_interno} — {o.maquinaria.nombre}
                          </Link>
                        ) : o.vehiculo ? (
                          <Link href={`/vehiculos/${o.vehiculo_id}`} className="hover:text-blue-600">
                            {o.vehiculo.nombre} ({o.vehiculo.placa})
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{o.frente_trabajo?.codigo ? `${o.frente_trabajo.codigo} — ${o.frente_trabajo.nombre}` : '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1 ${progEstado.color}`}>
                          <Calendar className="h-3.5 w-3.5" />
                          {formatearFecha(o.fecha_programada)}
                        </span>
                        <span className={`ml-2 text-xs ${progEstado.color}`}>{progEstado.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/mantenimiento/ordenes/${o.id}`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition" title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Link>
                          {isAdmin && o.estado !== 'completado' && o.estado !== 'cancelado' && (
                            <Link href={`/mantenimiento/ordenes/${o.id}/editar`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación server-side */}
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
