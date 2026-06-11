'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import {
  getTipoBadge,
  getTipoLabel,
  getTipoDot,
  getPrioridadBadge,
  getPrioridadLabel,
  getPrioridadDot,
  getEstadoBadge,
  getEstadoLabel,
  getEstadoDot,
  getEstadoIcon,
  formatearFecha,
  formatearMoneda,
  diasDesdeHoy,
  getEstadoProgramacion,
} from '@/lib/utils/ordenes_mantenimiento';

const TABS = [
  { id: 'general', label: 'Información General', icon: '📋' },
  { id: 'historial', label: 'Historial', icon: '📜' },
];

export default function OrdenDetallePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (params.id) cargarOrden();
  }, [params.id]);

  const cargarOrden = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('ordenes_mantenimiento')
        .select(`
          *,
          maquinaria:maquinaria!maquinaria_id(id, codigo_interno, nombre, marca, modelo, placa),
          vehiculo:vehiculos!vehiculo_id(id, nombre, placa, marca, modelo),
          frente_trabajo:frentes_trabajo!frente_trabajo_id(id, codigo, nombre),
          responsable:trabajadores!responsable_id(id, nombre, primer_apellido, cedula, telefono)
        `)
        .eq('id', params.id)
        .single();

      if (err) throw err;
      setOrden(data);
    } catch (err) {
      console.error('Error cargando orden:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    setCambiando(true);
    try {
      const updateData = { estado: nuevoEstado };

      if (nuevoEstado === 'completado') {
        updateData.fecha_fin = new Date().toISOString().split('T')[0];
      }

      const { error: err } = await supabase
        .from('ordenes_mantenimiento')
        .update(updateData)
        .eq('id', params.id);

      if (err) throw err;
      setOrden({ ...orden, ...updateData });
      setMostrarModal(false);
    } catch (err) {
      console.error('Error cambiando estado:', err);
    } finally {
      setCambiando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando orden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/mantenimiento/ordenes" className="text-gray-900 underline hover:text-gray-700">
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Orden no encontrada</p>
          <Link href="/mantenimiento/ordenes" className="text-gray-900 underline hover:text-gray-700">
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const progEstado = getEstadoProgramacion(orden.fecha_programada, orden.estado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/mantenimiento/ordenes" className="text-gray-500 hover:text-gray-900 text-sm">
                ← Volver
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {orden.codigo} — {orden.titulo}
              </h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoBadge(orden.estado)}`}>
                <span>{getEstadoIcon(orden.estado)}</span>
                {getEstadoLabel(orden.estado)}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTipoBadge(orden.tipo)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getTipoDot(orden.tipo)}`} />
                {getTipoLabel(orden.tipo)}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getPrioridadBadge(orden.prioridad)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getPrioridadDot(orden.prioridad)}`} />
                {getPrioridadLabel(orden.prioridad)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {isAdmin && orden.estado !== 'completado' && orden.estado !== 'cancelado' && (
              <button
                onClick={() => router.push(`/mantenimiento/ordenes/${params.id}/editar`)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                ✏️ Editar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 px-4 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'general' && <TabGeneral orden={orden} progEstado={progEstado} />}
          {activeTab === 'historial' && <TabHistorial orden={orden} />}
        </div>
      </div>

      {/* Acciones de estado */}
      {isAdmin && orden.estado !== 'cancelado' && orden.estado !== 'completado' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
          <div className="flex flex-wrap gap-3">
            {orden.estado === 'pendiente' && (
              <button
                onClick={() => handleCambiarEstado('en_proceso')}
                disabled={cambiando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                🔄 Iniciar mantenimiento
              </button>
            )}
            {orden.estado === 'en_proceso' && (
              <button
                onClick={() => setMostrarModal(true)}
                disabled={cambiando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                ✅ Marcar como completado
              </button>
            )}
            <button
              onClick={() => handleCambiarEstado('cancelado')}
              disabled={cambiando}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              ✕ Cancelar orden
            </button>
          </div>
        </div>
      )}

      {/* Confirmación completado */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Completar Orden</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Estás seguro de marcar como completada la orden <strong>{orden.codigo}</strong>?
            </p>
            <p className="text-xs text-gray-500 mb-4">Esto registrará la fecha de finalización automáticamente.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCambiarEstado('completado')}
                disabled={cambiando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {cambiando ? 'Completando...' : '✅ Completar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB: INFORMACIÓN GENERAL
// ============================================
function TabGeneral({ orden, progEstado }) {
  const InfoRow = ({ label, value }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || '—'}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles de la Orden</h3>
        <dl>
          <InfoRow label="Código" value={orden.codigo} />
          <InfoRow label="Título" value={orden.titulo} />
          <InfoRow label="Descripción" value={orden.descripcion} />
          <InfoRow label="Tipo" value={getTipoLabel(orden.tipo)} />
          <InfoRow label="Prioridad" value={getPrioridadLabel(orden.prioridad)} />
          <InfoRow label="Estado" value={getEstadoLabel(orden.estado)} />
          <InfoRow label="Fecha de Creación" value={formatearFecha(orden.created_at)} />
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Programación</h3>
        <dl>
          <InfoRow label="Fecha Programada" value={formatearFecha(orden.fecha_programada)} />
          <InfoRow label="Estado Programación" value={
            <span className={`${progEstado.color} font-medium`}>{progEstado.label}</span>
          } />
          <InfoRow label="Fecha de Inicio" value={formatearFecha(orden.fecha_inicio)} />
          <InfoRow label="Fecha de Finalización" value={formatearFecha(orden.fecha_fin)} />
          <InfoRow label="Horómetro" value={orden.horometro_actual ? `${orden.horometro_actual} hrs` : '—'} />
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipo Asignado</h3>
        <dl>
          {orden.maquinaria ? (
            <>
              <InfoRow label="Maquinaria" value={
                <Link href={`/maquinaria/${orden.maquinaria_id}`} className="text-blue-600 hover:text-blue-700">
                  {orden.maquinaria.codigo_interno} — {orden.maquinaria.nombre}
                </Link>
              } />
              <InfoRow label="Marca / Modelo" value={[orden.maquinaria.marca, orden.maquinaria.modelo].filter(Boolean).join(' / ')} />
              <InfoRow label="Placa" value={orden.maquinaria.placa} />
            </>
          ) : orden.vehiculo ? (
            <>
              <InfoRow label="Vehículo" value={
                <Link href={`/vehiculos/${orden.vehiculo_id}`} className="text-blue-600 hover:text-blue-700">
                  {orden.vehiculo.nombre} ({orden.vehiculo.placa})
                </Link>
              } />
              <InfoRow label="Marca / Modelo" value={[orden.vehiculo.marca, orden.vehiculo.modelo].filter(Boolean).join(' / ')} />
            </>
          ) : (
            <InfoRow label="Equipo" value="Sin asignar" />
          )}
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Responsable y Ubicación</h3>
        <dl>
          <InfoRow label="Responsable" value={
            orden.responsable
              ? `${orden.responsable.nombre} ${orden.responsable.primer_apellido}`
              : 'Sin asignar'
          } />
          {orden.responsable?.cedula && (
            <InfoRow label="Cédula Responsable" value={orden.responsable.cedula} />
          )}
          {orden.responsable?.telefono && (
            <InfoRow label="Teléfono Responsable" value={orden.responsable.telefono} />
          )}
          <InfoRow label="Frente de Trabajo" value={
            orden.frente_trabajo
              ? `${orden.frente_trabajo.codigo} — ${orden.frente_trabajo.nombre}`
              : 'Sin asignar'
          } />
        </dl>
      </div>

      {(orden.costo_estimado || orden.observaciones) && (
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h3>
          <dl>
            {orden.costo_estimado && (
              <InfoRow label="Costo Estimado" value={formatearMoneda(orden.costo_estimado)} />
            )}
            {orden.costo_real && (
              <InfoRow label="Costo Real" value={formatearMoneda(orden.costo_real)} />
            )}
            <InfoRow label="Observaciones" value={orden.observaciones} />
          </dl>
        </div>
      )}
    </div>
  );
}

// ============================================
// TAB: HISTORIAL (básico por ahora)
// ============================================
function TabHistorial({ orden }) {
  const eventos = [];

  eventos.push({
    fecha: orden.created_at,
    tipo: 'creacion',
    descripcion: `Orden ${orden.codigo} creada — ${getTipoLabel(orden.tipo)}`,
    icon: '📋',
  });

  if (orden.fecha_inicio) {
    eventos.push({
      fecha: orden.fecha_inicio,
      tipo: 'inicio',
      descripcion: 'Mantenimiento iniciado',
      icon: '🔄',
    });
  }

  if (orden.fecha_fin) {
    eventos.push({
      fecha: orden.fecha_fin,
      tipo: 'completado',
      descripcion: 'Mantenimiento completado',
      icon: '✅',
    });
  }

  eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Línea de Tiempo</h3>
      {eventos.length === 0 ? (
        <p className="text-gray-500 text-sm">Sin eventos registrados</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {eventos.map((ev, idx) => (
              <div key={idx} className="relative flex gap-4">
                <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                  <span className="text-sm">{ev.icon}</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-900">{ev.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatearFecha(ev.fecha)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
