'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchPaginated } from '@/lib/supabase/paginacion';
import { useRole } from '@/context/RoleContext';
import StatsCard from '@/components/ui/StatsCard';
import Pagination from '@/components/ui/Pagination';
import usePaginacion from '@/hooks/usePaginacion';
import {
  Car,
  CheckCircle2,
  Wrench,
  XCircle,
  Search,
  Plus,
  Eye,
  Pencil,
  ImageOff,
  FileDown,
} from 'lucide-react';
import { ESTADOS_VEHICULO } from '@/lib/utils/vehiculo';
import { exportarExcel } from '@/lib/utils/exportar';

export default function VehiculosPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [resumen, setResumen] = useState({ total: 0, operativos: 0, mantenimiento: 0, fueraServicio: 0 });

  // Cargar resumen al montar
  useEffect(() => {
    async function loadResumen() {
      const [totalRes, opRes, mantRes, fueraRes] = await Promise.all([
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'operativo'),
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'en_mantenimiento'),
        supabase.from('vehiculos').select('id', { count: 'exact', head: true }).eq('activo', true).in('estado', ['fuera_servicio', 'dado_de_baja']),
      ]);

      setResumen({
        total: totalRes.count || 0,
        operativos: opRes.count || 0,
        mantenimiento: mantRes.count || 0,
        fueraServicio: fueraRes.count || 0,
      });
    }
    loadResumen();
  }, [supabase]);

  // FetchFn con paginación server-side
  const fetchFn = useCallback(async ({ page, limit, search, filtros }) => {
    let query = supabase
      .from('vehiculos')
      .select('*', { count: 'exact' })
      .eq('activo', true);

    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }
    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `placa.ilike.${term},nombre.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`
      );
    }

    query = query.order('placa', { ascending: true });
    return fetchPaginated(query, page, limit);
  }, [supabase]);

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
    filtrosIniciales: { estado: '', tipo: '' },
  });

  // Extraer tipos únicos de los datos cargados
  const tipos = [...new Set(paginacion.data.map(v => v.tipo).filter(Boolean))].sort();

  const hayFiltrosActivos = paginacion.search || paginacion.filtros.estado || paginacion.filtros.tipo;

  function renderEstadoBadge(estado) {
    const config = ESTADOS_VEHICULO[estado];
    if (!config) return (
      <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">Sin estado</span>
    );
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  async function exportarPDF() {
    if (typeof window === 'undefined') return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    // Exporta todos los registros filtrados (sin paginación)
    let query = supabase
      .from('vehiculos')
      .select('*')
      .eq('activo', true)

    if (paginacion.filtros?.estado) {
      query = query.eq('estado', paginacion.filtros.estado)
    }
    if (paginacion.filtros?.tipo) {
      query = query.eq('tipo', paginacion.filtros.tipo)
    }
    if (paginacion.search) {
      const term = `%${paginacion.search}%`
      query = query.or(
        `placa.ilike.${term},nombre.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`
      )
    }

    const { data } = await query.order('placa', { ascending: true })
    const exportData = data || []

    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Vehículos - Serviequipos', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 22)

    autoTable(doc, {
      startY: 28,
      head: [['Placa', 'Nombre', 'Marca', 'Modelo', 'Año', 'Estado']],
      body: exportData.map((v) => [
        v.placa || '',
        v.nombre || '',
        v.marca || '',
        v.modelo || '',
        v.anio ? String(v.anio) : '',
        ESTADOS_VEHICULO[v.estado]?.label || v.estado || '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 26, 26] },
    })

    doc.save(`vehiculos_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  async function exportarExcelFn() {
    const columns = [
      { key: 'placa', label: 'Placa' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'anio', label: 'Año' },
      { key: 'estado', label: 'Estado', formatter: (val) => ESTADOS_VEHICULO[val]?.label || val || '' },
    ]
    await exportarExcel(paginacion.data, columns, 'vehiculos', 'Vehículos - Serviequipos')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-600">Gestión de vehículos livianos y utilitarios</p>
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
          <Link href="/vehiculos/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />
            Nuevo Vehículo
          </Link>
        )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={resumen.total} icon={Car} variant="default" />
        <StatsCard title="Operativos" value={resumen.operativos} icon={CheckCircle2} variant="success" />
        <StatsCard title="En Mantenimiento" value={resumen.mantenimiento} icon={Wrench} variant="warning" />
        <StatsCard title="Fuera de Servicio" value={resumen.fueraServicio} icon={XCircle} variant="danger" />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar por placa, nombre, marca..."
                value={paginacion.search}
                onChange={e => paginacion.setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="md:col-span-3">
            <select value={paginacion.filtros.estado} onChange={e => paginacion.setFiltro('estado', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_VEHICULO).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select value={paginacion.filtros.tipo} onChange={e => paginacion.setFiltro('tipo', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
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
          <div className="p-12 text-center text-gray-500">Cargando vehículos...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {resumen.total === 0 ? 'No hay vehículos registrados' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {resumen.total === 0 ? 'Comienza registrando tu primer vehículo.' : 'Intenta ajustar los filtros.'}
            </p>
            {resumen.total === 0 && isAdmin && (
              <Link href="/vehiculos/nuevo" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Registrar vehículo
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Foto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Marca</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Modelo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Año</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <Link href={`/vehiculos/${v.id}`}>
                        {v.foto_url ? (
                          <img src={v.foto_url} alt={v.nombre} className="h-12 w-12 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 border border-gray-200">
                            <ImageOff className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link href={`/vehiculos/${v.id}`} className="hover:text-blue-600">{v.placa || '—'}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/vehiculos/${v.id}`} className="hover:text-blue-600">{v.nombre || '—'}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.marca || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.modelo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{v.anio || '—'}</td>
                    <td className="px-4 py-3">{renderEstadoBadge(v.estado)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/vehiculos/${v.id}`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition" title="Ver">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                        <Link href={`/vehiculos/${v.id}/editar`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition" title="Editar">
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
