'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getTiposTurno,
  getAsignacionesTurno,
  getAsistenciaPorFecha,
  registrarAsistenciaMasiva,
} from '@/lib/supabase/turnos';
import { getFrentesTrabajo } from '@/lib/supabase/auditoria';
import {
  getNombreCompleto,
  getTurnoInfo,
  formatDateEs,
  formatTime,
  ESTADOS_ASISTENCIA,
} from '@/lib/utils/turnos';
import { useToast } from '@/context/ToastContext';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Save,
  Search,
  UserCheck,
} from 'lucide-react';

export default function AsistenciaPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  // Fecha actual
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoy);
  const [filtroTurno, setFiltroTurno] = useState('todos');

  const [tiposTurno, setTiposTurno] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [frenteId, setFrenteId] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [registrosAsistencia, setRegistrosAsistencia] = useState({}); // key: `${trabajador_id}-${tipo_turno_id}`
  const [editando, setEditando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);

      const [tipos, frentesData] = await Promise.all([
        getTiposTurno(),
        getFrentesTrabajo(),
      ]);
      setTiposTurno(tipos);
      setFrentes(frentesData || []);

      // Obtener frente desde localStorage o primero disponible
      const savedFrenteId = localStorage.getItem('turnosFrenteId');
      const frenteIdVal = savedFrenteId
        ? parseInt(savedFrenteId, 10)
        : (frentesData[0]?.id || null);

      if (frenteIdVal && frentesData.some(f => f.id === frenteIdVal)) {
        setFrenteId(frenteIdVal);
      } else if (frentesData.length > 0) {
        setFrenteId(frentesData[0].id);
        localStorage.setItem('turnosFrenteId', String(frentesData[0].id));
      }

      if (frenteIdVal) {
        const [asigs, asistencias] = await Promise.all([
          getAsignacionesTurno({ frenteId: frenteIdVal, estado: 'activo', fecha }),
          getAsistenciaPorFecha(fecha, { frenteId: frenteIdVal }),
        ]);

        setAsignaciones(asigs || []);

        // Indexar registros de asistencia existentes
        const registrosIndex = {};
        (asistencias || []).forEach(r => {
          const key = `${r.trabajador_id}-${r.tipo_turno_id}`;
          registrosIndex[key] = r;
        });
        setRegistrosAsistencia(registrosIndex);
      }
    } catch (err) {
      console.error('Error:', err);
      addToast('Error al cargar datos de asistencia', { type: 'error' })
      setError('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Agrupar asignaciones por turno
  const asignacionesPorTurno = {};
  tiposTurno.forEach(t => {
    const filtered = asignaciones.filter(a => {
      if (filtroTurno !== 'todos' && String(a.tipo_turno_id) !== filtroTurno) return false;
      return true;
    });
    const delTurno = filtered.filter(a => a.tipo_turno_id === t.id);
    if (delTurno.length > 0) {
      asignacionesPorTurno[t.id] = delTurno;
    }
  });

  const cambiarEstadoAsistencia = (trabajadorId, tipoTurnoId, nuevoEstado) => {
    setEditando(true);
    const key = `${trabajadorId}-${tipoTurnoId}`;
    const registroActual = registrosAsistencia[key];

    setRegistrosAsistencia(prev => ({
      ...prev,
      [key]: {
        ...registroActual,
        trabajador_id: trabajadorId,
        tipo_turno_id: tipoTurnoId,
        fecha,
        estado_asistencia: nuevoEstado,
        // Si está presente y no tenía hora, registrar hora actual
        hora_llegada: nuevoEstado === 'presente'
          ? (registroActual?.hora_llegada || new Date().toTimeString().slice(0, 5))
          : registroActual?.hora_llegada || null,
      },
    }));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      const registros = Object.values(registrosAsistencia)
        .filter(r => r.estado_asistencia && r.estado_asistencia !== 'pendiente')
        .map(r => ({
          ...r,
          asignacion_turno_id: asignaciones.find(a =>
            a.trabajador_id === r.trabajador_id && a.tipo_turno_id === r.tipo_turno_id
          )?.id || null,
          frente_trabajo_id: frenteId,
          marcado_por: null, // Se asigna en el backend o se puede dejar null
        }));

      if (registros.length === 0) {
        throw new Error('No hay registros para guardar');
      }

      await registrarAsistenciaMasiva(registros);
      setExito(`Asistencia registrada exitosamente (${registros.length} empleados)`);
      setEditando(false);
      cargarDatos();
    } catch (err) {
      console.error('Error:', err);
      addToast('Error al guardar la asistencia', { type: 'error' })
      setError(err.message || 'Error al guardar la asistencia');
    } finally {
      setGuardando(false);
    }
  };

  const totalRegistros = Object.values(registrosAsistencia).filter(r => r.estado_asistencia && r.estado_asistencia !== 'pendiente').length;
  const totalEmpleados = asignaciones.length;

  const cambiarFecha = (dias) => {
    const d = new Date(fecha + 'T12:00:00');
    d.setDate(d.getDate() + dias);
    setFecha(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/turnos" className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Registro de Asistencia</h1>
            <p className="text-gray-600 mt-1">
              Marca la asistencia diaria de los empleados
              {frenteId && frentes.length > 0
                ? ` — ${frentes.find(f => f.id === frenteId)?.nombre || ''}`
                : ''}
            </p>
            {frentes.length > 1 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Frente:</span>
                <select
                  value={frenteId || ''}
                  onChange={(e) => {
                    const newId = parseInt(e.target.value, 10);
                    localStorage.setItem('turnosFrenteId', String(newId));
                    setFrenteId(newId);
                    cargarDatos();
                  }}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {frentes.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre} ({f.codigo})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editando && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">
              Sin guardar
            </span>
          )}
          <button
            onClick={handleGuardar}
            disabled={guardando || !editando}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {exito && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-green-800 font-medium">{exito}</p>
          </div>
        </div>
      )}

      {/* Selector de fecha */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => cambiarFecha(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            {fecha === hoy && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Hoy
              </span>
            )}
          </div>
          <button
            onClick={() => cambiarFecha(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          {formatDateEs(fecha)}
        </p>
      </div>

      {/* Filtro de turno */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Turno:</label>
            <select
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="todos">Todos los turnos</option>
              {tiposTurno.map(t => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-500">
            {totalRegistros}/{totalEmpleados} marcados
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${totalEmpleados > 0 ? (totalRegistros / totalEmpleados) * 100 : 0}%` }}
          ></div>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando asistencia...</p>
          </div>
        </div>
      ) : totalEmpleados === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin empleados que marcar</h3>
          <p className="text-gray-500 mb-6">
            No hay empleados con asignaciones activas para esta fecha.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => cambiarFecha(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Día anterior
            </button>
            <Link
              href="/turnos/nuevo"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition"
            >
              Asignar empleados
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiposTurno.map((tipo) => {
            const asignacionesDelTurno = asignacionesPorTurno[tipo.id];
            if (!asignacionesDelTurno) return null;

            const turnoInfo = getTurnoInfo(tipo.codigo);
            const color = turnoInfo?.color || '#6B7280';
            const bgColor = turnoInfo?.bgColor || '#F9FAFB';

            return (
              <div key={tipo.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Header del turno */}
                <div className="p-4" style={{ backgroundColor: bgColor, borderBottom: `3px solid ${color}` }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{tipo.nombre}</h3>
                      <p className="text-xs text-gray-500">
                        {turnoInfo?.horaInicio || tipo.hora_inicio?.slice(0, 5)} — {turnoInfo?.horaFin || tipo.hora_fin?.slice(0, 5)}
                      </p>
                    </div>
                    <span className="text-xs text-white font-bold px-2 py-0.5 rounded" style={{ backgroundColor: color }}>
                      {asignacionesDelTurno.length}
                    </span>
                  </div>
                </div>

                {/* Lista de empleados */}
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {asignacionesDelTurno.map((asignacion) => {
                    const key = `${asignacion.trabajador_id}-${tipo.id}`;
                    const registro = registrosAsistencia[key];
                    const estadoActual = registro?.estado_asistencia || 'pendiente';
                    const estadoInfo = ESTADOS_ASISTENCIA[estadoActual];
                    const nombre = getNombreCompleto(asignacion.trabajador);

                    return (
                      <div key={asignacion.id} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{nombre}</p>
                            <p className="text-xs text-gray-500">
                              {asignacion.trabajador?.cargo?.nombre || ''}
                            </p>
                          </div>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${estadoInfo?.badge || ''}`}>
                            {estadoInfo?.label || 'Pendiente'}
                          </span>
                        </div>

                        {/* Botones de estado */}
                        <div className="flex gap-1 flex-wrap">
                          {[
                            { key: 'presente', label: '✅', title: 'Presente' },
                            { key: 'ausente', label: '❌', title: 'Ausente' },
                            { key: 'permiso', label: '📋', title: 'Permiso' },
                            { key: 'incapacidad', label: '🏥', title: 'Incapacidad' },
                            { key: 'vacaciones', label: '🏖️', title: 'Vacaciones' },
                            { key: 'pendiente', label: '⏳', title: 'Pendiente' },
                          ].map(btn => (
                            <button
                              key={btn.key}
                              onClick={() => cambiarEstadoAsistencia(asignacion.trabajador_id, tipo.id, btn.key)}
                              className={`px-2 py-1 rounded text-xs transition ${
                                estadoActual === btn.key
                                  ? 'ring-2 ring-offset-1 ring-gray-900 bg-gray-100'
                                  : 'hover:bg-gray-50 opacity-50 hover:opacity-100'
                              }`}
                              title={btn.title}
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>

                        {/* Hora de llegada (cuando está presente) */}
                        {estadoActual === 'presente' && (
                          <div className="mt-2 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <input
                              type="time"
                              value={registro?.hora_llegada || new Date().toTimeString().slice(0, 5)}
                              onChange={(e) => {
                                setRegistrosAsistencia(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], hora_llegada: e.target.value },
                                }));
                              }}
                              className="text-xs border border-gray-200 rounded px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-gray-900"
                            />
                            <span className="text-xs text-gray-400">llegada</span>
                          </div>
                        )}

                        {/* Novedad */}
                        {estadoActual !== 'presente' && estadoActual !== 'pendiente' && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Novedad (opcional)..."
                              value={registro?.novedad || ''}
                              onChange={(e) => {
                                setRegistrosAsistencia(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], novedad: e.target.value },
                                }));
                              }}
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
