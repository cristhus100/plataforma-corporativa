'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/ui/StatsCard';
import { ESTADOS_MAQUINARIA } from '@/lib/utils/maquinaria';
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
} from 'lucide-react';

export default function MaquinariaPage() {
  const supabase = createClient();
  const [maquinaria, setMaquinaria] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const [maqRes, tiposRes] = await Promise.all([
      supabase
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
          tipo_maquinaria_id,
          tipos_maquinaria ( id, nombre )
        `)
        .eq('activo', true)
        .order('codigo_interno', { ascending: true }),
      supabase
        .from('tipos_maquinaria')
        .select('id, nombre')
        .order('nombre'),
    ]);

    if (maqRes.error) console.error('Error maquinaria:', maqRes.error);
    if (tiposRes.error) console.error('Error tipos:', tiposRes.error);

    setMaquinaria(maqRes.data || []);
    setTipos(tiposRes.data || []);
    setLoading(false);
  }

  // Filtrado en memoria
  const maquinariaFiltrada = useMemo(() => {
    return maquinaria.filter((m) => {
      const term = search.trim().toLowerCase();

      const coincideBusqueda =
        !term ||
        m.codigo_interno?.toLowerCase().includes(term) ||
        m.nombre?.toLowerCase().includes(term) ||
        m.placa?.toLowerCase().includes(term) ||
        m.numero_serie?.toLowerCase().includes(term) ||
        m.marca?.toLowerCase().includes(term) ||
        m.modelo?.toLowerCase().includes(term);

      const coincideEstado = !filtroEstado || m.estado === filtroEstado;
      const coincideTipo =
        !filtroTipo || String(m.tipo_maquinaria_id) === String(filtroTipo);

      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  }, [maquinaria, search, filtroEstado, filtroTipo]);

  // Resumen (usando valores reales de DB en minúsculas)
  const resumen = useMemo(() => {
    return {
      total: maquinaria.length,
      operativa: maquinaria.filter((m) => m.estado === 'operativa').length,
      mantenimiento: maquinaria.filter(
        (m) => m.estado === 'en_mantenimiento' || m.estado === 'en_reparacion'
      ).length,
      fueraServicio: maquinaria.filter(
        (m) => m.estado === 'fuera_servicio' || m.estado === 'dada_de_baja'
      ).length,
    };
  }, [maquinaria]);

  async function exportarPDF() {
    if (typeof window === 'undefined') return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Maquinaria - Serviequipos', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 22)

    autoTable(doc, {
      startY: 28,
      head: [['Código', 'Nombre', 'Tipo', 'Marca / Modelo', 'Placa', 'Estado']],
      body: maquinariaFiltrada.map((m) => [
        m.codigo_interno || '',
        m.nombre || '',
        m.tipos_maquinaria?.nombre || '',
        [m.marca, m.modelo].filter(Boolean).join(' / '),
        m.placa || '',
        ESTADOS_MAQUINARIA[m.estado]?.label || m.estado || '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 26, 26] },
    })

    doc.save(`maquinaria_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function limpiarFiltros() {
    setSearch('');
    setFiltroEstado('');
    setFiltroTipo('');
  }

  // Helper para renderizar el badge de estado
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
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maquinaria</h1>
          <p className="text-sm text-gray-600">
            Gestión de equipos y maquinaria pesada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            disabled={maquinariaFiltrada.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a PDF"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          <Link
            href="/maquinaria/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Nueva Maquinaria
          </Link>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total"
          value={resumen.total}
          icon={Truck}
          variant="default"
        />
        <StatsCard
          title="Operativas"
          value={resumen.operativa}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          title="En Mantenimiento"
          value={resumen.mantenimiento}
          icon={Wrench}
          variant="warning"
        />
        <StatsCard
          title="Fuera de Servicio"
          value={resumen.fueraServicio}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Búsqueda */}
          <div className="md:col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, placa, serie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="md:col-span-3">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_MAQUINARIA).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="md:col-span-3">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(search || filtroEstado || filtroTipo) && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando <strong>{maquinariaFiltrada.length}</strong> de{' '}
              <strong>{maquinaria.length}</strong> equipos
            </span>
            <button
              onClick={limpiarFiltros}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando maquinaria...</div>
        ) : maquinariaFiltrada.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {maquinaria.length === 0
                ? 'No hay maquinaria registrada'
                : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {maquinaria.length === 0
                ? 'Comienza registrando tu primer equipo.'
                : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {maquinaria.length === 0 && (
              <Link
                href="/maquinaria/nuevo"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Foto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Marca / Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Placa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {maquinariaFiltrada.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <Link href={`/maquinaria/${m.id}`}>
                        {m.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.foto_url}
                            alt={m.nombre}
                            className="h-12 w-12 rounded-lg object-cover border border-gray-200 hover:ring-2 hover:ring-blue-400 transition"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-blue-400 transition">
                            <ImageOff className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link
                        href={`/maquinaria/${m.id}`}
                        className="hover:text-blue-600 transition"
                      >
                        {m.codigo_interno || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/maquinaria/${m.id}`}
                        className="hover:text-blue-600 transition"
                      >
                        {m.nombre || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {m.tipos_maquinaria?.nombre || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {[m.marca, m.modelo].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {m.placa || '—'}
                    </td>
                    <td className="px-4 py-3">{renderEstadoBadge(m.estado)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/maquinaria/${m.id}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/maquinaria/${m.id}/editar`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
