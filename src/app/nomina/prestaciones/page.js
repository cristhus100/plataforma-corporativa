'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { liquidarPrestaciones } from '@/actions/nomina';
import StatsCard from '@/components/ui/StatsCard';
import { formatCOP } from '@/lib/utils/nomina';
import {
  DollarSign, Users, FileText, Plus, X,
  Loader2, AlertTriangle, CircleCheck, CircleX,
} from 'lucide-react';

const TIPO_LIQUIDACION_LABELS = {
  prima: 'Prima',
  cesantias: 'Cesantias',
  intereses_cesantias: 'Intereses Cesantias',
  vacaciones: 'Vacaciones',
  retiro_total: 'Retiro Total',
  liquidacion_anual: 'Liquidacion Anual',
};

const TIPO_LIQUIDACION_OPTIONS = [
  { value: 'prima', label: 'Prima de Servicios' },
  { value: 'cesantias', label: 'Cesantias' },
  { value: 'intereses_cesantias', label: 'Intereses de Cesantias' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'retiro_total', label: 'Retiro Total' },
  { value: 'liquidacion_anual', label: 'Liquidacion Anual' },
];

function PagadoBadge({ pagado }) {
  return pagado ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
      <CircleCheck className="h-3 w-3" /> Pagado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5">
      <CircleX className="h-3 w-3" /> Pendiente
    </span>
  );
}

export default function PrestacionesPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState(null);

  const [form, setForm] = useState({
    trabajador_id: '', tipo_liquidacion: 'prima', periodo_inicio: '',
    periodo_fin: '', salario_base: '', auxilio_transporte_base: '',
    dias_trabajados: '', valor_calculado: '', valor_pagado: '',
    fecha_pago: '', observaciones: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [liqRes, trabRes] = await Promise.all([
        supabase.from('liquidacion_prestaciones').select('*, trabajador:trabajador_id(id, nombre, primer_apellido, cedula)').order('created_at', { ascending: false }),
        supabase.from('trabajadores').select('id, nombre, primer_apellido, cedula, salario').eq('activo', true).order('primer_apellido'),
      ]);
      setLiquidaciones(liqRes.data || []);
      setTrabajadores(trabRes.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'periodo_inicio' || name === 'periodo_fin') {
        if (updated.periodo_inicio && updated.periodo_fin) {
          const inicio = new Date(updated.periodo_inicio);
          const fin = new Date(updated.periodo_fin);
          const diffMs = fin - inicio;
          if (diffMs >= 0) updated.dias_trabajados = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        }
      }
      if (['trabajador_id', 'periodo_inicio', 'periodo_fin', 'salario_base', 'tipo_liquidacion'].includes(name)) {
        const salario = Number(updated.salario_base) || 0;
        const dias = Number(updated.dias_trabajados) || 0;
        if (salario > 0 && dias > 0) {
          const tipo = updated.tipo_liquidacion;
          let calc = 0;
          if (tipo === 'prima' || tipo === 'cesantias') calc = (salario * dias) / 360;
          else if (tipo === 'vacaciones') calc = (salario * dias) / 720;
          else if (tipo === 'intereses_cesantias') { const ces = (salario * dias) / 360; calc = ces * 0.12 * (dias / 360); }
          else { calc = ((salario * dias) / 360) + ((salario * dias) / 360) + (((salario * dias) / 360) * 0.12 * (dias / 360)) + ((salario * dias) / 720); }
          updated.valor_calculado = Math.round(calc);
        }
      }
      return updated;
    });
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    setCreando(true);
    setErrorCrear(null);
    try {
      const result = await liquidarPrestaciones(form);
      if (result.error) throw new Error(result.error);
      setMostrarForm(false);
      setForm({ trabajador_id: '', tipo_liquidacion: 'prima', periodo_inicio: '', periodo_fin: '', salario_base: '', auxilio_transporte_base: '', dias_trabajados: '', valor_calculado: '', valor_pagado: '', fecha_pago: '', observaciones: '' });
      cargarDatos();
    } catch (err) {
      setErrorCrear(err.message || 'Error al liquidar prestaciones');
    } finally {
      setCreando(false);
    }
  };

  const filtradas = filtroTipo ? liquidaciones.filter(l => l.tipo_liquidacion === filtroTipo) : liquidaciones;
  const stats = filtradas.reduce((acc, l) => ({ total_calculado: acc.total_calculado + Number(l.valor_calculado || 0), total_pagado: acc.total_pagado + Number(l.valor_pagado || 0) }), { total_calculado: 0, total_pagado: 0 });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center"><Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" /><p className="text-gray-600">Cargando prestaciones sociales...</p></div>
    </div>
  );

  if (error) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Prestaciones Sociales</h1>
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3"><AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" /><div><h3 className="font-semibold text-red-800">Error al cargar datos</h3><p className="text-red-700 text-sm mt-1">{error}</p></div></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prestaciones Sociales</h1>
          <p className="text-sm text-gray-600">Liquidacion de prima, cesantias, intereses, vacaciones y retiros</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/nomina" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">&larr; Volver</Link>
          {isAdmin && (
            <button onClick={() => { setMostrarForm(!mostrarForm); setErrorCrear(null); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
              {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {mostrarForm ? 'Cancelar' : 'Nueva Liquidacion'}
            </button>
          )}
        </div>
      </div>

      {mostrarForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva Liquidacion de Prestaciones</h2>
          {errorCrear && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800"><div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" /><span>{errorCrear}</span></div></div>}
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trabajador <span className="text-red-500">*</span></label>
                <select name="trabajador_id" value={form.trabajador_id} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Seleccionar...</option>
                  {trabajadores.map((t) => (<option key={t.id} value={t.id}>{t.nombre} {t.primer_apellido} ({t.cedula})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Liquidacion <span className="text-red-500">*</span></label>
                <select name="tipo_liquidacion" value={form.tipo_liquidacion} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {TIPO_LIQUIDACION_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Periodo Inicio <span className="text-red-500">*</span></label><input type="date" name="periodo_inicio" value={form.periodo_inicio} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Periodo Fin <span className="text-red-500">*</span></label><input type="date" name="periodo_fin" value={form.periodo_fin} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Salario Base</label><input type="number" name="salario_base" value={form.salario_base} onChange={handleFormChange} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Auxilio Transporte</label><input type="number" name="auxilio_transporte_base" value={form.auxilio_transporte_base} onChange={handleFormChange} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dias Trabajados</label><input type="number" name="dias_trabajados" value={form.dias_trabajados || ''} readOnly className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor Calculado</label><input type="number" name="valor_calculado" value={form.valor_calculado || ''} readOnly className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Valor Pagado</label><input type="number" name="valor_pagado" value={form.valor_pagado} onChange={handleFormChange} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label><input type="date" name="fecha_pago" value={form.fecha_pago} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label><textarea name="observaciones" value={form.observaciones} onChange={handleFormChange} rows={2} placeholder="Observaciones..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" /></div>
            <div className="flex justify-end gap-2">
              <button type="submit" disabled={creando} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {creando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{creando ? 'Guardando...' : 'Guardar Liquidacion'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard title="Total Calculado" value={formatCOP(stats.total_calculado)} icon={DollarSign} color="blue" />
        <StatsCard title="Total Pagado" value={formatCOP(stats.total_pagado)} icon={DollarSign} color="green" />
        <StatsCard title="Saldo Pendiente" value={formatCOP(stats.total_calculado - stats.total_pagado)} icon={FileText} color="orange" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Filtrar por tipo:</label>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">Todas</option>
            {TIPO_LIQUIDACION_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-3">
          <h2 className="font-semibold text-gray-900">Liquidaciones<span className="ml-2 text-sm font-normal text-gray-500">({filtradas.length} registros)</span></h2>
        </div>
        {filtradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">{liquidaciones.length === 0 ? 'No hay liquidaciones registradas' : 'No se encontraron resultados'}</h3>
            <p className="mt-1 text-sm text-gray-500">{liquidaciones.length === 0 ? 'Realiza la primera liquidacion desde el boton superior.' : 'Intenta cambiar el filtro.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Trabajador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Periodo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Salario Base</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Valor Calc.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Valor Pag.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtradas.map((l) => {
                  const t = l.trabajador;
                  const nombre = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() : '—';
                  const calc = Number(l.valor_calculado || 0);
                  const pag = Number(l.valor_pagado || 0);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{TIPO_LIQUIDACION_LABELS[l.tipo_liquidacion] || l.tipo_liquidacion}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(l.periodo_inicio).toLocaleDateString('es-CO')} &mdash; {new Date(l.periodo_fin).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(l.salario_base)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCOP(calc)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(pag)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCOP(calc - pag)}</td>
                      <td className="px-4 py-3 text-center"><PagadoBadge pagado={l.pagado} /></td>
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
