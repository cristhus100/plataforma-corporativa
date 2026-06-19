'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/context/ToastContext';
import { formatearFecha, formatearMoneda } from '@/lib/utils/maquinaria';
import {
  Wrench,
  AlertTriangle,
  Loader2,
  Plus,
  X,
  Save,
  CheckCircle2,
  Fuel,
  Droplets,
  Calendar,
  User,
  Gauge,
  DollarSign,
  Building2,
  FileText,
  ClipboardList,
} from 'lucide-react';

const SUB_TABS = [
  { id: 'preventivos', label: 'Preventivos', icon: '🛡️' },
  { id: 'correctivos', label: 'Correctivos', icon: '🔧' },
  { id: 'tanqueos', label: 'Tanqueos', icon: '⛽' },
];

export default function TabHistorial({ vehiculoId, vehiculo, isAdmin = false }) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('preventivos');

  // Preventivos
  const [preventivos, setPreventivos] = useState([]);
  const [loadingPrev, setLoadingPrev] = useState(true);
  const [errorPrev, setErrorPrev] = useState(null);
  const [showFormPrev, setShowFormPrev] = useState(false);
  const [formPrev, setFormPrev] = useState({ titulo: '', descripcion: '', fecha: '', kilometraje: '', operador_nombre: '', costo: '', proveedor: '' });
  const [savingPrev, setSavingPrev] = useState(false);

  // Correctivos
  const [correctivos, setCorrectivos] = useState([]);
  const [loadingCorr, setLoadingCorr] = useState(true);
  const [errorCorr, setErrorCorr] = useState(null);
  const [showFormCorr, setShowFormCorr] = useState(false);
  const [formCorr, setFormCorr] = useState({ titulo: '', descripcion: '', fecha: '', kilometraje: '', operador_nombre: '', costo: '', proveedor: '' });
  const [savingCorr, setSavingCorr] = useState(false);

  // Tanqueos
  const [tanqueos, setTanqueos] = useState([]);
  const [loadingTanq, setLoadingTanq] = useState(true);
  const [errorTanq, setErrorTanq] = useState(null);

  const [mensajeExito, setMensajeExito] = useState('');

  const hoyStr = new Date().toISOString().split('T')[0];

  // === CARGAR PREVENTIVOS ===
  const cargarPreventivos = useCallback(async () => {
    try {
      setLoadingPrev(true);
      setErrorPrev(null);

      const [resMant, resReg] = await Promise.all([
        supabase.from('mantenimientos_vehiculos').select('*').eq('vehiculo_id', vehiculoId).eq('tipo', 'preventivo').order('fecha', { ascending: false }),
        supabase.from('registros_vehiculos').select('*').eq('vehiculo_id', vehiculoId).eq('es_cambio_aceite', true).order('fecha', { ascending: false }),
      ]);

      if (resMant.error) throw resMant.error;
      if (resReg.error) throw resReg.error;

      // Unificar: cambios de aceite como preventivos
      const cambiosAceite = (resReg.data || []).map(r => ({
        id: `aceite-${r.id}`,
        tipo: 'preventivo',
        titulo: 'Cambio de Aceite',
        descripcion: `Realizado a los ${r.kilometraje_final} km`,
        fecha: r.fecha,
        kilometraje: r.kilometraje_final || r.kilometraje_inicial,
        operador_nombre: r.operador_nombre,
        costo: null,
        proveedor: '',
        es_cambio_aceite: true,
        created_at: r.created_at,
      }));

      const todos = [...(resMant.data || []), ...cambiosAceite];
      todos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setPreventivos(todos);
    } catch (err) {
      setErrorPrev(err.message);
    } finally {
      setLoadingPrev(false);
    }
  }, [vehiculoId]);

  // === CARGAR CORRECTIVOS ===
  const cargarCorrectivos = useCallback(async () => {
    try {
      setLoadingCorr(true);
      setErrorCorr(null);
      const { data, error } = await supabase
        .from('mantenimientos_vehiculos')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .eq('tipo', 'correctivo')
        .order('fecha', { ascending: false });
      if (error) throw error;
      setCorrectivos(data || []);
    } catch (err) {
      setErrorCorr(err.message);
    } finally {
      setLoadingCorr(false);
    }
  }, [vehiculoId]);

  // === CARGAR TANQUEOS ===
  const cargarTanqueos = useCallback(async () => {
    try {
      setLoadingTanq(true);
      setErrorTanq(null);
      const { data, error } = await supabase
        .from('registros_vehiculos')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .not('tanqueo_galones', 'is', null)
        .order('fecha', { ascending: false });
      if (error) throw error;
      setTanqueos(data || []);
    } catch (err) {
      setErrorTanq(err.message);
    } finally {
      setLoadingTanq(false);
    }
  }, [vehiculoId]);

  useEffect(() => {
    if (activeTab === 'preventivos') cargarPreventivos();
    if (activeTab === 'correctivos') cargarCorrectivos();
    if (activeTab === 'tanqueos') cargarTanqueos();
  }, [activeTab, cargarPreventivos, cargarCorrectivos, cargarTanqueos]);

  // === GUARDAR MANTENIMIENTO ===
  const guardarMantenimiento = async (tipo, form, setForm, setSaving, setShowForm, cargarFn) => {
    if (!form.titulo.trim()) return;

    try {
      setSaving(true);
      const payload = {
        vehiculo_id: vehiculoId,
        tipo,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha || hoyStr,
        kilometraje: form.kilometraje ? parseFloat(form.kilometraje) : null,
        operador_nombre: form.operador_nombre.trim(),
        costo: form.costo ? parseFloat(form.costo) : null,
        proveedor: form.proveedor.trim(),
      };

      const { error } = await supabase.from('mantenimientos_vehiculos').insert([payload]);
      if (error) throw error;

      setForm({ titulo: '', descripcion: '', fecha: hoyStr, kilometraje: '', operador_nombre: '', costo: '', proveedor: '' });
      setShowForm(false);
      setMensajeExito(tipo === 'preventivo' ? 'Preventivo registrado' : 'Correctivo registrado');
      setTimeout(() => setMensajeExito(''), 3000);
      cargarFn();
    } catch (err) {
      addToast('Error al guardar: ' + err.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (e, setForm) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = (setForm, setShowForm) => {
    setForm({ titulo: '', descripcion: '', fecha: hoyStr, kilometraje: '', operador_nombre: '', costo: '', proveedor: '' });
    setShowForm(false);
  };

  // === RENDER SUB-TAB ===
  const renderSubTab = (tabId) => {
    switch (tabId) {
      case 'preventivos': return renderPreventivos();
      case 'correctivos': return renderCorrectivos();
      case 'tanqueos': return renderTanqueos();
      default: return null;
    }
  };

  // === FORMULARIO INLINE ===
  const renderFormulario = (form, setForm, saving, onGuardar, onCancelar) => (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
          <input type="text" name="titulo" value={form.titulo} onChange={(e) => handleFormChange(e, setForm)} placeholder="Ej: Cambio de filtros" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
          <textarea name="descripcion" value={form.descripcion} onChange={(e) => handleFormChange(e, setForm)} rows={2} placeholder="Detalle del mantenimiento realizado" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
          <input type="date" name="fecha" value={form.fecha || hoyStr} onChange={(e) => handleFormChange(e, setForm)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Kilometraje</label>
          <input type="number" name="kilometraje" value={form.kilometraje} onChange={(e) => handleFormChange(e, setForm)} placeholder={vehiculo.kilometraje_actual || '0'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Operador / Técnico</label>
          <input type="text" name="operador_nombre" value={form.operador_nombre} onChange={(e) => handleFormChange(e, setForm)} placeholder="Nombre" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Costo</label>
          <input type="number" name="costo" value={form.costo} onChange={(e) => handleFormChange(e, setForm)} placeholder="$0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor</label>
          <input type="text" name="proveedor" value={form.proveedor} onChange={(e) => handleFormChange(e, setForm)} placeholder="Nombre del proveedor" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onGuardar} disabled={saving || !form.titulo.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </button>
        <button onClick={onCancelar} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition">
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );

  // === TABLA PREVENTIVOS ===
  const renderPreventivos = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Mantenimientos Preventivos
        </h3>
        {isAdmin && (
        <button onClick={() => { setShowFormPrev(!showFormPrev); setErrorPrev(null); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          {showFormPrev ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showFormPrev ? 'Cancelar' : 'Registrar'}
        </button>
      )}
      </div>

      {showFormPrev && renderFormulario(
        formPrev, setFormPrev, savingPrev,
        () => guardarMantenimiento('preventivo', formPrev, setFormPrev, setSavingPrev, setShowFormPrev, cargarPreventivos),
        () => resetForm(setFormPrev, setShowFormPrev)
      )}

      {mensajeExito && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800">{mensajeExito}</span>
        </div>
      )}

      {loadingPrev ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : errorPrev ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">{errorPrev}</p>
          <button onClick={cargarPreventivos} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition">Reintentar</button>
        </div>
      ) : preventivos.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay mantenimientos preventivos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Título</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Operador</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Kilometraje</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Costo</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preventivos.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 ${item.es_cambio_aceite ? 'bg-yellow-50/50' : ''}`}>
                  <td className="py-2 px-3 text-gray-900">{formatearFecha(item.fecha)}</td>
                  <td className="py-2 px-3 font-medium text-gray-900">{item.titulo}</td>
                  <td className="py-2 px-3 text-gray-700">{item.operador_nombre || '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{item.kilometraje ? `${item.kilometraje} km` : '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{item.costo ? formatearMoneda(item.costo) : '—'}</td>
                  <td className="py-2 px-3">
                    {item.es_cambio_aceite ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#FFC107', color: '#1A1A1A' }}>
                        <Fuel className="w-3 h-3" /> Cambio Aceite
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        <Wrench className="w-3 h-3" /> Mantenimiento
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // === TABLA CORRECTIVOS ===
  const renderCorrectivos = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Mantenimientos Correctivos
        </h3>
        {isAdmin && (
        <button onClick={() => { setShowFormCorr(!showFormCorr); setErrorCorr(null); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          {showFormCorr ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showFormCorr ? 'Cancelar' : 'Registrar'}
        </button>
      )}
      </div>

      {showFormCorr && renderFormulario(
        formCorr, setFormCorr, savingCorr,
        () => guardarMantenimiento('correctivo', formCorr, setFormCorr, setSavingCorr, setShowFormCorr, cargarCorrectivos),
        () => resetForm(setFormCorr, setShowFormCorr)
      )}

      {loadingCorr ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : errorCorr ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">{errorCorr}</p>
          <button onClick={cargarCorrectivos} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition">Reintentar</button>
        </div>
      ) : correctivos.length === 0 ? (
        <div className="text-center py-8">
          <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay mantenimientos correctivos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Título</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Descripción</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Operador</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Kilometraje</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Costo</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Proveedor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {correctivos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-900">{formatearFecha(item.fecha)}</td>
                  <td className="py-2 px-3 font-medium text-gray-900">{item.titulo}</td>
                  <td className="py-2 px-3 text-gray-700 max-w-[200px] truncate">{item.descripcion || '—'}</td>
                  <td className="py-2 px-3 text-gray-700">{item.operador_nombre || '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{item.kilometraje ? `${item.kilometraje} km` : '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{item.costo ? formatearMoneda(item.costo) : '—'}</td>
                  <td className="py-2 px-3 text-gray-700">{item.proveedor || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // === TABLA TANQUEOS ===
  const renderTanqueos = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Droplets className="w-5 h-5" />
        Historial de Tanqueos
      </h3>

      {loadingTanq ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : errorTanq ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">{errorTanq}</p>
          <button onClick={cargarTanqueos} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition">Reintentar</button>
        </div>
      ) : tanqueos.length === 0 ? (
        <div className="text-center py-8">
          <Droplets className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay registros de tanqueo</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Operador</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Turno</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Kilometraje</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Galones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tanqueos.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-900">{formatearFecha(item.fecha)}</td>
                  <td className="py-2 px-3 text-gray-700">{item.operador_nombre}</td>
                  <td className="py-2 px-3">
                    {item.turno && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{ backgroundColor: '#FFC107', color: '#1A1A1A' }}>
                        {item.turno}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{item.kilometraje_final || item.kilometraje_inicial} km</td>
                  <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: '#2563EB' }}>{item.tanqueo_galones} gl</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      {renderSubTab(activeTab)}
    </div>
  );
}
