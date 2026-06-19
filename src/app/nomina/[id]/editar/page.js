'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { formatCOP } from '@/lib/utils/nomina';
import { useToast } from '@/context/ToastContext';
import { Loader2, AlertTriangle, ArrowLeft, Save } from 'lucide-react';

export default function EditarNominasPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const { addToast } = useToast();
  const periodoId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(null);
  const [nominas, setNominas] = useState([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState('');
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  useEffect(() => {
    if (periodoId && !roleLoading) cargarDatos();
  }, [periodoId, roleLoading]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: p, error: errP } = await supabase
        .from('periodos_nomina')
        .select('*')
        .eq('id', periodoId)
        .single();

      if (errP) throw errP;
      if (!p) throw new Error('Período no encontrado');
      setPeriodo(p);

      const { data: noms } = await supabase
        .from('nominas')
        .select(`
          *,
          trabajador:trabajador_id(id, nombre, primer_apellido, cedula)
        `)
        .eq('periodo_nomina_id', periodoId)
        .order('trabajador_id');

      setNominas(noms || []);
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al cargar datos de la nómina', { type: 'error' }) } catch(e) {}
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrabajadorChange = (id) => {
    setTrabajadorSeleccionado(id);
    setGuardadoExito(false);

    const nomina = nominas.find(n => n.id === Number(id));
    if (nomina) {
      setForm({
        sueldo_basico: nomina.sueldo_basico || 0,
        auxilio_transporte: nomina.auxilio_transporte || 0,
        horas_extras_diurnas: nomina.horas_extras_diurnas || 0,
        horas_extras_nocturnas: nomina.horas_extras_nocturnas || 0,
        horas_extras_dominicales: nomina.horas_extras_dominicales || 0,
        horas_recargo_nocturno: nomina.horas_recargo_nocturno || 0,
        horas_recargo_dominical: nomina.horas_recargo_dominical || 0,
        comisiones: nomina.comisiones || 0,
        bonificaciones: nomina.bonificaciones || 0,
        otros_devengos: nomina.otros_devengos || 0,
        deduccion_salud: nomina.deduccion_salud || 0,
        deduccion_pension: nomina.deduccion_pension || 0,
        embargos: nomina.embargos || 0,
        libranzas: nomina.libranzas || 0,
        otras_deducciones: nomina.otras_deducciones || 0,
      });
    }
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    setGuardadoExito(false);
  };

  const calcularNeto = () => {
    const dev = Number(form.sueldo_basico || 0) + Number(form.auxilio_transporte || 0) +
      Number(form.horas_extras_diurnas || 0) + Number(form.horas_extras_nocturnas || 0) +
      Number(form.horas_extras_dominicales || 0) + Number(form.horas_recargo_nocturno || 0) +
      Number(form.horas_recargo_dominical || 0) + Number(form.comisiones || 0) +
      Number(form.bonificaciones || 0) + Number(form.otros_devengos || 0);
    const ded = Number(form.deduccion_salud || 0) + Number(form.deduccion_pension || 0) +
      Number(form.embargos || 0) + Number(form.libranzas || 0) + Number(form.otras_deducciones || 0);
    return dev - ded;
  };

  const handleGuardar = async () => {
    if (!trabajadorSeleccionado) return;
    setGuardando(true);
    setError(null);
    setGuardadoExito(false);

    try {
      const updates = {};
      for (const [key, value] of Object.entries(form)) {
        updates[key] = value;
      }

      const { error: err } = await supabase
        .from('nominas')
        .update(updates)
        .eq('id', Number(trabajadorSeleccionado));

      if (err) throw err;

      setGuardadoExito(true);
      cargarDatos();
    } catch (err) {
      console.error('Error guardando:', err);
      try { addToast('Error al guardar la nómina', { type: 'error' }) } catch(e) {}
      setError(err.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Acceso denegado</h2>
          <p className="text-gray-500 mt-1">No tienes permisos para editar n&oacute;minas.</p>
          <Link href={`/nomina/${periodoId}`} className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">&larr; Volver al per&iacute;odo</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando n&oacute;minas...</p>
        </div>
      </div>
    );
  }

  if (error || !periodo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          <p className="text-gray-500 mt-1">{error || 'Período no encontrado'}</p>
          <Link href="/nomina" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">&larr; Volver</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/nomina" className="hover:text-gray-900">N&oacute;mina</Link>
          <span>/</span>
          <Link href={`/nomina/${periodoId}`} className="hover:text-gray-900">{periodo.nombre}</Link>
          <span>/</span>
          <span className="text-gray-900">Editar N&oacute;mina</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar N&oacute;mina</h1>
        <p className="text-gray-600 mt-1">Per&iacute;odo: {periodo.nombre} ({periodo.codigo})</p>
      </div>

      {nominas.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">No hay n&oacute;minas en este per&iacute;odo</h3>
          <p className="mt-1 text-sm text-gray-500">Genera la n&oacute;mina primero desde la vista del per&iacute;odo.</p>
          <Link href={`/nomina/${periodoId}`} className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">&larr; Volver al per&iacute;odo</Link>
        </div>
      )}

      {nominas.length > 0 && (
        <>
          {/* Selector de trabajador */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Trabajador
            </label>
            <select
              value={trabajadorSeleccionado}
              onChange={(e) => handleTrabajadorChange(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccione un trabajador --</option>
              {nominas.map((n) => {
                const t = n.trabajador;
                const nombre = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() : '—';
                return (
                  <option key={n.id} value={n.id}>
                    {nombre} ({t?.cedula || '—'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Formulario de edición */}
          {trabajadorSeleccionado && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Valores de la N&oacute;mina
              </h2>

              {guardadoExito && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  N&oacute;mina actualizada exitosamente.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Devengos */}
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-3">Devengos</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Sueldo B&aacute;sico</label>
                      <input type="number" value={form.sueldo_basico || ''} onChange={(e) => handleFormChange('sueldo_basico', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Auxilio Transporte</label>
                      <input type="number" value={form.auxilio_transporte || ''} onChange={(e) => handleFormChange('auxilio_transporte', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Horas Extras Diurnas</label>
                      <input type="number" value={form.horas_extras_diurnas || ''} onChange={(e) => handleFormChange('horas_extras_diurnas', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Horas Extras Nocturnas</label>
                      <input type="number" value={form.horas_extras_nocturnas || ''} onChange={(e) => handleFormChange('horas_extras_nocturnas', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Horas Extras Dominicales</label>
                      <input type="number" value={form.horas_extras_dominicales || ''} onChange={(e) => handleFormChange('horas_extras_dominicales', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Recargo Nocturno</label>
                      <input type="number" value={form.horas_recargo_nocturno || ''} onChange={(e) => handleFormChange('horas_recargo_nocturno', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Recargo Dominical</label>
                      <input type="number" value={form.horas_recargo_dominical || ''} onChange={(e) => handleFormChange('horas_recargo_dominical', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Comisiones</label>
                      <input type="number" value={form.comisiones || ''} onChange={(e) => handleFormChange('comisiones', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bonificaciones</label>
                      <input type="number" value={form.bonificaciones || ''} onChange={(e) => handleFormChange('bonificaciones', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Otros Devengos</label>
                      <input type="number" value={form.otros_devengos || ''} onChange={(e) => handleFormChange('otros_devengos', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Deducciones */}
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-3">Deducciones</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Salud (4%)</label>
                      <input type="number" value={form.deduccion_salud || ''} onChange={(e) => handleFormChange('deduccion_salud', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pensi&oacute;n (4%)</label>
                      <input type="number" value={form.deduccion_pension || ''} onChange={(e) => handleFormChange('deduccion_pension', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Embargos</label>
                      <input type="number" value={form.embargos || ''} onChange={(e) => handleFormChange('embargos', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Libranzas</label>
                      <input type="number" value={form.libranzas || ''} onChange={(e) => handleFormChange('libranzas', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Otras Deducciones</label>
                      <input type="number" value={form.otras_deducciones || ''} onChange={(e) => handleFormChange('otras_deducciones', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Resumen</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Devengos:</span>
                        <span className="font-medium text-green-700">{formatCOP(
                          Number(form.sueldo_basico || 0) + Number(form.auxilio_transporte || 0) +
                          Number(form.horas_extras_diurnas || 0) + Number(form.horas_extras_nocturnas || 0) +
                          Number(form.horas_extras_dominicales || 0) + Number(form.horas_recargo_nocturno || 0) +
                          Number(form.horas_recargo_dominical || 0) + Number(form.comisiones || 0) +
                          Number(form.bonificaciones || 0) + Number(form.otros_devengos || 0)
                        )}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Deducciones:</span>
                        <span className="font-medium text-red-700">{formatCOP(
                          Number(form.deduccion_salud || 0) + Number(form.deduccion_pension || 0) +
                          Number(form.embargos || 0) + Number(form.libranzas || 0) + Number(form.otras_deducciones || 0)
                        )}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                        <span className="font-semibold text-gray-900">Neto a Pagar:</span>
                        <span className="font-bold text-gray-900">{formatCOP(calcularNeto())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <Link
                  href={`/nomina/${periodoId}`}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm"
                >
                  Cancelar
                </Link>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {guardando ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                  ) : (
                    <><Save className="h-4 w-4" /> Guardar Cambios</>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
