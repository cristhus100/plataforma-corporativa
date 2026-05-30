'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  calcularEstadoAceite,
  calcularHorasDesdeCambio,
  getEstadoAceiteConfig,
  calcularEstadoFiltroCombustible,
  calcularHorasDesdeCambioFiltro,
} from '@/lib/utils/aceite';
import { formatearFecha } from '@/lib/utils/maquinaria';
import {
  Fuel,
  Download,
  Copy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Gauge,
  History,
  Loader2,
  QrCode,
  Check,
  AirVent,
} from 'lucide-react';
import QRCode from 'qrcode';

export default function TabMantenimiento({ vehiculoId, vehiculo, onUpdate, isAdmin = false }) {
  const [lecturas, setLecturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [cambioRealizado, setCambioRealizado] = useState(null); // 'aceite' | 'filtro' | null
  const canvasRef = useRef(null);

  // Estados de aceite
  const [confirmarAceite, setConfirmarAceite] = useState(false);
  const [tecnicoAceite, setTecnicoAceite] = useState('');
  const [guardandoAceite, setGuardandoAceite] = useState(false);

  // Estados de filtros
  const [confirmarFiltro, setConfirmarFiltro] = useState(false);
  const [tecnicoFiltro, setTecnicoFiltro] = useState('');
  const [guardandoFiltro, setGuardandoFiltro] = useState(false);

  const estadoAceite = calcularEstadoAceite(vehiculo.kilometraje_actual, vehiculo.ultimo_cambio_aceite_horometro);
  const kmDesdeCambio = calcularHorasDesdeCambio(vehiculo.kilometraje_actual, vehiculo.ultimo_cambio_aceite_horometro);
  const configAceite = getEstadoAceiteConfig(estadoAceite);

  const estadoFiltro = calcularEstadoFiltroCombustible(vehiculo.kilometraje_actual, vehiculo.ultimo_cambio_filtro_combustible_horometro);
  const kmDesdeCambioFiltro = calcularHorasDesdeCambioFiltro(vehiculo.kilometraje_actual, vehiculo.ultimo_cambio_filtro_combustible_horometro);
  const configFiltro = getEstadoAceiteConfig(estadoFiltro);

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/mantenimiento/vehiculo/${vehiculoId}`
    : '';

  const AlertIconAceite = estadoAceite === 'VENCIDO' ? AlertTriangle
    : estadoAceite === 'CRITICO' ? AlertCircle
    : estadoAceite === 'PROXIMO' ? Clock
    : CheckCircle2;

  const AlertIconFiltro = estadoFiltro === 'VENCIDO' ? AlertTriangle
    : estadoFiltro === 'CRITICO' ? AlertCircle
    : estadoFiltro === 'PROXIMO' ? Clock
    : CheckCircle2;

  const cargarLecturas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('registros_vehiculos')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setLecturas(data || []);
    } catch (err) {
      console.error('Error cargando lecturas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vehiculoId]);

  useEffect(() => {
    cargarLecturas();
  }, [cargarLecturas]);

  useEffect(() => {
    if (canvasRef.current && qrUrl) {
      QRCode.toCanvas(canvasRef.current, qrUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
      });
    }
  }, [qrUrl]);

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `QR-${vehiculo.placa || vehiculoId}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopiarURL = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = qrUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleCambioAceite = async () => {
    if (!tecnicoAceite.trim()) {
      setError('Ingresa el nombre del técnico');
      return;
    }
    try {
      setGuardandoAceite(true);
      setError(null);
      const hoy = new Date().toISOString().split('T')[0];
      const kmActual = vehiculo.kilometraje_actual || 0;

      const { error: errInsert } = await supabase.from('registros_vehiculos').insert([{
        vehiculo_id: vehiculoId,
        operador_nombre: tecnicoAceite.trim(),
        fecha: hoy,
        kilometraje_inicial: kmActual,
        kilometraje_final: kmActual,
        es_cambio_aceite: true,
      }]);
      if (errInsert) throw errInsert;

      const { error: err } = await supabase.from('vehiculos').update({
        ultimo_cambio_aceite_horometro: kmActual,
        ultimo_cambio_aceite_fecha: hoy,
        ultimo_cambio_aceite_operador: tecnicoAceite.trim(),
      }).eq('id', vehiculoId);
      if (err) throw err;

      setConfirmarAceite(false);
      setTecnicoAceite('');
      setCambioRealizado('aceite');
      setTimeout(() => setCambioRealizado(null), 3000);
      if (onUpdate) onUpdate();
      cargarLecturas();
    } catch (err) {
      setError(err.message || 'Error al realizar el cambio de aceite');
    } finally {
      setGuardandoAceite(false);
    }
  };

  const handleCambioFiltro = async () => {
    if (!tecnicoFiltro.trim()) {
      setError('Ingresa el nombre del técnico');
      return;
    }
    try {
      setGuardandoFiltro(true);
      setError(null);
      const hoy = new Date().toISOString().split('T')[0];
      const kmActual = vehiculo.kilometraje_actual || 0;

      const { error: errInsert } = await supabase.from('registros_vehiculos').insert([{
        vehiculo_id: vehiculoId,
        operador_nombre: tecnicoFiltro.trim(),
        fecha: hoy,
        kilometraje_inicial: kmActual,
        kilometraje_final: kmActual,
        es_cambio_filtro_combustible: true,
      }]);
      if (errInsert) throw errInsert;

      const { error: err } = await supabase.from('vehiculos').update({
        ultimo_cambio_filtro_combustible_horometro: kmActual,
        ultimo_cambio_filtro_combustible_fecha: hoy,
        ultimo_cambio_filtro_combustible_operador: tecnicoFiltro.trim(),
      }).eq('id', vehiculoId);
      if (err) throw err;

      setConfirmarFiltro(false);
      setTecnicoFiltro('');
      setCambioRealizado('filtro');
      setTimeout(() => setCambioRealizado(null), 3000);
      if (onUpdate) onUpdate();
      cargarLecturas();
    } catch (err) {
      setError(err.message || 'Error al cambiar los filtros de combustible');
    } finally {
      setGuardandoFiltro(false);
    }
  };

  if (error && !lecturas.length) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">Error al cargar los datos</p>
        <button onClick={cargarLecturas} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========== ESTADOS ========== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card: Aceite de Motor */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Fuel className="w-5 h-5" style={{ color: '#DC2626' }} />
            Aceite de Motor
            <span className="text-xs font-normal text-gray-400">(cada 300 km)</span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Estado</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${configAceite.badge}`}>
                <AlertIconAceite className={`w-3.5 h-3.5 ${configAceite.iconColor}`} />
                {configAceite.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">km desde cambio</span>
              <span className={`text-base font-bold ${configAceite.iconColor}`}>
                {kmDesdeCambio} km
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Último cambio</span>
              <span className="text-xs text-gray-700 text-right">
                {vehiculo.ultimo_cambio_aceite_fecha
                  ? `${formatearFecha(vehiculo.ultimo_cambio_aceite_fecha)} a los ${vehiculo.ultimo_cambio_aceite_horometro} km`
                  : 'Sin registro'}
              </span>
            </div>
          </div>

          {!confirmarAceite ? (
            <button
              onClick={() => { setConfirmarAceite(true); setError(null); }}
              className="mt-4 w-full px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: '#DC2626' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B91C1C'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
            >
              <Fuel className="w-4 h-4" />
              Cambiar Aceite de Motor
            </button>
          ) : (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-red-800">
                Incluye cambio de filtro de aceite de motor
              </p>
              <input
                type="text"
                value={tecnicoAceite}
                onChange={(e) => setTecnicoAceite(e.target.value)}
                placeholder="Nombre del técnico *"
                className="w-full px-3 py-1.5 border border-red-300 rounded-md text-sm bg-white"
                disabled={guardandoAceite}
              />
              <div className="flex gap-2">
                {isAdmin && (
                <button onClick={handleCambioAceite} disabled={guardandoAceite || !tecnicoAceite.trim()}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#DC2626' }}>
                  {guardandoAceite ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Confirmar'}
                </button>
                )}
                <button onClick={() => { setConfirmarAceite(false); setError(null); }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs" disabled={guardandoAceite}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card: Filtros de Combustible */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AirVent className="w-5 h-5" style={{ color: '#2563EB' }} />
            Filtros de Combustible
            <span className="text-xs font-normal text-gray-400">(cada 120 km)</span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Estado</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${configFiltro.badge}`}>
                <AlertIconFiltro className={`w-3.5 h-3.5 ${configFiltro.iconColor}`} />
                {configFiltro.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">km desde cambio</span>
              <span className={`text-base font-bold ${configFiltro.iconColor}`}>
                {kmDesdeCambioFiltro} km
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Último cambio</span>
              <span className="text-xs text-gray-700 text-right">
                {vehiculo.ultimo_cambio_filtro_combustible_fecha
                  ? `${formatearFecha(vehiculo.ultimo_cambio_filtro_combustible_fecha)} a los ${vehiculo.ultimo_cambio_filtro_combustible_horometro} km`
                  : 'Sin registro'}
              </span>
            </div>
          </div>

          {!confirmarFiltro ? (
            <button
              onClick={() => { setConfirmarFiltro(true); setError(null); }}
              className="mt-4 w-full px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2563EB' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1D4ED8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
            >
              <AirVent className="w-4 h-4" />
              Cambiar Filtros de Combustible
            </button>
          ) : (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <input
                type="text"
                value={tecnicoFiltro}
                onChange={(e) => setTecnicoFiltro(e.target.value)}
                placeholder="Nombre del técnico *"
                className="w-full px-3 py-1.5 border border-blue-300 rounded-md text-sm bg-white"
                disabled={guardandoFiltro}
              />
              <div className="flex gap-2">
                <button onClick={handleCambioFiltro} disabled={guardandoFiltro || !tecnicoFiltro.trim()}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#2563EB' }}>
                  {guardandoFiltro ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Confirmar'}
                </button>
                <button onClick={() => { setConfirmarFiltro(false); setError(null); }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs" disabled={guardandoFiltro}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mensajes de éxito */}
      {cambioRealizado && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800">
            {cambioRealizado === 'aceite' ? 'Cambio de aceite de motor registrado exitosamente' : 'Cambio de filtros de combustible registrado exitosamente'}
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Acciones generales */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleDownloadQR}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center gap-2">
          <Download className="w-4 h-4" /> Descargar QR
        </button>
        <button onClick={handleCopiarURL}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2">
          {copiado ? <><Check className="w-4 h-4 text-green-600" /><span className="text-green-600">Copiado</span></>
            : <><Copy className="w-4 h-4" /> Copiar URL</>}
        </button>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <QrCode className="w-4 h-4" /> Código QR para Registro de Kilometraje
        </h3>
        <div className="flex justify-center">
          <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
            <canvas ref={canvasRef} />
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-3">Escanea para registrar lecturas de kilometraje</p>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5" /> Historial de Registros
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : lecturas.length === 0 ? (
          <div className="text-center py-8"><Gauge className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">No hay registros</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Fecha</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Técnico</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">Km Inicial</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">Km Final</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">Recorrido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lecturas.map((lectura) => {
                  let badgeTipo = null;
                  let badgeStyle = {};
                  if (lectura.es_cambio_aceite) {
                    badgeTipo = 'ACEITE MOTOR';
                    badgeStyle = { backgroundColor: '#DC2626', color: '#FFFFFF' };
                  } else if (lectura.es_cambio_filtro_combustible) {
                    badgeTipo = 'FILTRO COMBUSTIBLE';
                    badgeStyle = { backgroundColor: '#2563EB', color: '#FFFFFF' };
                  }
                  return (
                    <tr key={lectura.id} className={`hover:bg-gray-50 ${badgeTipo ? 'bg-blue-50/30' : ''}`}>
                      <td className="py-2 px-3 text-gray-900">
                        <div className="flex items-center gap-2">
                          {badgeTipo && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold" style={badgeStyle}>
                              {badgeTipo}
                            </span>
                          )}
                          {formatearFecha(lectura.fecha)}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-gray-700">
                        {lectura.operador_nombre}
                        {lectura.operador_cedula && <span className="text-xs text-gray-400 block">CC {lectura.operador_cedula}</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{lectura.kilometraje_inicial}</td>
                      <td className="py-2 px-3 text-right font-mono">{lectura.kilometraje_final}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-gray-900">
                        {(lectura.kilometraje_final || 0) - (lectura.kilometraje_inicial || 0)}
                      </td>
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
