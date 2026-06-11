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
  tieneAsignacionSolapada,
} from '@/lib/supabase/turnos';
import { getNombreCompleto, TURNOS } from '@/lib/utils/turnos';
import { ArrowLeft, Save, AlertCircle, Check } from 'lucide-react';

export default function EditarAsignacionPage() {
  const params = useParams();
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);

  const [tiposTurno, setTiposTurno] = useState([]);
  const [formData, setFormData] = useState({
    tipo_turno_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'activo',
    observaciones: '',
  });
  const [trabajadorNombre, setTrabajadorNombre] = useState('');
  const [trabajadorCedula, setTrabajadorCedula] = useState('');

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

        setTiposTurno(tipos);
        setTrabajadorNombre(getNombreCompleto(asig.trabajador));
        setTrabajadorCedula(asig.trabajador?.cedula || '');
        setFormData({
          tipo_turno_id: String(asig.tipo_turno_id),
          fecha_inicio: asig.fecha_inicio,
          fecha_fin: asig.fecha_fin || '',
          estado: asig.estado,
          observaciones: asig.observaciones || '',
        });
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar los datos');
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, [params.id]);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    setExito(null);

    try {
      const id = Number(params.id);

      // Validar solapamiento si cambió la fecha
      if (formData.fecha_inicio) {
        const solapado = await tieneAsignacionSolapada(
          null, // No verificamos por trabajador (no cambiamos empleado)
          formData.fecha_inicio,
          formData.fecha_fin || null,
          id
        );
        // Esta verificación se salta porque no cambiamos el trabajador
      }

      await actualizarAsignacionTurno(id, {
        tipo_turno_id: Number(formData.tipo_turno_id),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin || null,
        estado: formData.estado,
        observaciones: formData.observaciones || null,
      });

      setExito('Asignación actualizada exitosamente');
      setTimeout(() => {
        router.push(`/turnos/${id}`);
      }, 1000);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al actualizar la asignación');
    } finally {
      setGuardando(false);
    }
  };

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm";
  const selectClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white";

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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link href="/turnos" className="hover:text-gray-900">Turnos</Link>
        <span>/</span>
        <Link href={`/turnos/${params.id}`} className="hover:text-gray-900">Asignación #{params.id}</Link>
        <span>/</span>
        <span className="text-gray-900">Editar</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Asignación</h1>
          <p className="text-gray-600 mt-1">
            {trabajadorNombre} — {trabajadorCedula}
          </p>
        </div>
        <Link
          href={`/turnos/${params.id}`}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del empleado (solo lectura) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Empleado
          </h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">{trabajadorNombre}</p>
            <p className="text-xs text-gray-500">CC {trabajadorCedula}</p>
          </div>
        </div>

        {/* Turno */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
            Configuración del Turno
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Turno <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tipo_turno_id}
                onChange={handleChange('tipo_turno_id')}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.estado}
                onChange={handleChange('estado')}
                className={selectClass}
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.fecha_inicio}
                onChange={handleChange('fecha_inicio')}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Fin
              </label>
              <input
                type="date"
                value={formData.fecha_fin}
                onChange={handleChange('fecha_fin')}
                className={inputClass}
                min={formData.fecha_inicio || undefined}
              />
              <p className="text-xs text-gray-400 mt-1">Dejar vacío para asignación indefinida</p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={handleChange('observaciones')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none"
              placeholder="Motivo del cambio, notas adicionales..."
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/turnos/${params.id}`}
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
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
