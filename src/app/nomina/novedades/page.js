'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { agregarNovedad } from '@/actions/nomina';
import {
  Search, Plus, Eye, Loader2, AlertTriangle,
  CircleCheck, CircleX, Filter, X,
} from 'lucide-react';
import { exportarExcel } from '@/lib/utils/exportar'
import { useToast } from '@/context/ToastContext';

const ESTADO_BADGES = {
  pendiente: { badge: 'border-yellow-300 bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500', label: 'Pendiente' },
  aprobada: { badge: 'border-green-300 bg-green-50 text-green-700', dot: 'bg-green-500', label: 'Aprobada' },
  rechazada: { badge: 'border-red-300 bg-red-50 text-red-700', dot: 'bg-red-500', label: 'Rechazada' },
};
function EstadoBadge({ estado }) {
  const c = ESTADO_BADGES[estado] || ESTADO_BADGES.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

export default function NovedadesPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [novedades, setNovedades] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [tiposNovedad, setTiposNovedad] = useState([]);

  // Filtros
  const [filtroTrabajador, setFiltroTrabajador] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');

  // Formulario nueva novedad
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoForm, setNuevoForm] = useState({
    trabajador_id: '',
    tipo_novedad_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    valor: '',
    descripcion: '',
  });
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState(null);

  useEffect(() => { cargarDatosIniciales(); }, []);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setError(null);

      const [trabRes, tiposRes, novRes] = await Promise.all([
        supabase.from('trabajadores').select('id, nombre, primer_apellido, cedula').eq('activo', true).order('primer_apellido'),
        supabase.from('tipo_novedades').select('*').eq('activo', true).order('nombre'),
        supabase
          .from('novedades_nomina')
          .select(`
            *,
            trabajador:trabajador_id(id, nombre, primer_apellido, cedula),
            tipo_novedad:tipo_novedad_id(id, codigo, nombre, tipo)
          `)
          .eq('activo', true)
          .order('created_at', { ascending: false }),
      ]);

      setTrabajadores(trabRes.data || []);
      setTiposNovedad(tiposRes.data || []);
      setNovedades(novRes.data || []);
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al cargar novedades', { type: 'error' }) } catch(e) {}
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoChange = (e) => {
    const { name, value } = e.target;
    setNuevoForm(prev => {
      const updated = { ...prev, [name]: value };

      // Auto-calculate dias
      if (name === 'fecha_inicio' || name === 'fecha_fin') {
        if (updated.fecha_inicio && updated.fecha_fin) {
          const inicio = new Date(updated.fecha_inicio);
          const fin = new Date(updated.fecha_fin);
          const diffMs = fin - inicio;
          if (diffMs >= 0) {
            updated.dias = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
          }
        }
      }

      return updated;
    });
  };

  const handleCrearNovedad = async (e) => {
    e.preventDefault();
    setCreando(true);
    setErrorCrear(null);

    try {
      const result = await agregarNovedad(nuevoForm);
      if (result.error) throw new Error(result.error);

      setMostrarForm(false);
      setNuevoForm({
        trabajador_id: '', tipo_novedad_id: '', fecha_inicio: '',
        fecha_fin: '', valor: '', descripcion: '',
      });
      cargarDatosIniciales();
    } catch (err) {
      setErrorCrear(err.message || 'Error al crear novedad');
    } finally {
      setCreando(false);
    }
  };

  // Filtrado local
  const novedadesFiltradas = novedades.filter((n) => {
    if (filtroTrabajador && n.trabajador_id !== Number(filtroTrabajador)) return false;
    if (filtroEstado && n.estado !== filtroEstado) return false;
    if (filtroFechaInicio && new Date(n.fecha_inicio) < new Date(filtroFechaInicio)) return false;
    if (filtroFechaFin && new Date(n.fecha_inicio) > new Date(filtroFechaFin)) return false;
    return true;
  });

  const hayFiltros = filtroTrabajador || filtroEstado || filtroFechaInicio || filtroFechaFin;

  const limpiarFiltros = () => {
    setFiltroTrabajador('');
    setFiltroEstado('');
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
  };

  async function exportarExcelFn() {
    const columns = [{"key":"tipo","label":"Tipo"},{"key":"trabajador","label":"Trabajador"},{"key":"fecha_inicio","label":"Inicio","formatter":"(v) => v ? new Date(v).toLocaleDateString('es-CO') : ''"},{"key":"fecha_fin","label":"Fin","formatter":"(v) => v ? new Date(v).toLocaleDateString('es-CO') : ''"},{"key":"valor","label":"Valor","formatter":"(v) => `$${Number(v || 0).toLocaleString('es-CO')}`"}]
    const data = (novedadesFiltradas || []).map(item => ({
      ...columns.reduce((acc, col) => ({ ...acc, [col.label]: col.formatter ? col.formatter(item[col.key], item) : (item[col.key] ?? '') }), {})
    }))
    await exportarExcel(data, columns, 'novedades_nomina', 'Novedades de Nómina - Serviequipos')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando novedades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Novedades de N&oacute;mina</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error al cargar datos</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button onClick={cargarDatosIniciales} className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition">Reintentar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novedades de N&oacute;mina</h1>
          <p className="text-sm text-gray-600">Gesti&oacute;n de incapacidades, permisos, bonos y descuentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/nomina"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            &larr; Volver a N&oacute;mina
          </Link>
          <button
            onClick={exportarExcelFn}
            disabled={novedadesFiltradas.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a Excel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => { setMostrarForm(!mostrarForm); setErrorCrear(null); }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {mostrarForm ? 'Cancelar' : 'Nueva Novedad'}
            </button>
          )}
        </div>
      </div>

      {/* Formulario nueva novedad */}
      {mostrarForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar Novedad</h2>

          {errorCrear && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{errorCrear}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleCrearNovedad} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trabajador <span className="text-red-500">*</span>
              </label>
              <select
                name="trabajador_id"
                value={nuevoForm.trabajador_id}
                onChange={handleNuevoChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.primer_apellido} ({t.cedula})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Novedad <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_novedad_id"
                value={nuevoForm.tipo_novedad_id}
                onChange={handleNuevoChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {tiposNovedad.map((tn) => (
                  <option key={tn.id} value={tn.id}>{tn.nombre} ({tn.tipo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="number"
                name="valor"
                value={nuevoForm.valor}
                onChange={handleNuevoChange}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_inicio"
                value={nuevoForm.fecha_inicio}
                onChange={handleNuevoChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input
                type="date"
                name="fecha_fin"
                value={nuevoForm.fecha_fin}
                onChange={handleNuevoChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">D&iacute;as</label>
              <input
                type="number"
                name="dias"
                value={nuevoForm.dias || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripci&oacute;n</label>
              <textarea
                name="descripcion"
                value={nuevoForm.descripcion}
                onChange={handleNuevoChange}
                rows={2}
                placeholder="Descripci&oacute;n de la novedad..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button
                type="submit"
                disabled={creando}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creando ? 'Guardando...' : 'Guardar Novedad'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={filtroTrabajador}
                onChange={(e) => setFiltroTrabajador(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos los trabajadores</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.primer_apellido}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-3">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Fecha desde"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Fecha hasta"
            />
          </div>
          <div className="md:col-span-1 flex items-center">
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Novedades
            <span className="ml-2 text-sm font-normal text-gray-500">({novedadesFiltradas.length} registros)</span>
          </h2>
        </div>

        {novedadesFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {novedades.length === 0 ? 'No hay novedades registradas' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {novedades.length === 0 ? 'Registra la primera novedad usando el bot&oacute;n superior.' : 'Intenta ajustar los filtros.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Trabajador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo Novedad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fechas</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">D&iacute;as</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Descripci&oacute;n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {novedadesFiltradas.map((n) => {
                  const t = n.trabajador;
                  const nombre = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() : '—';
                  const tn = n.tipo_novedad;
                  return (
                    <tr key={n.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <span className="font-medium">{tn?.nombre || '—'}</span>
                        <span className="text-gray-400 ml-1">({tn?.tipo || '—'})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(n.fecha_inicio).toLocaleDateString('es-CO')}
                        {n.fecha_fin && ` — ${new Date(n.fecha_fin).toLocaleDateString('es-CO')}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-mono text-gray-900">{n.dias || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {new Intl.NumberFormat('es-CO').format(n.valor || 0)}
                      </td>
                      <td className="px-4 py-3 text-center"><EstadoBadge estado={n.estado} /></td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">{n.descripcion || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
