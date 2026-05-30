'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import StatsCard from '@/components/ui/StatsCard';
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

export default function VehiculosPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [vehiculos, setVehiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Paginación
  const ROWS_PER_PAGE = 25;
  const [page, setPage] = useState(1);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('activo', true)
      .order('placa', { ascending: true });

    if (error) console.error('Error:', error);
    setVehiculos(data || []);
    setLoading(false);
  }

  const tipos = useMemo(() => {
    const set = new Set();
    vehiculos.forEach(v => { if (v.tipo) set.add(v.tipo); });
    return Array.from(set).sort();
  }, [vehiculos]);

  const filtrados = useMemo(() => {
    return vehiculos.filter(v => {
      const term = search.trim().toLowerCase();
      const matchBusq = !term ||
        v.placa?.toLowerCase().includes(term) ||
        v.nombre?.toLowerCase().includes(term) ||
        v.marca?.toLowerCase().includes(term) ||
        v.modelo?.toLowerCase().includes(term);
      const matchEstado = !filtroEstado || v.estado === filtroEstado;
      const matchTipo = !filtroTipo || v.tipo === filtroTipo;
      return matchBusq && matchEstado && matchTipo;
    });
  }, [vehiculos, search, filtroEstado, filtroTipo]);

  const resumen = useMemo(() => ({
    total: vehiculos.length,
    operativos: vehiculos.filter(v => v.estado === 'operativo').length,
    mantenimiento: vehiculos.filter(v => v.estado === 'en_mantenimiento').length,
    fueraServicio: vehiculos.filter(v => v.estado === 'fuera_servicio').length,
  }), [vehiculos]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtrados.length / ROWS_PER_PAGE));
  const paginaActual = Math.min(page, totalPages);
  const vehiculosPagina = filtrados.slice(
    (paginaActual - 1) * ROWS_PER_PAGE,
    paginaActual * ROWS_PER_PAGE
  );

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

  function limpiarFiltros() {
    setSearch(''); setFiltroEstado(''); setFiltroTipo(''); setPage(1);
  }

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filtroEstado, filtroTipo]);

  async function exportarPDF() {
    if (typeof window === 'undefined') return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('Vehículos - Serviequipos', 14, 15)
    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 14, 22)

    autoTable(doc, {
      startY: 28,
      head: [['Placa', 'Nombre', 'Marca', 'Modelo', 'Año', 'Estado']],
      body: filtrados.map((v) => [
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-600">Gestión de vehículos livianos y utilitarios</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportarPDF}
            disabled={filtrados.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a PDF"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
          {isAdmin && (
          <Link href="/vehiculos/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />
            Nuevo Vehículo
          </Link>
        )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total" value={resumen.total} icon={Car} variant="default" />
        <StatsCard title="Operativos" value={resumen.operativos} icon={CheckCircle2} variant="success" />
        <StatsCard title="En Mantenimiento" value={resumen.mantenimiento} icon={Wrench} variant="warning" />
        <StatsCard title="Fuera de Servicio" value={resumen.fueraServicio} icon={XCircle} variant="danger" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar por placa, nombre, marca..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="md:col-span-3">
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS_VEHICULO).map(([k, c]) => (
                <option key={k} value={k}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Todos los tipos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {(search || filtroEstado || filtroTipo) && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">Mostrando <strong>{filtrados.length}</strong> de <strong>{vehiculos.length}</strong> vehículos</span>
            <button onClick={limpiarFiltros} className="text-blue-600 hover:text-blue-700 font-medium">Limpiar filtros</button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando vehículos...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Car className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {vehiculos.length === 0 ? 'No hay vehículos registrados' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {vehiculos.length === 0 ? 'Comienza registrando tu primer vehículo.' : 'Intenta ajustar los filtros.'}
            </p>
            {vehiculos.length === 0 && isAdmin && (
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
                {vehiculosPagina.map(v => (
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

        {/* Paginación */}
        {!loading && filtrados.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm text-gray-600">
              Mostrando {(paginaActual - 1) * ROWS_PER_PAGE + 1}–{Math.min(paginaActual * ROWS_PER_PAGE, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={paginaActual <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(paginaActual - 2, totalPages - 4));
                const pageNum = start + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-lg ${
                      pageNum === paginaActual
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-300 hover:bg-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={paginaActual >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
