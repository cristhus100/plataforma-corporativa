'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getAsignacionTurnoById,
  getTiposTurno,
  actualizarAsignacionTurno,
  eliminarAsignacionTurno,
  getAsistenciaPorFecha,
} from '@/lib/supabase/turnos';
import {
  getNombreCompleto,
  getTurnoInfo,
  formatTime,
  formatDateEs,
  ESTADOS_ASISTENCIA,
} from '@/lib/utils/turnos';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Check,
  X,
  History,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function DetalleAsignacionPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [asignacion, setAsignacion] = useState(null);
  const [tiposTurno, setTiposTurno] = useState([]);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [asistenciaReciente, setAsistenciaReciente] = useState([]);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const id = Number(params.id);
        const [asig, tipos] = await Promise.all([
          getAsignacionTurnoById(id),
          getTiposTurno(),
        ]);

        if (!asig) {
          setError('Asignación no encontrada');
          return;
        }

        setAsignacion(asig);
        setTiposTurno(tipos);

        // Cargar asistencia reciente de este trabajador (últimos 7 días)
        const hoy = new Date();
        const hace7dias = new Date(hoy);
        hace7dias.setDate(hoy.getDate() - 7);
        const fechaInicio = hace7dias.toISOString().split('T')[0];
        const fechaFin = hoy.toISOString().split('T')[0];

        const { data: asistencia } = await supabase
          .from('registro_asistencia_turno')
          .select('*')
          .eq('trabajador_id', asig.trabajador_id)
          .eq('activo', true)
          .gte('fecha', fechaInicio)
          .lte('fecha', fechaFin)
          .order('fecha', { ascending: false });

        setAsistenciaReciente(asistencia || []);
      } catch (err) {
        console.error('Error:', err);
        try { addToast('Error al cargar la asignación', { type: 'error' }) } catch(e) {}
        setError('Error al cargar la asignación');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [params.id]);

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await eliminarAsignacionTurno(Number(params.id));
      router.push('/turnos');
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al eliminar la asignación', { type: 'error' }) } catch(e) {}
      setError('Error al eliminar la asignación');
      setEliminando(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    try {
      await actualizarAsignacionTurno(Number(params.id), { estado: nuevoEstado });
      setAsignacion(prev => ({ ...prev, estado: nuevoEstado }));
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al actualizar el estado', { type: 'error' }) } catch(e) {}
      setError('Error al actualizar el estado');
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando asignación...</p>
        </div>
      </div>
    );
  }

  if (error && !asignacion) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/turnos" className="text-red-700 underline hover:no-underline">
            Volver a Turnos
          </Link>
        </div>
      </div>
    );
  }

  if (!asignacion) return null;

  const tipoTurno = tiposTurno.find(t => t.id === asignacion.tipo_turno_id);
  const turnoInfo = getTurnoInfo(tipoTurno?.codigo);
  const color = turnoInfo?.color || '#6B7280';
  const bgColor = turnoInfo?.bgColor || '#F9FAFB';
  const nombreEmpleado = getNombreCompleto(asignacion.trabajador);

  const estadoClases = {
    activo: 'bg-green-100 text-green-700 border-green-200',
    inactivo: 'bg-gray-100 text-gray-600 border-gray-200',
    suspendido: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/turnos" className="hover:text-gray-900">Turnos</Link>
        <span>/</span>
        <span className="text-gray-900">Asignación #{asignacion.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/turnos"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{nombreEmpleado}</h1>
            <p className="text-gray-500">
              CC {asignacion.trabajador?.cedula || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/turnos/${params.id}/editar`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </Link>
          <button
            onClick={() => setConfirmandoEliminar(true)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Desactivar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {confirmandoEliminar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Desactivar asignación?</h3>
            <p className="text-sm text-gray-600 mb-6">
              La asignación de <strong>{nombreEmpleado}</strong> será desactivada. Los registros de asistencia históricos se conservarán.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmandoEliminar(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50"
              >
                {eliminando ? 'Desactivando...' : 'Sí, desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información de la asignación */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Detalle de la Asignación</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Turno */}
              <div className="flex items-center gap-4 p-4 rounded-lg" style={{ backgroundColor: bgColor }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: color }}>
                  {tipoTurno?.codigo || '?'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{tipoTurno?.nombre || 'Sin turno'}</p>
                  <p className="text-sm text-gray-600">
                    {turnoInfo?.horaInicio || formatTime(tipoTurno?.hora_inicio)} — {turnoInfo?.horaFin || formatTime(tipoTurno?.hora_fin)}
                    {tipoTurno?.es_nocturno && ' (Nocturno)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</label>
                  <p className="text-sm text-gray-900 mt-1">{nombreEmpleado}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cédula</label>
                  <p className="text-sm text-gray-900 mt-1">{asignacion.trabajador?.cedula || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Inicio</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDateEs(asignacion.fecha_inicio)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Fin</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {asignacion.fecha_fin ? formatDateEs(asignacion.fecha_fin) : <span className="text-gray-400 italic">Indefinido</span>}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</label>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${estadoClases[asignacion.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {asignacion.estado}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Frente</label>
                  <p className="text-sm text-gray-900 mt-1">{asignacion.frente?.nombre || 'Santa Rosa'}</p>
                </div>
              </div>

              {asignacion.observaciones && (
                <div className="pt-4 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Observaciones</label>
                  <p className="text-sm text-gray-700 mt-1">{asignacion.observaciones}</p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones rápidas - cambiar estado */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Acciones Rápidas</h3>
            <div className="flex gap-2 flex-wrap">
              {asignacion.estado !== 'activo' && (
                <button
                  onClick={() => handleCambiarEstado('activo')}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition"
                >
                  <Check className="w-3 h-3 inline mr-1" />
                  Activar
                </button>
              )}
              {asignacion.estado !== 'suspendido' && (
                <button
                  onClick={() => handleCambiarEstado('suspendido')}
                  className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition"
                >
                  Suspender
                </button>
              )}
              {asignacion.estado !== 'inactivo' && (
                <button
                  onClick={() => handleCambiarEstado('inactivo')}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition"
                >
                  <X className="w-3 h-3 inline mr-1" />
                  Desactivar
                </button>
              )}
            </div>
          </div>

          {/* Asistencia reciente */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Asistencia Reciente</h2>
              <Link
                href="/turnos/asistencia"
                className="text-xs text-gray-600 hover:text-gray-900 underline"
              >
                Ver todas
              </Link>
            </div>
            {asistenciaReciente.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Sin registros de asistencia en los últimos 7 días</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {asistenciaReciente.map((reg) => {
                  const estadoInfo = ESTADOS_ASISTENCIA[reg.estado_asistencia];
                  return (
                    <div key={reg.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatDateEs(reg.fecha)}</p>
                        <p className="text-xs text-gray-500">
                          {reg.hora_llegada ? `Llegada: ${formatTime(reg.hora_llegada)}` : 'Sin marcación'}
                          {reg.hora_salida ? ` | Salida: ${formatTime(reg.hora_salida)}` : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${estadoInfo?.badge || 'bg-gray-100 text-gray-600'}`}>
                        {estadoInfo?.label || reg.estado_asistencia}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info del empleado */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Información del Empleado</h3>
            </div>
            <div className="p-4 space-y-3">
              {asignacion.trabajador?.cargo && (
                <div>
                  <label className="text-xs text-gray-500">Cargo</label>
                  <p className="text-sm text-gray-900 font-medium">
                    {asignacion.trabajador.cargo?.nombre || 'N/A'}
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500">Estado laboral</label>
                <p className="text-sm text-gray-900 font-medium capitalize">
                  {asignacion.trabajador?.estado || 'N/A'}
                </p>
              </div>
              <Link
                href={`/trabajadores/${asignacion.trabajador_id}`}
                className="text-sm text-gray-600 hover:text-gray-900 underline inline-flex items-center gap-1"
              >
                <User className="w-3 h-3" />
                Ver perfil completo
              </Link>
            </div>
          </div>

          {/* Metadatos */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">Metadatos</h3>
            </div>
            <div className="p-4 space-y-2 text-xs text-gray-500">
              <p className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Creada: {asignacion.created_at ? new Date(asignacion.created_at).toLocaleDateString('es-CO') : 'N/A'}
              </p>
              <p className="flex items-center gap-1">
                <History className="w-3 h-3" />
                Actualizada: {asignacion.updated_at ? new Date(asignacion.updated_at).toLocaleDateString('es-CO') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
