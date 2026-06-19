'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  getTiposTurno,
  getEmpleadosActivos,
  tieneAsignacionSolapada,
} from '@/lib/supabase/turnos';
import { getFrentesTrabajo } from '@/lib/supabase/auditoria';
import { crearAsignacionesTurno } from '@/actions';
import { getNombreCompleto, TURNOS } from '@/lib/utils/turnos';
import { Users, ArrowLeft, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function NuevaAsignacionPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const [tiposTurno, setTiposTurno] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [frenteId, setFrenteId] = useState(null);

  // Formulario
  const [asignaciones, setAsignaciones] = useState([
    { trabajador_id: '', tipo_turno_id: '', fecha_inicio: '', fecha_fin: '', observaciones: '' },
  ]);

  const [validando, setValidando] = useState({});

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [tipos, empleadosData, frentesData] = await Promise.all([
          getTiposTurno(),
          getEmpleadosActivos(),
          getFrentesTrabajo(),
        ]);

        setTiposTurno(tipos);
        setEmpleados(empleadosData || []);
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

        // Fecha por defecto
        const hoy = new Date().toISOString().split('T')[0];
        setAsignaciones([{ trabajador_id: '', tipo_turno_id: tipos[0]?.id || '', fecha_inicio: hoy, fecha_fin: '', observaciones: '' }]);
      } catch (err) {
        console.error('Error cargando datos:', err);
        try { addToast('Error al cargar los datos', { type: 'error' }) } catch(e) {}
        setError('Error al cargar datos');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  const handleChange = (index, field, value) => {
    const nuevas = [...asignaciones];
    nuevas[index][field] = value;
    setAsignaciones(nuevas);

    // Limpiar validación si cambia
    if (field === 'trabajador_id' && value) {
      setValidando(prev => ({ ...prev, [index]: 'verificando' }));
      verificarSolapamiento(index, nuevas[index]).then(result => {
        setValidando(prev => ({ ...prev, [index]: result }));
      });
    }
  };

  const verificarSolapamiento = async (index, asignacion) => {
    if (!asignacion.trabajador_id || !asignacion.fecha_inicio) return null;
    try {
      const solapado = await tieneAsignacionSolapada(
        Number(asignacion.trabajador_id),
        asignacion.fecha_inicio,
        asignacion.fecha_fin || null
      );
      return solapado ? 'solapado' : 'ok';
    } catch {
      return null;
    }
  };

  const agregarFila = () => {
    setAsignaciones([
      ...asignaciones,
      { trabajador_id: '', tipo_turno_id: tiposTurno[0]?.id || '', fecha_inicio: '', fecha_fin: '', observaciones: '' },
    ]);
  };

  const eliminarFila = (index) => {
    if (asignaciones.length <= 1) return;
    const nuevas = asignaciones.filter((_, i) => i !== index);
    setAsignaciones(nuevas);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      // Validar que todas tengan datos mínimos
      const invalidas = asignaciones.filter(a => !a.trabajador_id || !a.tipo_turno_id || !a.fecha_inicio);
      if (invalidas.length > 0) {
        throw new Error('Completa todos los campos requeridos en cada asignación');
      }

      // Verificar solapamientos
      for (let i = 0; i < asignaciones.length; i++) {
        const a = asignaciones[i];
        const solapado = await tieneAsignacionSolapada(
          Number(a.trabajador_id),
          a.fecha_inicio,
          a.fecha_fin || null
        );
        if (solapado) {
          throw new Error(
            `El empleado "${getNombreCompleto(empleados.find(e => e.id === Number(a.trabajador_id)))}" ya tiene una asignación activa en el rango de fechas seleccionado`
          );
        }
      }

      // Preparar datos
      const datosInsertar = asignaciones.map(a => ({
        trabajador_id: Number(a.trabajador_id),
        tipo_turno_id: Number(a.tipo_turno_id),
        frente_trabajo_id: frenteId,
        fecha_inicio: a.fecha_inicio,
        fecha_fin: a.fecha_fin || null,
        estado: 'activo',
        observaciones: a.observaciones || null,
      }));

      const result = await crearAsignacionesTurno(datosInsertar);

      if (result.error) throw new Error(result.error)

      setExito(`Se crearon ${result.data?.length || 0} asignación(es) exitosamente`);
      setTimeout(() => {
        router.push('/turnos');
      }, 1500);
    } catch (err) {
      console.error('Error creando asignaciones:', err);
      try { addToast('Error al crear las asignaciones', { type: 'error' }) } catch(e) {}
      setError(err.message || 'Error al crear las asignaciones');
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm";
  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white";

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/turnos" className="hover:text-gray-900">Turnos</Link>
        <span>/</span>
        <span className="text-gray-900">Nueva Asignación</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nueva Asignación de Turno</h1>
          <p className="text-gray-600 mt-1">
            Asigna empleados a turnos A, B o C
          </p>
          {frentes.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Frente:</span>
              <select
                value={frenteId || ''}
                onChange={(e) => {
                  const newId = parseInt(e.target.value, 10);
                  localStorage.setItem('turnosFrenteId', String(newId));
                  setFrenteId(newId);
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
        <Link
          href="/turnos"
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
      </div>

      {/* Info de turnos */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Horarios de Turnos</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tiposTurno.map(t => {
                const info = TURNOS[t.codigo];
                return (
                  <div key={t.id} className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-blue-100">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: info?.color || '#6B7280' }}></span>
                    <span className="text-sm text-gray-700">
                      <strong>{t.codigo}</strong>: {t.hora_inicio?.slice(0, 5)} — {t.hora_fin?.slice(0, 5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tabla de asignaciones */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Asignaciones
              </h2>
              <button
                type="button"
                onClick={agregarFila}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>

          {/* Header de columnas (visible en desktop) */}
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Empleado *</span>
            <span>Turno *</span>
            <span>Fecha Inicio *</span>
            <span>Fecha Fin (opcional)</span>
            <span>Novedad</span>
            <span></span>
          </div>

          {/* Filas */}
          <div className="divide-y divide-gray-100">
            {asignaciones.map((asignacion, index) => (
              <div key={index} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-start">
                  {/* Empleado */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 md:hidden mb-1">Empleado *</label>
                    <select
                      value={asignacion.trabajador_id}
                      onChange={(e) => handleChange(index, 'trabajador_id', e.target.value)}
                      className={selectClass}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {empleados.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {getNombreCompleto(emp)} — {emp.cedula}
                        </option>
                      ))}
                    </select>
                    {validando[index] === 'solapado' && (
                      <p className="text-xs text-red-500 mt-1">⚠ Ya tiene asignación en este rango</p>
                    )}
                    {validando[index] === 'ok' && (
                      <p className="text-xs text-green-500 mt-1">✓ Disponible</p>
                    )}
                  </div>

                  {/* Turno */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 md:hidden mb-1">Turno *</label>
                    <select
                      value={asignacion.tipo_turno_id}
                      onChange={(e) => handleChange(index, 'tipo_turno_id', e.target.value)}
                      className={selectClass}
                      required
                    >
                      {tiposTurno.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} ({t.hora_inicio?.slice(0, 5)} — {t.hora_fin?.slice(0, 5)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha inicio */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 md:hidden mb-1">Fecha Inicio *</label>
                    <input
                      type="date"
                      value={asignacion.fecha_inicio}
                      onChange={(e) => handleChange(index, 'fecha_inicio', e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  {/* Fecha fin */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 md:hidden mb-1">Fecha Fin</label>
                    <input
                      type="date"
                      value={asignacion.fecha_fin}
                      onChange={(e) => handleChange(index, 'fecha_fin', e.target.value)}
                      className={inputClass}
                      min={asignacion.fecha_inicio || undefined}
                    />
                  </div>

                  {/* Novedad */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 md:hidden mb-1">Novedad</label>
                    <input
                      type="text"
                      value={asignacion.observaciones}
                      onChange={(e) => handleChange(index, 'observaciones', e.target.value)}
                      className={inputClass}
                      placeholder="Ej: 2 horas extras (hasta 5pm)"
                    />
                  </div>

                  {/* Botón eliminar */}
                  <div className="flex items-center justify-center pt-0 md:pt-0">
                    <button
                      type="button"
                      onClick={() => eliminarFila(index)}
                      disabled={asignaciones.length <= 1}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4 pt-4">
          <Link
            href="/turnos"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {guardando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              'Guardar Asignaciones'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
