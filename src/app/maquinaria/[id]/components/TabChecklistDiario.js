'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatearFecha } from '@/lib/utils/maquinaria';
import { useToast } from '@/context/ToastContext';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
} from 'lucide-react';

const CHECKLIST_ITEMS = [
  { key: 'aceite_motor', label: 'Nivel de Aceite Motor', icon: '🛢️' },
  { key: 'liquido_hidraulico', label: 'Líquido Hidráulico', icon: '💧' },
  { key: 'refrigerante', label: 'Refrigerante', icon: '🌡️' },
  { key: 'filtro_aire', label: 'Filtro de Aire', icon: '💨' },
  { key: 'llantas', label: 'Llantas / Neumáticos', icon: '⚙️' },
  { key: 'luces', label: 'Luces', icon: '💡' },
  { key: 'frenos', label: 'Frenos', icon: '🛑' },
  { key: 'bocina', label: 'Bocina / Alarma', icon: '🔊' },
  { key: 'espejos', label: 'Espejos', icon: '🔍' },
  { key: 'cinturon', label: 'Cinturón de Seguridad', icon: '🔗' },
  { key: 'extintor', label: 'Extintor', icon: '🧯' },
  { key: 'botiquin', label: 'Botiquín', icon: '💊' },
  { key: 'limpieza', label: 'Limpieza General', icon: '🧹' },
  { key: 'fugas', label: 'Fugas de Fluidos', icon: '🔧' },
  { key: 'estado_general', label: 'Estado General', icon: '✅' },
];

const ESTADOS_CHECKLIST = [
  { value: 'bien', label: 'Bien', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'regular', label: 'Regular', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'mal', label: 'Mal', color: 'bg-red-100 text-red-700 border-red-200' },
];

export default function TabChecklistDiario({ maquinariaId, maquinaria, onUpdate, isAdmin = false }) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [checklistOk, setChecklistOk] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Form state
  const [operador, setOperador] = useState('');
  const [items, setItems] = useState(() => {
    const init = {};
    CHECKLIST_ITEMS.forEach(i => { init[i.key] = 'bien'; });
    return init;
  });
  const [observaciones, setObservaciones] = useState('');

  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('checklist_diario_maquinaria')
        .select('*')
        .eq('maquinaria_id', maquinariaId)
        .order('fecha', { ascending: false })
        .limit(20);

      if (err) throw err;
      setHistorial(data || []);
    } catch (err) {
      console.error('Error cargando checklist:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [maquinariaId]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  // Check if already done today
  const hoy = new Date().toISOString().split('T')[0];
  const hechoHoy = historial.some(h => {
    const fecha = h.fecha?.split('T')[0];
    return fecha === hoy;
  });

  const handleItemChange = (key, value) => {
    setItems(prev => ({ ...prev, [key]: value }));
  };

  const totalFallas = Object.entries(items).filter(([, v]) => v === 'mal').length;
  const totalRegulares = Object.entries(items).filter(([, v]) => v === 'regular').length;
  const aprobado = totalFallas === 0;

  const handleGuardar = async () => {
    if (!operador.trim()) {
      addToast('Ingresa el nombre del operador', { type: 'error' });
      return;
    }

    setGuardando(true);
    try {
      const { error: errInsert } = await supabase
        .from('checklist_diario_maquinaria')
        .insert([{
          maquinaria_id: maquinariaId,
          operador_nombre: operador.trim(),
          fecha: hoy,
          horometro: maquinaria?.horometro_actual || null,
          kilometraje: maquinaria?.kilometraje || null,
          ...items,
          total_fallas: totalFallas,
          observaciones: observaciones.trim() || null,
        }]);

      if (errInsert) throw errInsert;

      // Update ultimo_checklist_diario on maquinaria
      const { error: errMaq } = await supabase
        .from('maquinaria')
        .update({ ultimo_checklist_diario: hoy })
        .eq('id', maquinariaId);

      if (errMaq) throw errMaq;

      addToast('Checklist diario guardado exitosamente', { type: 'success' });
      setShowForm(false);
      setChecklistOk(true);
      setTimeout(() => setChecklistOk(false), 3000);
      if (onUpdate) onUpdate();
      cargarHistorial();
    } catch (err) {
      console.error('Error guardando checklist:', err);
      addToast('Error al guardar el checklist', { type: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const getEstadoGlobal = () => {
    if (historial.length === 0) return { label: 'Sin registros', badge: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock };
    const ultimo = new Date(historial[0].fecha);
    const diffDias = Math.floor((Date.now() - ultimo.getTime()) / 86400000);
    if (diffDias <= 1) return { label: 'Al día', badge: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
    if (diffDias <= 3) return { label: `Hace ${diffDias} días`, badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock };
    return { label: `Hace ${diffDias} días`, badge: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle };
  };

  const estadoGlobal = getEstadoGlobal();
  const EstadoIcon = estadoGlobal.icon;

  if (error && !historial.length) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">Error al cargar el checklist</p>
        <button onClick={cargarHistorial} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-gray-700" />
            Checklist Diario de Operación
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Registro diario de las condiciones de la maquinaria antes de la operación.
            Obligatorio antes del primer uso del día.
          </p>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <EstadoIcon className={`w-5 h-5 ${historial.length === 0 ? 'text-gray-400' : ''}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Estado: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estadoGlobal.badge}`}>{estadoGlobal.label}</span></p>
              {historial.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">Último: {formatearFecha(historial[0].fecha)} — {historial[0].operador_nombre} ({historial[0].total_fallas} fallas)</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col items-center justify-center text-center">
          {checklistOk && (
            <div className="text-green-600">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
              <p className="text-sm font-medium">Guardado hoy</p>
            </div>
          )}
          {hechoHoy && !checklistOk && (
            <div className="text-green-600">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-1" />
              <p className="text-sm font-medium">Completado hoy</p>
              <p className="text-xs text-gray-500 mt-1">Ya se registró el checklist diario</p>
            </div>
          )}
          {!hechoHoy && !checklistOk && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Realizar Checklist
            </button>
          )}
        </div>
      </div>

      {/* Formulario de checklist */}
      {showForm && !hechoHoy && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Nuevo Checklist — {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>

          {/* Operador */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Operador *</label>
            <input
              type="text"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              placeholder="Nombre completo"
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={guardando}
            />
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                </div>
                <div className="flex gap-1.5">
                  {ESTADOS_CHECKLIST.map((est) => (
                    <button
                      key={est.value}
                      type="button"
                      onClick={() => handleItemChange(item.key, est.value)}
                      disabled={guardando}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition ${
                        items[item.key] === est.value
                          ? est.color + ' ring-2 ring-offset-1'
                          : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {est.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="flex flex-wrap gap-3 mb-4 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">{CHECKLIST_ITEMS.length - totalFallas - totalRegulares} Bien</span>
            {totalRegulares > 0 && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">{totalRegulares} Regular</span>
            )}
            {totalFallas > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium animate-pulse">{totalFallas} Mal ⚠️</span>
            )}
          </div>

          {/* Observaciones */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={totalFallas > 0 ? 'Describe las fallas encontradas y acciones tomadas...' : 'Observaciones opcionales...'}
              rows={3}
              className="w-full max-w-lg px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={guardando}
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={handleGuardar}
              disabled={guardando || !operador.trim()}
              className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
              {guardando ? 'Guardando...' : 'Guardar Checklist'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              disabled={guardando}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5" /> Historial de Checklists
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : historial.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No hay checklists registrados</p>
            <p className="text-xs text-gray-400 mt-1">Completa el primer checklist usando el botón "Realizar Checklist"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {historial.map((h) => {
              const expandido = expandedId === h.id;
              const fallas = h.total_fallas || 0;
              return (
                <div key={h.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandido ? null : h.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${fallas === 0 ? 'bg-green-500' : fallas <= 2 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatearFecha(h.fecha)} — {h.operador_nombre}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fallas === 0 ? 'Sin fallas' : `${fallas} falla${fallas !== 1 ? 's' : ''}`}
                          {h.horometro ? ` · ${h.horometro} hrs` : ''}
                        </p>
                      </div>
                    </div>
                    {expandido ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {expandido && (
                    <div className="px-3 pb-3 border-t border-gray-100 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {CHECKLIST_ITEMS.map((item) => {
                          const val = h[item.key] || 'bien';
                          const color = val === 'bien' ? 'text-green-700' : val === 'regular' ? 'text-yellow-700' : 'text-red-700';
                          return (
                            <div key={item.key} className="flex items-center justify-between py-1 px-2 text-sm">
                              <span className="text-gray-600">{item.icon} {item.label}</span>
                              <span className={`font-medium capitalize ${color}`}>{val}</span>
                            </div>
                          );
                        })}
                      </div>
                      {h.observaciones && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                          <span className="font-medium">Obs: </span>{h.observaciones}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
