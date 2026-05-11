'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/ui/StatsCard';
import { getNombreCompleto } from '@/lib/utils/trabajador';
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
  const [trabajadores, setTrabajadores] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const [trabRes, deptRes] = await Promise.all([
      supabase
        .from('trabajadores')
        .select(`
          *,
          cargo:cargos(id, nombre),
          departamento_area:departamentos(id, nombre)
        `)
        .order('primer_apellido', { ascending: true }),
      supabase
        .from('departamentos')
        .select('id, nombre')
        .order('nombre'),
    ]);

    if (trabRes.error) console.error('Error trabajadores:', trabRes.error);
    if (deptRes.error) console.error('Error departamentos:', deptRes.error);

    setTrabajadores(trabRes.data || []);
    setDepartamentos(deptRes.data || []);
    setLoading(false);
  }

  // Filtrado en memoria
  const trabajadoresFiltrados = useMemo(() => {
    return trabajadores.filter((t) => {
      const term = search.trim().toLowerCase();
      const nombreCompleto = getNombreCompleto(t).toLowerCase();

      const coincideBusqueda =
        !term ||
        nombreCompleto.includes(term) ||
        t.cedula?.toLowerCase().includes(term);

      const coincideEstado =
        !filtroEstado ||
        (filtroEstado === 'activo' && t.activo) ||
        (filtroEstado === 'inactivo' && !t.activo);

      const coincideDepto =
        !filtroDepartamento ||
        String(t.departamento_id) === String(filtroDepartamento);

      return coincideBusqueda && coincideEstado && coincideDepto;
    });
  }, [trabajadores, search, filtroEstado, filtroDepartamento]);

  // Resumen
  const resumen = useMemo(() => {
    return {
      total: trabajadores.length,
      activos: trabajadores.filter((t) => t.activo).length,
      inactivos: trabajadores.filter((t) => !t.activo).length,
    };
  }, [trabajadores]);

  async function exportarPDF() {
    if (typeof window === 'undefined') return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Trabajadores - Serviequipos', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 22)

    autoTable(doc, {
      startY: 28,
      head: [['Cédula', 'Nombre Completo', 'Cargo', 'Departamento', 'Estado']],
      body: trabajadoresFiltrados.map((t) => [
        t.cedula || '',
        getNombreCompleto(t),
        t.cargo?.nombre || t.cargo_legacy || '',
        t.departamento_area?.nombre || t.departamento_legacy || '',
        t.activo ? 'Activo' : 'Inactivo',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 26, 26] },
    })

    doc.save(`trabajadores_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  function limpiarFiltros() {
    setSearch('');
    setFiltroEstado('');
    setFiltroDepartamento('');
  }

  // Helper para renderizar el badge de estado
  function renderEstadoBadge(trabajador) {
    const activo = trabajador.activo;
    const estado = trabajador.estado || (activo ? 'activo' : 'inactivo');

    const config = {
      activo: { label: 'Activo', badge: 'border-green-200 bg-green-50 text-green-700', dot: 'bg-green-500' },
      inactivo: { label: 'Inactivo', badge: 'border-gray-200 bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
      vacaciones: { label: 'Vacaciones', badge: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
      incapacidad: { label: 'Incapacidad', badge: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
      retirado: { label: 'Retirado', badge: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
    };

    const c = config[estado] || config.inactivo;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trabajadores</h1>
          <p className="text-sm text-gray-600">
            Gestión del personal de Serviequipos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            disabled={trabajadoresFiltrados.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a PDF"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          <Link
            href="/trabajadores/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Trabajador
          </Link>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total"
          value={resumen.total}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Activos"
          value={resumen.activos}
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          title="Inactivos"
          value={resumen.inactivos}
          icon={XCircle}
          color="red"
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
                placeholder="Buscar por nombre o cédula..."
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
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>

          {/* Departamento */}
          <div className="md:col-span-3">
            <select
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(search || filtroEstado || filtroDepartamento) && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando <strong>{trabajadoresFiltrados.length}</strong> de{' '}
              <strong>{trabajadores.length}</strong> trabajadores
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
          <div className="p-12 text-center text-gray-500">Cargando trabajadores...</div>
        ) : trabajadoresFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {trabajadores.length === 0
                ? 'No hay trabajadores registrados'
                : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {trabajadores.length === 0
                ? 'Comienza registrando tu primer trabajador.'
                : 'Intenta ajustar los filtros de búsqueda.'}
            </p>
            {trabajadores.length === 0 && (
              <Link
                href="/trabajadores/nuevo"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Cédula
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Nombre Completo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Cargo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Departamento
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
                {trabajadoresFiltrados.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link
                        href={`/trabajadores/${t.id}`}
                        className="hover:text-blue-600 transition"
                      >
                        {t.cedula || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link
                        href={`/trabajadores/${t.id}`}
                        className="hover:text-blue-600 transition"
                      >
                        {getNombreCompleto(t)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {t.cargo?.nombre || t.cargo_legacy || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {t.departamento_area?.nombre || t.departamento_legacy || '—'}
                    </td>
                    <td className="px-4 py-3">{renderEstadoBadge(t)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/trabajadores/${t.id}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/trabajadores/${t.id}/editar`}
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
