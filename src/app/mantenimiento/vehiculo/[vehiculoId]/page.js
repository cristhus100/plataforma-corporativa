'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  calcularEstadoAceite,
  calcularHorasDesdeCambio,
  getEstadoAceiteConfig,
} from '@/lib/utils/aceite';
import { useUmbrales } from '@/hooks/useUmbrales';
import {
  CheckCircle2, AlertTriangle, AlertCircle, Clock,
  User, Calendar, Gauge, ArrowRight, Loader2, Droplets, Clock3, Hash, Car,
} from 'lucide-react';

export default function RegistroVehiculoPage() {
  const supabase = createClient();
  const params = useParams();
  const vehiculoId = params.vehiculoId;
  const umbrales = useUmbrales();

  const [vehiculo, setVehiculo] = useState(null);
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
    kilometraje_inicial: '',
    kilometraje_final: '',
    tanqueo_aplica: false,
    tanqueo_galones: '',
  });

  useEffect(() => {
    if (vehiculoId) cargarVehiculo();
    else { setError('URL inválida'); setLoading(false); }
  }, [vehiculoId]);

  async function cargarVehiculo() {
    try {
      setLoading(true); setError(null);
      const { data, error: err } = await supabase
        .from('vehiculos').select('*').eq('id', vehiculoId).single()
        .abortSignal(AbortSignal.timeout(10000));
      if (err) throw err;
      if (!data) throw new Error('Vehículo no encontrado');
      setVehiculo(data);
      setFormData(prev => ({ ...prev, kilometraje_inicial: data.kilometraje_actual != null ? String(data.kilometraje_actual) : '' }));
    } catch (err) {
      setError(err.message || 'Error al cargar el vehículo');
    } finally { setLoading(false); }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const kmTrabajados = formData.kilometraje_inicial && formData.kilometraje_final
    ? Math.max(0, parseFloat(formData.kilometraje_final) - parseFloat(formData.kilometraje_inicial))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.operador_nombre.trim()) { setError('Nombre del operador requerido'); return; }
    if (!formData.kilometraje_final) { setError('Kilometraje final requerido'); return; }
    const kFinal = parseFloat(formData.kilometraje_final);
    const kInicial = parseFloat(formData.kilometraje_inicial) || 0;
    if (kFinal <= kInicial) { setError('El kilometraje final debe ser mayor al inicial'); return; }

    try {
      setSubmitting(true); setError(null);
      await supabase.from('registros_vehiculos').insert([{
        vehiculo_id: vehiculoId, operador_nombre: formData.operador_nombre.trim(),
        operador_cedula: formData.operador_cedula.trim(), turno: formData.turno,
        fecha: formData.fecha, kilometraje_inicial: kInicial, kilometraje_final: kFinal,
        tanqueo_galones: formData.tanqueo_aplica && formData.tanqueo_galones ? parseFloat(formData.tanqueo_galones) : null,
      }]);
      await supabase.from('vehiculos').update({ kilometraje_actual: kFinal }).eq('id', vehiculoId);

      const estado = calcularEstadoAceite(kFinal, vehiculo.ultimo_cambio_aceite_horometro, umbrales.aceite);
      const kmDesdeCambio = calcularHorasDesdeCambio(kFinal, vehiculo.ultimo_cambio_aceite_horometro);

      setResultado({
        operador: formData.operador_nombre.trim(), turno: formData.turno, fecha: formData.fecha,
        km_inicial: kInicial, km_final: kFinal, km_turno: kFinal - kInicial,
        tanqueo: formData.tanqueo_aplica ? formData.tanqueo_galones : null,
        estado_alerta: estado, km_desde_cambio: kmDesdeCambio,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.message || 'Error al guardar';
      if (err.code === '42501' || err.message?.includes('policy')) {
        setError('No tienes permisos para registrar datos. Contacta al administrador.');
      } else {
        setError(msg);
      }
    }
    finally { setSubmitting(false); }
  };

  const handleNuevoRegistro = () => {
    setSubmitted(false); setResultado(null);
    setFormData(prev => ({ ...prev, kilometraje_inicial: String(vehiculo?.kilometraje_actual || ''), kilometraje_final: '', tanqueo_aplica: false, tanqueo_galones: '' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-gray-900" /><p className="text-gray-500">Cargando vehículo...</p></div>
      </div>
    );
  }

  if (error && !vehiculo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={cargarVehiculo} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm">Reintentar</button>
        </div>
      </div>
    );
  }

  if (!vehiculo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center">
          <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Vehículo no encontrado</h2>
          <p className="text-gray-500 mt-1">El código QR no corresponde a un vehículo registrado</p>
        </div>
      </div>
    );
  }

  if (submitted && resultado) {
    const config = getEstadoAceiteConfig(resultado.estado_alerta);
    const AlertIcon = resultado.estado_alerta === 'VENCIDO' ? AlertTriangle : resultado.estado_alerta === 'CRITICO' ? AlertCircle : resultado.estado_alerta === 'PROXIMO' ? Clock : CheckCircle2;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full space-y-6 animate-slide-up">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900">Registro Exitoso</h2>
            <p className="text-gray-500 mt-1">Lectura de kilometraje guardada</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-700">
              <Car className="w-4 h-4 text-gray-400" /><span className="font-medium">{vehiculo.nombre} ({vehiculo.placa})</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <User className="w-4 h-4 text-gray-400" /><span>{resultado.operador}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-400 text-gray-900">Turno {resultado.turno}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" /><span>{new Date(resultado.fecha).toLocaleDateString('es-CO')}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Gauge className="w-4 h-4 text-gray-400" /><span>{resultado.km_inicial} <ArrowRight className="w-3 h-3 inline" /> {resultado.km_final} km</span>
            </div>
            <div className="flex items-center gap-3 font-medium text-gray-900">
              <Clock3 className="w-4 h-4 text-yellow-500" /><span>{resultado.km_turno} km recorridos</span>
            </div>
            {resultado.tanqueo && (
              <div className="flex items-center gap-3 text-gray-700">
                <Droplets className="w-4 h-4 text-yellow-500" /><span>{resultado.tanqueo} galones</span>
              </div>
            )}
          </div>
          {vehiculo.ultimo_cambio_aceite_horometro != null && (
            <div className={`rounded-lg border p-4 ${config.badge}`}>
              <div className="flex items-center gap-2">
                <AlertIcon className={`w-5 h-5 ${config.iconColor}`} />
                <span className={`font-semibold text-sm ${config.iconColor}`}>Cambio de Aceite: {config.label}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-7">{resultado.km_desde_cambio} km desde el último cambio</p>
            </div>
          )}
          <button onClick={handleNuevoRegistro} className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition">Registrar otro turno</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md w-full space-y-6">
        <div className="text-center pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm bg-gray-900">
            <Car className="w-7 h-7 text-yellow-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">{vehiculo.nombre}</h1>
          <p className="text-sm font-mono text-gray-500">{vehiculo.placa}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Kilometraje actual:</span>
            <span className="font-bold font-mono text-gray-900">{vehiculo.kilometraje_actual ?? 'N/A'} km</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5"><User className="w-4 h-4 inline mr-1.5 text-yellow-500" />Nombre del Operador *</label>
            <input type="text" name="operador_nombre" value={formData.operador_nombre} onChange={handleChange} placeholder="Nombre completo" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yellow-400" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5"><Hash className="w-4 h-4 inline mr-1.5 text-yellow-500" />Cédula</label>
            <input type="text" name="operador_cedula" value={formData.operador_cedula} onChange={handleChange} placeholder="Número de cédula" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5"><Calendar className="w-4 h-4 inline mr-1 text-yellow-500" />Fecha</label>
              <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5"><Clock3 className="w-4 h-4 inline mr-1 text-yellow-500" />Turno</label>
              <div className="flex gap-2 h-[48px]">
                {['A', 'B', 'C'].map(t => (
                  <button key={t} type="button" onClick={() => setFormData(prev => ({ ...prev, turno: t }))}
                    className="flex-1 rounded-xl text-sm font-bold transition-all"
                    style={{ backgroundColor: formData.turno === t ? '#FFC107' : '#F5F5F5', color: formData.turno === t ? '#1A1A1A' : '#757575', border: formData.turno === t ? '2px solid #FFC107' : '2px solid #E0E0E0' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5"><Gauge className="w-4 h-4 inline mr-1 text-yellow-500" />Km Inicial</label>
              <input type="number" name="kilometraje_inicial" value={formData.kilometraje_inicial} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base bg-gray-50" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5"><Gauge className="w-4 h-4 inline mr-1 text-yellow-500" />Km Final *</label>
              <input type="number" name="kilometraje_final" value={formData.kilometraje_final} onChange={handleChange} placeholder="Ej: 15200" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yellow-400" required />
            </div>
          </div>
          {kmTrabajados > 0 && (
            <div className="rounded-xl p-3 flex items-center justify-between bg-yellow-50 border border-yellow-200">
              <span className="text-sm font-medium flex items-center gap-2 text-gray-900"><Clock3 className="w-4 h-4 text-yellow-500" />Km recorridos</span>
              <span className="text-lg font-bold font-mono text-gray-900">{kmTrabajados} km</span>
            </div>
          )}
          <div className="rounded-xl p-4 bg-gray-50">
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <div className="relative" onClick={() => setFormData(prev => ({ ...prev, tanqueo_aplica: !prev.tanqueo_aplica }))}>
                <input type="checkbox" name="tanqueo_aplica" checked={formData.tanqueo_aplica} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 rounded-full transition-colors" style={{ backgroundColor: formData.tanqueo_aplica ? '#FFC107' : '#E0E0E0' }}>
                  <div className="w-5 h-5 bg-white rounded-full shadow-sm transition-transform" style={{ transform: formData.tanqueo_aplica ? 'translateX(24px)' : 'translateX(2px)', marginTop: '2px' }} />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700"><Droplets className="w-4 h-4 inline mr-1.5 text-yellow-500" />¿Realizó tanqueo?</span>
            </label>
            {formData.tanqueo_aplica && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Galones</label>
                <input type="number" name="tanqueo_galones" value={formData.tanqueo_galones} onChange={handleChange} placeholder="Ej: 50" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              </div>
            )}
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-xl font-semibold text-base bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
            {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />Guardando...</> : <><CheckCircle2 className="w-5 h-5" />Guardar Lectura</>}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400">Serviequipos Mantenimiento Ltda.</p>
      </div>
    </div>
  );
}
