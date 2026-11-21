'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { CHECKLIST_ITEMS, ESTADOS_CHECKLIST, CHECKLIST_DEFAULT_STATE } from '@/lib/utils/checklist';
import { obtenerMaquinariaMovil, guardarChecklistMovil, guardarTanqueoMovil } from '@/actions/checklist-movil';
import {
  Fuel,
  Droplets,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Gauge,
  User,
} from 'lucide-react';

const COLORES = {
  amarillo: '#FFC107',
  negro: '#1A1A1A',
  gris: '#F5F5F5',
  borde: '#E0E0E0',
  textoSec: '#757575',
  texto: '#424242',
  verde: '#10B981',
  red: '#EF4444',
};

export default function ChecklistMovilPage() {
  const params = useParams();
  const router = useRouter();
  const maquinariaId = params?.maquinariaId;
  const { addToast } = useToast();

  const [maquinaria, setMaquinaria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [exito, setExito] = useState(null); // 'checklist' | 'tanqueo'

  // Checklist state
  const [operador, setOperador] = useState('');
  const [items, setItems] = useState(() => {
    const init = {};
    CHECKLIST_ITEMS.forEach((i) => { init[i.key] = CHECKLIST_DEFAULT_STATE; });
    return init;
  });
  const [observaciones, setObservaciones] = useState('');
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);

  // Tanqueo state
  const [operadorTanqueo, setOperadorTanqueo] = useState('');
  const [turno, setTurno] = useState('A');
  const [galones, setGalones] = useState('');
  const [guardandoTanqueo, setGuardandoTanqueo] = useState(false);

  const cargarMaquinaria = async () => {
    try {
      setLoading(true);
      const res = await obtenerMaquinariaMovil(maquinariaId);
      if (res.success) {
        setMaquinaria(res.maquinaria);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err?.message || 'Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (maquinariaId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarMaquinaria();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maquinariaId]);

  const totalFallas = Object.values(items).filter((v) => v === 'mal').length;
  const totalRegulares = Object.values(items).filter((v) => v === 'regular').length;
  const checklistOk = totalFallas === 0;

  const handleItemChange = (key, value) => {
    setItems((prev) => ({ ...prev, [key]: value }));
  };

  const resetChecklist = () => {
    setOperador('');
    setItems(() => {
      const init = {};
      CHECKLIST_ITEMS.forEach((i) => { init[i.key] = CHECKLIST_DEFAULT_STATE; });
      return init;
    });
    setObservaciones('');
  };

  const handleGuardarChecklist = async () => {
    if (!operador.trim()) {
      addToast('Ingresa el nombre del operador', { type: 'error' });
      return;
    }

    setGuardandoChecklist(true);
    try {
      const res = await guardarChecklistMovil({
        maquinariaId: Number(maquinariaId),
        operador_nombre: operador.trim(),
        items,
        observaciones: observaciones.trim(),
      });

      if (res.success) {
        setExito('checklist');
        resetChecklist();
      } else {
        addToast('Error al guardar el checklist: ' + (res.error || 'Error'), { type: 'error' });
      }
    } catch (err) {
      addToast('Error al guardar el checklist: ' + (err?.message || 'Error'), { type: 'error' });
    } finally {
      setGuardandoChecklist(false);
    }
  };

  const resetTanqueo = () => {
    setOperadorTanqueo('');
    setTurno('A');
    setGalones('');
  };

  const handleGuardarTanqueo = async () => {
    if (!operadorTanqueo.trim()) {
      addToast('Ingresa el nombre del operador', { type: 'error' });
      return;
    }
    if (!galones || parseFloat(galones) <= 0) {
      addToast('Ingresa la cantidad de galones', { type: 'error' });
      return;
    }

    setGuardandoTanqueo(true);
    try {
      const res = await guardarTanqueoMovil({
        maquinariaId: Number(maquinariaId),
        operador_nombre: operadorTanqueo.trim(),
        turno,
        galones: parseFloat(galones),
      });

      if (res.success) {
        setExito('tanqueo');
        resetTanqueo();
      } else {
        addToast('Error al registrar el tanqueo: ' + (res.error || 'Error'), { type: 'error' });
      }
    } catch (err) {
      addToast('Error al registrar el tanqueo: ' + (err?.message || 'Error'), { type: 'error' });
    } finally {
      setGuardandoTanqueo(false);
    }
  };

  // ============ LOADING ============
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: COLORES.gris }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: COLORES.amarillo }} />
          <p style={{ color: COLORES.textoSec }}>Cargando equipo...</p>
        </div>
      </div>
    );
  }

  // ============ ERROR ============
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: COLORES.gris }}>
        <div className="bg-white rounded-2xl shadow-sm border p-8 max-w-md w-full text-center" style={{ borderColor: '#FECACA' }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: COLORES.red }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: COLORES.negro }}>Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={cargarMaquinaria}
            className="px-6 py-2 rounded-lg text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: COLORES.negro }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ============ NO ENCONTRADA ============
  if (!maquinaria) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: COLORES.gris }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: COLORES.negro }}>Equipo no encontrado</h2>
          <p className="text-gray-500">El código QR no corresponde a un equipo registrado</p>
        </div>
      </div>
    );
  }

  const checklistHoy = maquinaria.checklist_hoy;

  // ============ ÉXITO ============
  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: COLORES.gris }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#FFF8E1' }}>
            {exito === 'checklist' ? (
              <ClipboardCheck className="w-10 h-10" style={{ color: COLORES.verde }} />
            ) : (
              <Droplets className="w-10 h-10" style={{ color: COLORES.verde }} />
            )}
          </div>
          <h2 className="text-xl font-bold" style={{ color: COLORES.negro }}>
            {exito === 'checklist' ? 'Checklist Registrado' : 'Tanqueo Registrado'}
          </h2>
          <p className="text-gray-500 mt-1">
            {exito === 'checklist'
              ? 'El checklist diario se registró correctamente'
              : `${galones} galones registrados correctamente`}
          </p>
          <button
            onClick={() => setExito(null)}
            className="w-full py-3 rounded-xl font-semibold text-base transition-colors"
            style={{ backgroundColor: COLORES.negro, color: '#FFFFFF' }}
          >
            Hacer otro registro
          </button>
        </div>
      </div>
    );
  }

  // ============ FORMULARIO PRINCIPAL ============
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORES.gris }}>
      {/* Header */}
      <div className="text-white" style={{ backgroundColor: COLORES.negro }}>
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-white/70 hover:text-white transition"
            aria-label="Volver"
          >
            ←
          </button>
          <Fuel className="w-6 h-6" style={{ color: COLORES.amarillo }} />
          <div>
            <h1 className="text-lg font-bold leading-tight">{maquinaria.nombre}</h1>
            <p className="text-xs font-mono text-white/70">{maquinaria.codigo_interno}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 pb-8 space-y-6">
        {/* INFO MÁQUINA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: COLORES.textoSec }}>
              <Gauge className="w-4 h-4" style={{ color: COLORES.amarillo }} /> Horómetro
            </span>
            <span className="font-bold font-mono" style={{ color: COLORES.negro }}>
              {maquinaria.horometro_actual ?? 'N/A'} hrs
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2" style={{ color: COLORES.textoSec }}>
              <ClipboardCheck className="w-4 h-4" style={{ color: COLORES.amarillo }} /> Checklist hoy
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium border"
              style={
                checklistHoy
                  ? { backgroundColor: '#D1FAE5', color: '#065F46', borderColor: '#A7F3D0' }
                  : { backgroundColor: '#F3F4F6', color: '#4B5563', borderColor: '#E5E7EB' }
              }
            >
              {checklistHoy ? 'Registrado' : 'Pendiente'}
            </span>
          </div>
        </div>

        {/* CHECKLIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: COLORES.negro }}>
            <ClipboardCheck className="w-5 h-5" style={{ color: COLORES.amarillo }} />
            Checklist Diario
          </h2>

          {checklistHoy ? (
            <div className="rounded-xl p-4 text-center" style={{ backgroundColor: COLORES.gris }}>
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: COLORES.verde }} />
              <p className="text-sm font-medium" style={{ color: COLORES.negro }}>Checklist ya registrado hoy</p>
              <p className="text-xs text-gray-500 mt-1">
                {checklistHoy.operador_nombre} · {checklistHoy.total_fallas} fallas
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: COLORES.texto }}>
                  <User className="w-4 h-4 inline mr-1.5" style={{ color: COLORES.amarillo }} />
                  Nombre del Operador *
                </label>
                <input
                  type="text"
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
                  style={{ borderColor: COLORES.borde }}
                  onFocus={(e) => { e.target.style.borderColor = COLORES.amarillo; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = COLORES.borde; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <div className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ backgroundColor: COLORES.gris }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm font-medium" style={{ color: COLORES.texto }}>{item.label}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {ESTADOS_CHECKLIST.map((est) => (
                        <button
                          key={est.value}
                          type="button"
                          onClick={() => handleItemChange(item.key, est.value)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium border transition"
                          style={{
                            backgroundColor: items[item.key] === est.value ? undefined : '#FFFFFF',
                            color: items[item.key] === est.value ? undefined : '#6B7280',
                            borderColor: items[item.key] === est.value ? 'transparent' : '#E5E7EB',
                            fontWeight: items[item.key] === est.value ? 700 : 400,
                          }}
                        >
                          <span style={{ color: items[item.key] === est.value ? (est.value === 'bien' ? COLORES.verde : est.value === 'regular' ? '#D97706' : COLORES.red) : '#6B7280' }}>
                            {est.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 text-sm">
                <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>{CHECKLIST_ITEMS.length - totalFallas - totalRegulares} Bien</span>
                {totalRegulares > 0 && <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>{totalRegulares} Regular</span>}
                {totalFallas > 0 && <span className="px-3 py-1 rounded-full font-medium" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>{totalFallas} Mal ⚠️</span>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: COLORES.texto }}>Observaciones</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder={totalFallas > 0 ? 'Describe las fallas encontradas...' : 'Observaciones opcionales...'}
                  rows={2}
                  className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
                  style={{ borderColor: COLORES.borde }}
                  onFocus={(e) => { e.target.style.borderColor = COLORES.amarillo; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)'; }}
                  onBlur={(e) => { e.target.style.borderColor = COLORES.borde; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="button"
                onClick={handleGuardarChecklist}
                disabled={guardandoChecklist || !operador.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: COLORES.negro, color: '#FFFFFF' }}
              >
                {guardandoChecklist ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Guardar Checklist
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* TANQUEO */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: COLORES.negro }}>
            <Droplets className="w-5 h-5" style={{ color: COLORES.verde }} />
            Tanqueo
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLORES.texto }}>
              <User className="w-4 h-4 inline mr-1.5" style={{ color: COLORES.amarillo }} />
              Operador *
            </label>
            <input
              type="text"
              value={operadorTanqueo}
              onChange={(e) => setOperadorTanqueo(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: COLORES.borde }}
              onFocus={(e) => { e.target.style.borderColor = COLORES.amarillo; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = COLORES.borde; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLORES.texto }}>
              Turno
            </label>
            <div className="flex gap-2">
              {['A', 'B', 'C'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurno(t)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    backgroundColor: turno === t ? COLORES.amarillo : COLORES.gris,
                    color: turno === t ? COLORES.negro : COLORES.textoSec,
                    border: turno === t ? `2px solid ${COLORES.amarillo}` : '2px solid #E5E7EB',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLORES.texto }}>
              Galones *
            </label>
            <input
              type="number"
              value={galones}
              onChange={(e) => setGalones(e.target.value)}
              placeholder="Ej: 50"
              inputMode="decimal"
              step="0.1"
              className="w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors"
              style={{ borderColor: COLORES.borde }}
              onFocus={(e) => { e.target.style.borderColor = COLORES.amarillo; e.target.style.boxShadow = '0 0 0 2px rgba(255,193,7,0.2)'; }}
              onBlur={(e) => { e.target.style.borderColor = COLORES.borde; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <button
            type="button"
            onClick={handleGuardarTanqueo}
            disabled={guardandoTanqueo}
            className="w-full py-3.5 rounded-xl font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            {guardandoTanqueo ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Droplets className="w-5 h-5" />
                Registrar Tanqueo
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: '#9CA3AF' }}>
          Serviequipos Mantenimiento Ltda.
        </p>
      </div>
    </div>
  );
}
