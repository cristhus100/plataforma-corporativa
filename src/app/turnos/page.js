'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getTiposTurno,
  getAsignacionesTurno,
} from '@/lib/supabase/turnos';
import { getFrentesTrabajo } from '@/lib/supabase/auditoria';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import {
  getTurnoInfo,
  getNombreCompleto,
  getDiasSemana,
  formatDate,
  formatDateEs,
  navegarSemana,
} from '@/lib/utils/turnos';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Users, Filter } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function TurnosPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Estado de navegación
  const [semanaInicio, setSemanaInicio] = useState(() => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? 6 : dia - 1;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - diff);
    return formatDate(lunes);
  });

  const [tiposTurno, setTiposTurno] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [frenteId, setFrenteId] = useState(null);
  const [filtroTurno, setFiltroTurno] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const diasSemana = getDiasSemana(semanaInicio);
  const semanaFin = diasSemana[6].dateStr;

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
        const asignacionesData = await getAsignacionesTurno({
          frenteId: frenteIdVal,
          estado: 'activo',
        });
        setAsignaciones(asignacionesData || []);
      } else {
        setAsignaciones([]);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      addToast('Error al cargar los datos de turnos', { type: 'error' })
      setError('Error al cargar los datos de turnos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Obtener turno info desde BD o constantes
  const getTurnoDeTipo = (tipoTurnoId) => {
    const tipo = tiposTurno.find(t => t.id === tipoTurnoId);
    if (!tipo) return null;
    return getTurnoInfo(tipo.codigo) || {
      codigo: tipo.codigo,
      nombre: tipo.nombre,
      horaInicio: tipo.hora_inicio?.slice(0, 5),
      horaFin: tipo.hora_fin?.slice(0, 5),
      color: '#6B7280',
      bgColor: '#F9FAFB',
    };
  };

  // Filtrar asignaciones
  const asignacionesFiltradas = asignaciones.filter(a => {
    if (filtroTurno !== 'todos' && String(a.tipo_turno_id) !== filtroTurno) return false;
    if (filtroEstado !== 'todos' && a.estado !== filtroEstado) return false;
    return true;
  });

  // Agrupar por turno
  const asignacionesPorTurno = {};
  tiposTurno.forEach(t => {
    const asignacionesDelTurno = asignacionesFiltradas.filter(a => a.tipo_turno_id === t.id);
    if (asignacionesDelTurno.length > 0) {
      asignacionesPorTurno[t.id] = asignacionesDelTurno;
    }
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Turnos</h1>
          <p className="text-gray-600 mt-1">
            {frenteId && frentes.length > 0
              ? `${frentes.find(f => f.id === frenteId)?.nombre || ''} — Administración de turnos A, B y C`
              : 'Administración de turnos A, B y C'}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {frentes.length > 1 && (
            <select
              value={frenteId || ''}
              onChange={(e) => {
                const newId = parseInt(e.target.value, 10);
                localStorage.setItem('turnosFrenteId', String(newId));
                setFrenteId(newId);
                setCargando(true);
                getAsignacionesTurno({ frenteId: newId, estado: 'activo' })
                  .then(data => setAsignaciones(data || []))
                  .catch(err => setError('Error al cargar asignaciones'))
                  .finally(() => setCargando(false));
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {frentes.map(f => (
                <option key={f.id} value={f.id}>{f.nombre} ({f.codigo})</option>
              ))}
            </select>
          )}
          <Link
            href="/turnos/asistencia"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Asistencia
          </Link>
          <Link
            href="/turnos/nuevo"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nueva Asignación
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={cargarDatos}
            className="mt-2 text-sm text-red-600 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {cargando ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <>
          {/* Navegación semanal */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSemanaInicio(navegarSemana(semanaInicio, -1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">
                  Semana del {formatDateEs(semanaInicio, false)} al {formatDateEs(semanaFin, false)}
                </p>
                <p className="text-sm text-gray-500">
                  {asignacionesFiltradas.length} asignaciones activas
                </p>
              </div>
              <button
                onClick={() => setSemanaInicio(navegarSemana(semanaInicio, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-2 mt-4">
              {diasSemana.map((dia) => (
                <div
                  key={dia.dateStr}
                  className={`text-center p-2 rounded-lg ${
                    dia.isToday ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700'
                  }`}
                >
                  <p className="text-xs font-medium capitalize">{dia.label.split(' ')[0]}</p>
                  <p className={`text-lg font-bold ${dia.isToday ? 'text-white' : 'text-gray-900'}`}>
                    {dia.date.getDate()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Turno:</label>
                <select
                  value={filtroTurno}
                  onChange={(e) => setFiltroTurno(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="todos">Todos</option>
                  {tiposTurno.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Estado:</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="todos">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid de turnos */}
          {Object.keys(asignacionesPorTurno).length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin asignaciones activas</h3>
              <p className="text-gray-500 mb-6">No hay empleados asignados a turnos actualmente.</p>
              <Link
                href="/turnos/nuevo"
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear Primera Asignación
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiposTurno.map((tipo) => {
                const turnoInfo = getTurnoDeTipo(tipo.id);
                const asignacionesDelTurno = asignacionesPorTurno[tipo.id] || [];
                const color = turnoInfo?.color || '#6B7280';
                const bgColor = turnoInfo?.bgColor || '#F9FAFB';

                return (
                  <div key={tipo.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header del turno */}
                    <div className="p-4" style={{ backgroundColor: bgColor, borderBottom: `3px solid ${color}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{tipo.nombre}</h3>
                        <span
                          className="text-xs font-bold text-white px-2 py-0.5 rounded"
                          style={{ backgroundColor: color }}
                        >
                          {tipo.codigo}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {turnoInfo?.horaInicio || tipo.hora_inicio?.slice(0, 5)} — {turnoInfo?.horaFin || tipo.hora_fin?.slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {asignacionesDelTurno.length} empleado{asignacionesDelTurno.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Lista de empleados */}
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                      {asignacionesDelTurno.map((asignacion) => {
                        const nombre = getNombreCompleto(asignacion.trabajador);
                        return (
                          <Link
                            key={asignacion.id}
                            href={`/turnos/${asignacion.id}`}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 transition group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: color }}
                              >
                                {nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700">
                                  {nombre}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Cédula: {asignacion.trabajador?.cedula || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                asignacion.estado === 'activo'
                                  ? 'bg-green-100 text-green-700'
                                  : asignacion.estado === 'suspendido'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {asignacion.estado}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumen de asignaciones */}
          {asignacionesFiltradas.length > 0 && (
            <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen General</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{asignacionesFiltradas.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Asignaciones</p>
                </div>
                {tiposTurno.map(tipo => {
                  const count = (asignacionesPorTurno[tipo.id] || []).length;
                  const turnoInfo = getTurnoDeTipo(tipo.id);
                  return (
                    <div
                      key={tipo.id}
                      className="rounded-lg p-4 text-center"
                      style={{ backgroundColor: turnoInfo?.bgColor || '#F9FAFB' }}
                    >
                      <p className="text-2xl font-bold" style={{ color: turnoInfo?.color || '#6B7280' }}>
                        {count}
                      </p>
                      <p className="text-xs mt-1 text-gray-600">{tipo.nombre}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
