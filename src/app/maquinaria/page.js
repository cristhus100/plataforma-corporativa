'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchPaginated } from '@/lib/supabase/paginacion';
import StatsCard from '@/components/ui/StatsCard';
import Pagination from '@/components/ui/Pagination';
import usePaginacion from '@/hooks/usePaginacion';
import { ESTADOS_MAQUINARIA } from '@/lib/utils/maquinaria';
import { useRole } from '@/context/RoleContext';
import { exportarExcel } from '@/lib/utils/exportar';
import {
  calcularEstadoAceite,
  getEstadoAceiteConfig,
  calcularEstadoFiltroCombustible,
  calcularEstadoFiltroAire,
} from '@/lib/utils/aceite';
import {
  Truck,
  CheckCircle2,
  Wrench,
  XCircle,
  Search,
  Plus,
  Eye,
  Pencil,
  ImageOff,
  FileDown,
  Wind,
} from 'lucide-react';

export default function MaquinariaPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [tipos, setTipos] = useState([]);
  const [resumen, setResumen] = useState({ total: 0, operativa: 0, mantenimiento: 0, fueraServicio: 0 });

  // Cargar tipos de maquinaria y resumen al montar
  useEffect(() => {
    async function init() {
      const [tiposRes] = await Promise.all([
        supabase.from('tipos_maquinaria').select('id, nombre').order('nombre'),
      ]);
      if (tiposRes.data) setTipos(tiposRes.data);

      // Cargar conteos para resumen
      const [totalRes, opRes, mantRes, fueraRes] = await Promise.all([
        supabase.from('maquinaria').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('maquinaria').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'operativa'),
        supabase.from('maquinaria').select('id', { count: 'exact', head: true }).eq('activo', true).in('estado', ['en_mantenimiento', 'en_reparacion']),
        supabase.from('maquinaria').select('id', { count: 'exact', head: true }).eq('activo', true).in('estado', ['fuera_servicio', 'dada_de_baja']),
      ]);

      setResumen({
        total: totalRes.count || 0,
        operativa: opRes.count || 0,
        mantenimiento: mantRes.count || 0,
        fueraServicio: fueraRes.count || 0,
      });
    }
    init();
  }, [supabase]);

  // FetchFn con paginación server-side
  const fetchFn = useCallback(async ({ page, limit, search, filtros }) => {
    let query = supabase
      .from('maquinaria')
      .select(`
        id,
        codigo_interno,
        nombre,
        marca,
        modelo,
        placa,
        numero_serie,
        estado,
        foto_url,
        activo,
        horometro_actual,
        ultimo_cambio_aceite_horometro,
        ultimo_cambio_aceite_fecha,
        ultimo_cambio_filtro_combustible_horometro,
        ultima_condicion_filtro_aire,
        tipo_maquinaria_id,
        tipos_maquinaria ( id, nombre ),
        frente_trabajo:frentes_trabajo!frente_trabajo_id(id, codigo, nombre)
      `, { count: 'exact' })
      .eq('activo', true);

    // Filtros desde el servidor
    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.tipo) {
      query = query.eq('tipo_maquinaria_id', filtros.tipo);
    }
    if (search) {
      const term = `%${search}%`;
      query = query.or(
        `codigo_interno.ilike.${term},nombre.ilike.${term},placa.ilike.${term},numero_serie.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`
      );
    }

    query = query.order('codigo_interno', { ascending: true });
    return fetchPaginated(query, page, limit);
  }, [supabase]);

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
    filtrosIniciales: { estado: '', tipo: '' },
  });

  async function exportarPDF() {
    if (typeof window === 'undefined') return;
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    // Exporta TODOS los registros filtrados (sin paginación)
    let query = supabase
      .from('maquinaria')
      .select(`
        id,
        codigo_interno,
        nombre,
        marca,
        modelo,
        placa,
        estado,
        tipo_maquinaria_id,
        tipos_maquinaria ( id, nombre ),
        frente_trabajo:frentes_trabajo!frente_trabajo_id(id, codigo, nombre)
      `)
      .eq('activo', true);

    if (paginacion.filtros?.estado) {
      query = query.eq('estado', paginacion.filtros.estado);
    }
    if (paginacion.filtros?.tipo) {
      query = query.eq('tipo_maquinaria_id', paginacion.filtros.tipo);
    }
    if (paginacion.search) {
      const term = `%${paginacion.search}%`;
      query = query.or(
        `codigo_interno.ilike.${term},nombre.ilike.${term},placa.ilike.${term},numero_serie.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`
      );
    }

    const { data } = await query.order('codigo_interno', { ascending: true });
    const exportData = data || [];

    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Maquinaria - Serviequipos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Código', 'Nombre', 'Tipo', 'Marca / Modelo', 'Placa', 'Frente', 'Estado']],
      body: exportData.map((m) => [
        m.codigo_interno || '',
        m.nombre || '',
        m.tipos_maquinaria?.nombre || '',
        [m.marca, m.modelo].filter(Boolean).join(' / '),
        m.placa || '',
        m.frente_trabajo?.codigo ? `${m.frente_trabajo.codigo} — ${m.frente_trabajo.nombre}` : '',
        ESTADOS_MAQUINARIA[m.estado]?.label || m.estado || '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 26, 26] },
    });

    doc.save(`maquinaria_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  async function exportarExcelMaquinaria() {
    const columns = [
      { key: 'codigo_interno', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'tipo_nombre', label: 'Tipo' },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'placa', label: 'Placa' },
      { key: 'frente_str', label: 'Frente' },
      { key: 'estado_label', label: 'Estado' },
      { key: 'horometro_actual', label: 'Horómetro', formatter: v => v ?? 0 },
    ]

    let query = supabase
      .from('maquinaria')
      .select('*, tipos_maquinaria:tipos_maquinaria!tipo_maquinaria_id(nombre), frente_trabajo:frentes_trabajo!frente_trabajo_id(codigo, nombre),')
      .eq('activo', true)

    // Aplicar mismos filtros
    const { estado, tipo } = paginacion.filtros
    if (estado) query = query.eq('estado', estado)
    if (tipo) query = query.eq('tipo_maquinaria_id', tipo)
    if (paginacion.search) {
      const term = `%${paginacion.search}%`
      query = query.or(`codigo_interno.ilike.${term},nombre.ilike.${term},placa.ilike.${term},numero_serie.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`)
    }

    const { data } = await query.order('codigo_interno', { ascending: true })
    const exportData = (data || []).map(m => ({
      ...m,
      tipo_nombre: m.tipos_maquinaria?.nombre || '',
      frente_str: m.frente_trabajo ? `${m.frente_trabajo.codigo} — ${m.frente_trabajo.nombre}` : '',
      estado_label: ESTADOS_MAQUINARIA[m.estado]?.label || m.estado || '',
    }))

    await exportarExcel(exportData, columns, 'maquinaria', 'Maquinaria - Serviequipos')
  }

  // Helpers para badges
  function renderAceiteBadge(m) {
    const estado = calcularEstadoAceite(m.horometro_actual, m.ultimo_cambio_aceite_horometro);
    const config = getEstadoAceiteConfig(estado);
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  function renderFiltroBadge(m) {
    const estado = calcularEstadoFiltroCombustible(m.horometro_actual, m.ultimo_cambio_filtro_combustible_horometro);
    const config = getEstadoAceiteConfig(estado);
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  function renderFiltroAireBadge(m) {
    const estado = calcularEstadoFiltroAire(m.ultima_condicion_filtro_aire);
    const config = getEstadoAceiteConfig(estado);
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
        <Wind className="w-3 h-3" />
        {config.label}
      </span>
    );
  }

  function renderEstadoBadge(estado) {
    const config = ESTADOS_MAQUINARIA[estado];
    if (!config) {
      return (
        <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          Sin estado
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  const hayFiltrosActivos = paginacion.search || paginacion.filtros.estado || paginacion.filtros.tipo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maquinaria</h1>
          <p className="text-sm text-gray-600">Gestión de equipos y maquinaria pesada</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            disabled={paginacion.total === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a PDF"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={exportarExcelMaquinaria}
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
              href="/maquinaria/nuevo"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" />
              Nueva Maquinaria
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={resumen.total} icon={Truck} color="blue" />
        <StatsCard title="Operativas" value={resumen.operativa} icon={CheckCircle2} color="green" />
        <StatsCard title="En Mantenimiento" value={resumen.mantenimiento} icon={Wrench} color="orange" />
        <StatsCard title="Fuera de Servicio" value={resumen.fueraServicio} icon={XCircle} color="red" />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, placa, serie..."
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
              {Object.entries(ESTADOS_MAQUINARIA).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={paginacion.filtros.tipo}
              onChange={(e) => paginacion.setFiltro('tipo', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
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
          <div className="p-12 text-center text-gray-500">Cargando maquinaria...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {resumen.total === 0 ? 'No hay maquinaria registrada' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {resumen.total === 0 ? 'Comienza registrando tu primer equipo.' : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {resumen.total === 0 && isAdmin && (
              <Link href="/maquinaria/nuevo" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Registrar maquinaria
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Foto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Marca / Modelo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Placa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Frente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Aceite</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Filtros</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Filtro Aire</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <Link href={`/maquinaria/${m.id}`}>
                        {m.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.foto_url} alt={m.nombre} className="h-12 w-12 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-blue-400 transition" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-blue-400 transition">
                            <ImageOff className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link href={`/maquinaria/${m.id}`} className="hover:text-blue-600 transition">{m.codigo_interno || '—'}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/maquinaria/${m.id}`} className="hover:text-blue-600 transition">{m.nombre || '—'}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.tipos_maquinaria?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{[m.marca, m.modelo].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{m.placa || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.frente_trabajo?.codigo ? `${m.frente_trabajo.codigo} — ${m.frente_trabajo.nombre}` : '—'}</td>
                    <td className="px-4 py-3">{renderEstadoBadge(m.estado)}</td>
                    <td className="px-4 py-3">{renderAceiteBadge(m)}</td>
                    <td className="px-4 py-3">{renderFiltroBadge(m)}</td>
                    <td className="px-4 py-3">{renderFiltroAireBadge(m)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/maquinaria/${m.id}`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition" title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <Link href={`/maquinaria/${m.id}/editar`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition" title="Editar">
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
