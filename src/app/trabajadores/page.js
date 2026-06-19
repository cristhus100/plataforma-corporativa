'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchPaginated } from '@/lib/supabase/paginacion';
import StatsCard from '@/components/ui/StatsCard';
import Pagination from '@/components/ui/Pagination';
import usePaginacion from '@/hooks/usePaginacion';
import { getNombreCompleto, getEstadoTrabajador } from '@/lib/utils/trabajador';
import { useRole } from '@/context/RoleContext';
import { exportarExcel } from '@/lib/utils/exportar';
import {
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Eye,
  Pencil,
  FileDown,
} from 'lucide-react';

export default function TrabajadoresPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [departamentos, setDepartamentos] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, activos: 0, inactivos: 0 });

  // Cargar departamentos y resumen al montar
  useEffect(() => {
    async function init() {
      const [deptRes, totalRes, actRes] = await Promise.all([
        supabase.from('departamentos').select('id, nombre').order('nombre'),
        supabase.from('trabajadores').select('id', { count: 'exact', head: true }),
        supabase.from('trabajadores').select('id', { count: 'exact', head: true }).eq('activo', true),
      ]);

      if (deptRes.data) setDepartamentos(deptRes.data);
      setResumen({
        total: totalRes.count || 0,
        activos: actRes.count || 0,
        inactivos: (totalRes.count || 0) - (actRes.count || 0),
      });
    }
    init();
  }, [supabase]);

  // FetchFn con paginación server-side
  const fetchFn = useCallback(async ({ page, limit, search, filtros }) => {
    let query = supabase
      .from('trabajadores')
      .select(`
        *,
        cargo:cargos(id, nombre),
        departamento_area:departamentos(id, nombre),
        frente_trabajo:frentes_trabajo!frente_trabajo_id(id, codigo, nombre)
      `, { count: 'exact' });

    // Filtros desde el servidor
    if (filtros?.estado === 'activo') {
      query = query.eq('activo', true);
    } else if (filtros?.estado === 'inactivo') {
      query = query.eq('activo', false);
    } else if (['vacaciones', 'incapacidad', 'retirado'].includes(filtros?.estado)) {
      query = query.eq('estado', filtros.estado);
    }

    if (filtros?.departamento) {
      query = query.eq('departamento_id', filtros.departamento);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `primer_nombre.ilike.${term},segundo_nombre.ilike.${term},primer_apellido.ilike.${term},segundo_apellido.ilike.${term},cedula.ilike.${term}`
      );
    }

    query = query.order('primer_apellido', { ascending: true });
    return fetchPaginated(query, page, limit);
  }, [supabase]);

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
    filtrosIniciales: { estado: '', departamento: '' },
  });

  async function exportarPDF() {
    if (typeof window === 'undefined') return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    // Exporta TODOS los registros filtrados
    let query = supabase
      .from('trabajadores')
      .select(`
        *,
        cargo:cargos(id, nombre),
        departamento_area:departamentos(id, nombre)
      `);

    if (paginacion.filtros?.estado === 'activo') {
      query = query.eq('activo', true);
    } else if (paginacion.filtros?.estado === 'inactivo') {
      query = query.eq('activo', false);
    } else if (['vacaciones', 'incapacidad', 'retirado'].includes(paginacion.filtros?.estado)) {
      query = query.eq('estado', paginacion.filtros.estado);
    }
    if (paginacion.filtros?.departamento) {
      query = query.eq('departamento_id', paginacion.filtros.departamento);
    }
    if (paginacion.search) {
      const term = `%${paginacion.search}%`;
      query = query.or(
        `primer_nombre.ilike.${term},segundo_nombre.ilike.${term},primer_apellido.ilike.${term},segundo_apellido.ilike.${term},cedula.ilike.${term}`
      );
    }

    const { data } = await query.order('primer_apellido', { ascending: true });
    const exportData = data || [];

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Empleados - Serviequipos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Cédula', 'Nombre Completo', 'Cargo', 'Departamento', 'Estado']],
      body: exportData.map((t) => [
        t.cedula || '',
        getNombreCompleto(t),
        t.cargo?.nombre || t.cargo_legacy || '',
        t.departamento_area?.nombre || t.departamento_legacy || '',
        t.activo ? 'Activo' : 'Inactivo',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 26, 26] },
    });

    doc.save(`trabajadores_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async function exportarExcelFn() {
    const columns = [
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre_completo', label: 'Nombre Completo', formatter: (v, item) => getNombreCompleto(item) },
      { key: 'cargo_nombre', label: 'Cargo', formatter: (v, item) => item.cargo?.nombre || '' },
      { key: 'departamento_nombre', label: 'Departamento', formatter: (v, item) => item.departamento_area?.nombre || '' },
      { key: 'activo', label: 'Estado', formatter: (v) => v ? 'Activo' : 'Inactivo' },
    ];
    const data = (paginacion.data || []).map((item) =>
      columns.reduce((acc, col) => ({ ...acc, [col.label]: col.formatter ? col.formatter(item[col.key], item) : (item[col.key] ?? '') }), {})
    );
    await exportarExcel(data, columns, 'trabajadores', 'Empleados - Serviequipos');
  }

  function renderEstadoBadge(trabajador) {
    const c = getEstadoTrabajador(trabajador);
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  }

  const hayFiltrosActivos = paginacion.search || paginacion.filtros.estado || paginacion.filtros.departamento;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-600">Gestión del personal de Serviequipos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            disabled={paginacion.total === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a PDF"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          <button
            onClick={exportarExcelFn}
            disabled={paginacion.total === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a Excel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>
          {isAdmin && (
            <Link
              href="/trabajadores/nuevo"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Nuevo Empleado
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard title="Total" value={resumen.total} icon={Users} color="blue" />
        <StatsCard title="Activos" value={resumen.activos} icon={CheckCircle2} color="green" />
        <StatsCard title="Inactivos" value={resumen.inactivos} icon={XCircle} color="red" />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
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
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="incapacidad">Incapacidad</option>
              <option value="retirado">Retirado</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={paginacion.filtros.departamento}
              onChange={(e) => paginacion.setFiltro('departamento', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
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
          <div className="p-12 text-center text-gray-500">Cargando trabajadores...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {resumen.total === 0 ? 'No hay trabajadores registrados' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {resumen.total === 0 ? 'Comienza registrando tu primer trabajador.' : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {resumen.total === 0 && isAdmin && (
              <Link href="/trabajadores/nuevo" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Registrar trabajador
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cédula</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre Completo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Departamento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Frente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link href={`/trabajadores/${t.id}`} className="hover:text-blue-600 transition">{t.cedula || '—'}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/trabajadores/${t.id}`} className="hover:text-blue-600 transition">{getNombreCompleto(t)}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.cargo?.nombre || t.cargo_legacy || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.departamento_area?.nombre || t.departamento_legacy || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.frente_trabajo?.codigo ? `${t.frente_trabajo.codigo} — ${t.frente_trabajo.nombre}` : '—'}</td>
                    <td className="px-4 py-3">{renderEstadoBadge(t)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/trabajadores/${t.id}`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition" title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <Link href={`/trabajadores/${t.id}/editar`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition" title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
