'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  calcularEstadoAceite,
  calcularHorasDesdeCambio,
  getEstadoAceiteConfig,
  calcularEstadoFiltroAire,
} from '@/lib/utils/aceite';
import { useUmbrales } from '@/hooks/useUmbrales';
import {
  Fuel,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Gauge,
  ArrowRight,
  Loader2,
  Droplets,
  Hash,
  Clock3,
  FuelIcon,
  Wind,
  AirVent,
} from 'lucide-react';

export default function RegistroHorometroPage() {
  const supabase = createClient();
  const params = useParams();
  const maquinariaId = params.maquinariaId;
  const umbrales = useUmbrales();

  const [maquinaria, setMaquinaria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultado, setResultado] = useState(null);


  const [formData, setFormData] = useState({
    operador_nombre: '',
    operador_cedula: '',
    turno: 'A',
    fecha: new Date().toISOString().split('T')[0],
    horometro_inicial: '',
    horometro_final: '',
    tanqueo_aplica: false,
    tanqueo_galones: '',
    condicion_filtro_aire: '',
  });

  useEffect(() => {
    if (maquinariaId) {
      cargarMaquinaria();
    } else {
      setError('URL inválida: no se encontró el ID del equipo');
      setLoading(false);
    }
  }, [maquinariaId]);

  async function cargarMaquinaria() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('maquinaria')
        .select('*')
        .eq('id', maquinariaId)
        .single()
        .abortSignal(AbortSignal.timeout(10000));

      if (err) throw err;
      if (!data) throw new Error('Equipo no encontrado');

      setMaquinaria(data);
      setFormData(prev => ({
        ...prev,
        horometro_inicial: data.horometro_actual != null ? String(data.horometro_actual) : '',
      }));
    } catch (err) {
      setError(err.message || 'Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const horasTrabajadas = formData.horometro_inicial && formData.horometro_final
    ? Math.max(0, parseFloat(formData.horometro_final) - parseFloat(formData.horometro_inicial))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.operador_nombre.trim()) {
      setError('El nombre del operador es requerido');
      return;
    }
    if (!formData.horometro_final) {
      setError('El horómetro final es requerido');
      return;
    }

    const hFinal = parseFloat(formData.horometro_final);
    const hInicial = parseFloat(formData.horometro_inicial) || 0;

    if (hFinal <= hInicial) {
      setError('El horómetro final debe ser mayor al inicial');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Insertar registro
      const insertData = {
        maquinaria_id: maquinariaId,
        operador_nombre: formData.operador_nombre.trim(),
        operador_cedula: formData.operador_cedula.trim(),
        turno: formData.turno,
        fecha: formData.fecha,
        horometro_inicial: hInicial,
        horometro_final: hFinal,
        tanqueo_galones: formData.tanqueo_aplica && formData.tanqueo_galones
          ? parseFloat(formData.tanqueo_galones)
          : null,
        condicion_filtro_aire: formData.condicion_filtro_aire || null,
      };

      const { error: errInsert } = await supabase
        .from('registros_horometro')
        .insert([insertData]);

      if (errInsert) {
        // Error de política RLS: usuario sin permisos
        if (errInsert.code === '42501' || errInsert.message?.includes('policy')) {
          throw new Error('No tienes permisos para registrar datos. Contacta al administrador.');
        }
        throw errInsert;
      }

      // 2. Actualizar horómetro de la máquina y condición de filtro de aire
      const updateData = { horometro_actual: hFinal }
      if (formData.condicion_filtro_aire) {
        updateData.ultima_condicion_filtro_aire = formData.condicion_filtro_aire
      }

      const { error: errUpdate } = await supabase
        .from('maquinaria')
        .update(updateData)
        .eq('id', maquinariaId);

      if (errUpdate) throw errUpdate;

      // 3. Calcular estado de alerta
      const estado = calcularEstadoAceite(hFinal, maquinaria.ultimo_cambio_aceite_horometro, umbrales.aceite);
      const horasDesdeCambio = calcularHorasDesdeCambio(hFinal, maquinaria.ultimo_cambio_aceite_horometro);
      const estadoFiltroAire = calcularEstadoFiltroAire(formData.condicion_filtro_aire);
      const configFiltroAire = getEstadoAceiteConfig(estadoFiltroAire);

      setResultado({
        operador: formData.operador_nombre.trim(),
        turno: formData.turno,
        fecha: formData.fecha,
        horometro_inicial: hInicial,
        horometro_final: hFinal,
        horas_turno: hFinal - hInicial,
        tanqueo: formData.tanqueo_aplica ? formData.tanqueo_galones : null,
        estado_alerta: estado,
        horas_desde_cambio: horasDesdeCambio,
        condicion_filtro_aire: formData.condicion_filtro_aire || null,
        estado_filtro_aire: estadoFiltroAire,
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Error al guardar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNuevoRegistro = () => {
    setSubmitted(false);
    setResultado(null);
    setFormData(prev => ({
      ...prev,
      horometro_inicial: String(maquinaria?.horometro_actual || ''),
      horometro_final: '',
      tanqueo_aplica: false,
      tanqueo_galones: '',
      condicion_filtro_aire: '',
    }));
  };

  // Estados de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#1A1A1A' }} />
          <p style={{ color: '#757575' }}>Cargando equipo...</p>
        </div>
      </div>
    );
  }

  if (error && !maquinaria) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center" style={{ borderColor: '#FECACA' }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={cargarMaquinaria}
            className="px-6 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!maquinaria) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1A1A1A' }}>Equipo no encontrado</h2>
          <p className="text-gray-500">El código QR no corresponde a un equipo registrado</p>
        </div>
      </div>
    );
  }

  // Pantalla de éxito
  if (submitted && resultado) {
    const config = getEstadoAceiteConfig(resultado.estado_alerta);
    const AlertIcon = resultado.estado_alerta === 'VENCIDO' ? AlertTriangle
      : resultado.estado_alerta === 'CRITICO' ? AlertCircle
      : resultado.estado_alerta === 'PROXIMO' ? Clock
      : CheckCircle2;

    return (
      <div className="min-h-screen p-4 flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full space-y-6 animate-slide-up">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#FFF8E1' }}>
              <CheckCircle2 className="w-10 h-10" style={{ color: '#10B981' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>Registro Exitoso</h2>
            <p className="text-gray-500 mt-1">Lectura de horómetro guardada</p>
          </div>

          {/* Resumen */}
          <div className="rounded-lg p-4 space-y-3 text-sm" style={{ backgroundColor: '#F5F5F5' }}>
            <div className="flex items-center gap-3 text-gray-700">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#FFC107', color: '#1A1A1A' }}>{maquinaria.codigo_interno?.charAt(0) || 'M'}</span>
              <span className="font-medium">{maquinaria.nombre}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <User className="w-4 h-4" style={{ color: '#FFC107' }} />
              <span>{resultado.operador}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FFC107', color: '#1A1A1A' }}>Turno {resultado.turno}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-4 h-4" style={{ color: '#FFC107' }} />
              <span>{new Date(resultado.fecha).toLocaleDateString('es-CO')}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Gauge className="w-4 h-4" style={{ color: '#FFC107' }} />
              <span>
                {resultado.horometro_inicial} <ArrowRight className="w-3 h-3 inline" /> {resultado.horometro_final} hrs
              </span>
            </div>
            <div className="flex items-center gap-3 font-medium" style={{ color: '#1A1A1A' }}>
              <Clock3 className="w-4 h-4" style={{ color: '#FFC107' }} />
              <span>{resultado.horas_turno} horas trabajadas</span>
            </div>
            {resultado.tanqueo && (
              <div className="flex items-center gap-3 text-gray-700">
                <Droplets className="w-4 h-4" style={{ color: '#FFC107' }} />
                <span>{resultado.tanqueo} galones</span>
              </div>
            )}
            {resultado.condicion_filtro_aire && (
              <div className="flex items-center gap-3 text-gray-700">
                <Wind className="w-4 h-4" style={{ color: '#FFC107' }} />
                <span>Filtro de aire: <span className="font-medium capitalize">{resultado.condicion_filtro_aire}</span></span>
              </div>
            )}
          </div>

          {/* Alerta de aceite */}
          {maquinaria.ultimo_cambio_aceite_horometro != null && (
            <div className={`rounded-lg border p-4 ${config.badge}`}>
              <div className="flex items-center gap-2">
                <AlertIcon className={`w-5 h-5 ${config.iconColor}`} />
                <span className={`font-semibold text-sm ${config.iconColor}`}>
                  Cambio de Aceite: {config.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-7">
                {resultado.horas_desde_cambio} hrs desde el último cambio (límite 300 hrs)
              </p>
            </div>
          )}

          {/* Alerta de filtro de aire */}
          {resultado.condicion_filtro_aire && (
            <div className={`rounded-lg border p-4 ${resultado.estado_filtro_aire === 'CRITICO' ? 'bg-red-50 border-red-200' : resultado.estado_filtro_aire === 'PROXIMO' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2">
                <Wind className={`w-5 h-5 ${resultado.estado_filtro_aire === 'CRITICO' ? 'text-red-600' : resultado.estado_filtro_aire === 'PROXIMO' ? 'text-yellow-600' : 'text-green-600'}`} />
                <span className={`font-semibold text-sm ${resultado.estado_filtro_aire === 'CRITICO' ? 'text-red-800' : resultado.estado_filtro_aire === 'PROXIMO' ? 'text-yellow-800' : 'text-green-800'}`}>
                  Filtro de Aire: {resultado.condicion_filtro_aire === 'buena' ? 'Buen estado' : resultado.condicion_filtro_aire === 'regular' ? 'Requiere atención' : 'Cambio urgente'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-7">
                Condición reportada por el operador
              </p>
            </div>
          )}

          <button
            onClick={handleNuevoRegistro}
            className="w-full py-3 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: '#1A1A1A' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1A1A1A'}
          >
            Registrar otro turno
          </button>
        </div>
      </div>
    );
  }

  // Formulario
  const estadoAceite = calcularEstadoAceite(maquinaria.horometro_actual, maquinaria.ultimo_cambio_aceite_horometro, umbrales.aceite);
  const horasDesdeCambio = calcularHorasDesdeCambio(maquinaria.horometro_actual, maquinaria.ultimo_cambio_aceite_horometro);
  const configAceite = getEstadoAceiteConfig(estadoAceite);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F5F5' }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 max-w-md w-full space-y-6">
        {/* Header con logo/equipo */}
        <div className="text-center pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm" style={{ backgroundColor: '#1A1A1A' }}>
            <Fuel className="w-7 h-7" style={{ color: '#FFC107' }} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{maquinaria.nombre}</h1>
          <p className="text-sm font-mono" style={{ color: '#757575' }}>{maquinaria.codigo_interno}</p>
        </div>

        {/* Estado actual */}
        <div className="rounded-xl p-4 space-y-2 text-sm" style={{ backgroundColor: '#F5F5F5' }}>
          <div className="flex items-center justify-between">
            <span style={{ color: '#757575' }}>Horómetro actual:</span>
            <span className="font-bold font-mono" style={{ color: '#1A1A1A' }}>
              {maquinaria.horometro_actual ?? 'N/A'} hrs
            </span>
          </div>
          {maquinaria.ultimo_cambio_aceite_horometro != null && (
            <div className="flex items-center justify-between">
              <span style={{ color: '#757575' }}>Cambio de aceite:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${configAceite.badge}`}>
                {horasDesdeCambio} hrs · {configAceite.label}
              </span>
            </div>
          )}
          {maquinaria.ultima_condicion_filtro_aire && (
            <div className="flex items-center justify-between">
              <span style={{ color: '#757575' }}>Filtro de aire:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                maquinaria.ultima_condicion_filtro_aire === 'critica' ? 'bg-red-100 text-red-800 border-red-200' :
                maquinaria.ultima_condicion_filtro_aire === 'regular' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}>
                <Wind className="w-3 h-3" />
                {maquinaria.ultima_condicion_filtro_aire === 'critica' ? 'Crítica' :
                 maquinaria.ultima_condicion_filtro_aire === 'regular' ? 'Regular' : 'Buena'}
              </span>
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
            <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Operador */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
              <User className="w-4 h-4 inline mr-1.5" style={{ color: '#FFC107' }} />
              Nombre del Operador *
            </label>
            <input
              type="text"
              name="operador_nombre"
              value={formData.operador_nombre}
              onChange={handleChange}
              placeholder="Nombre completo"
              className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: '#E0E0E0' }}
              onFocus={(e) => { e.target.style.borderColor = '#FFC107'; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)' }}
              onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; e.target.style.boxShadow = 'none' }}
              required
            />
          </div>

          {/* Cédula */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
              <Hash className="w-4 h-4 inline mr-1.5" style={{ color: '#FFC107' }} />
              Cédula
            </label>
            <input
              type="text"
              name="operador_cedula"
              value={formData.operador_cedula}
              onChange={handleChange}
              placeholder="Número de cédula"
              className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: '#E0E0E0' }}
              onFocus={(e) => { e.target.style.borderColor = '#FFC107'; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)' }}
              onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {/* Fecha + Turno */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
                <Calendar className="w-4 h-4 inline mr-1" style={{ color: '#FFC107' }} />
                Fecha
              </label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
                style={{ borderColor: '#E0E0E0' }}
                onFocus={(e) => { e.target.style.borderColor = '#FFC107'; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; e.target.style.boxShadow = 'none' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
                <Clock3 className="w-4 h-4 inline mr-1" style={{ color: '#FFC107' }} />
                Turno
              </label>
              <div className="flex gap-2 h-[48px]">
                {['A', 'B', 'C'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, turno: t }))}
                    className="flex-1 rounded-xl text-sm font-bold transition-all"
                    style={{
                      backgroundColor: formData.turno === t ? '#FFC107' : '#F5F5F5',
                      color: formData.turno === t ? '#1A1A1A' : '#757575',
                      border: formData.turno === t ? '2px solid #FFC107' : '2px solid #E0E0E0',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Horómetros */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
                <Gauge className="w-4 h-4 inline mr-1" style={{ color: '#FFC107' }} />
                Horómetro Inicial
              </label>
              <input
                type="number"
                name="horometro_inicial"
                value={formData.horometro_inicial}
                onChange={handleChange}
                className="w-full px-4 py-3 border rounded-xl text-base bg-gray-50"
                style={{ borderColor: '#E0E0E0', backgroundColor: '#F9FAFB' }}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
                <Gauge className="w-4 h-4 inline mr-1" style={{ color: '#FFC107' }} />
                Horómetro Final *
              </label>
              <input
                type="number"
                name="horometro_final"
                value={formData.horometro_final}
                onChange={handleChange}
                placeholder="Ej: 1250"
                inputMode="numeric"
                className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
                style={{ borderColor: '#E0E0E0' }}
                onFocus={(e) => { e.target.style.borderColor = '#FFC107'; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; e.target.style.boxShadow = 'none' }}
                required
              />
            </div>
          </div>

          {/* Horas trabajadas (auto-calculado) */}
          {horasTrabajadas > 0 && (
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE082' }}>
              <span className="text-sm font-medium flex items-center gap-2" style={{ color: '#1A1A1A' }}>
                <Clock3 className="w-4 h-4" style={{ color: '#FFC107' }} />
                Horas trabajadas
              </span>
              <span className="text-lg font-bold font-mono" style={{ color: '#1A1A1A' }}>
                {horasTrabajadas} hrs
              </span>
            </div>
          )}

          {/* Tanqueo */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#F5F5F5' }}>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <div
                className="relative"
                onClick={() => setFormData(prev => ({ ...prev, tanqueo_aplica: !prev.tanqueo_aplica }))}
              >
                <input
                  type="checkbox"
                  name="tanqueo_aplica"
                  checked={formData.tanqueo_aplica}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div
                  className="w-11 h-6 rounded-full transition-colors"
                  style={{
                    backgroundColor: formData.tanqueo_aplica ? '#FFC107' : '#E0E0E0',
                  }}
                >
                  <div
                    className="w-5 h-5 bg-white rounded-full shadow-sm transition-transform"
                    style={{
                      transform: formData.tanqueo_aplica ? 'translateX(24px)' : 'translateX(2px)',
                      marginTop: '2px',
                    }}
                  />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium" style={{ color: '#424242' }}>
                  <Droplets className="w-4 h-4 inline mr-1.5" style={{ color: '#FFC107' }} />
                  ¿Realizó tanqueo?
                </span>
              </div>
            </label>

            {formData.tanqueo_aplica && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#424242' }}>
                  Galones
                </label>
                <input
                  type="number"
                  name="tanqueo_galones"
                  value={formData.tanqueo_galones}
                  onChange={handleChange}
                  placeholder="Ej: 50"
                  inputMode="decimal"
                  step="0.1"
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
                  style={{ borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }}
                  onFocus={(e) => { e.target.style.borderColor = '#FFC107'; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; e.target.style.boxShadow = 'none' }}
                />
              </div>
            )}
          </div>

          {/* Condición Filtro de Aire */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#F5F5F5' }}>
            <label className="block text-sm font-medium mb-3" style={{ color: '#424242' }}>
              <Wind className="w-4 h-4 inline mr-1.5" style={{ color: '#FFC107' }} />
              Condición del Filtro de Aire
            </label>
            <div className="flex gap-2">
              {[
                { value: 'buena', label: 'Buena', color: '#10B981', bgColor: '#D1FAE5', borderColor: '#A7F3D0' },
                { value: 'regular', label: 'Regular', color: '#F59E0B', bgColor: '#FEF3C7', borderColor: '#FDE68A' },
                { value: 'critica', label: 'Crítica', color: '#EF4444', bgColor: '#FEE2E2', borderColor: '#FECACA' },
              ].map((opcion) => (
                <button
                  key={opcion.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, condicion_filtro_aire: opcion.value }))}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: formData.condicion_filtro_aire === opcion.value ? opcion.bgColor : '#FFFFFF',
                    color: formData.condicion_filtro_aire === opcion.value ? opcion.color : '#757575',
                    border: formData.condicion_filtro_aire === opcion.value
                      ? `2px solid ${opcion.color}`
                      : '2px solid #E0E0E0',
                  }}
                >
                  {opcion.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Evalúa visualmente el estado del filtro de aire
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
            onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#333' }}
            onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = '#1A1A1A' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Guardar Lectura
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>
          Serviequipos Mantenimiento Ltda.
        </p>
      </div>
    </div>
  );
}
