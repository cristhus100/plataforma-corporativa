'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import StatsCard from '@/components/ui/StatsCard';
import { formatCOP } from '@/lib/utils/nomina';
import { generarNomina, cerrarPeriodoNomina, pagarNomina } from '@/actions/nomina';
import {
  DollarSign, Users, FileText, Eye, Plus, Loader2,
  AlertTriangle, Ban, CircleCheck, CircleX,
  ChevronDown, ChevronRight, Download, Printer,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const TIPO_LABELS = {
  semanal: 'Semanal', decadual: 'Decadual', quincenal: 'Quincenal', mensual: 'Mensual',
};
const ESTADO_BADGES = {
  abierto: { badge: 'border-blue-300 bg-blue-50 text-blue-700', dot: 'bg-blue-500', label: 'Abierto' },
  cerrado: { badge: 'border-yellow-300 bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500', label: 'Cerrado' },
  liquidado: { badge: 'border-green-300 bg-green-50 text-green-700', dot: 'bg-green-500', label: 'Liquidado' },
  anulado: { badge: 'border-red-300 bg-red-50 text-red-700', dot: 'bg-red-500', label: 'Anulado' },
};
function EstadoBadge({ estado }) {
  const c = ESTADO_BADGES[estado] || ESTADO_BADGES.anulado;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}
    </span>
  );
}

function calcularNeto(n) {
  const dev = Number(n.sueldo_basico || 0) + Number(n.auxilio_transporte || 0) +
    Number(n.horas_extras_diurnas || 0) + Number(n.horas_extras_nocturnas || 0) +
    Number(n.horas_extras_dominicales || 0) + Number(n.horas_recargo_nocturno || 0) +
    Number(n.horas_recargo_dominical || 0) + Number(n.comisiones || 0) +
    Number(n.bonificaciones || 0) + Number(n.otros_devengos || 0);
  const ded = Number(n.deduccion_salud || 0) + Number(n.deduccion_pension || 0) +
    Number(n.deduccion_fondo_solidaridad || 0) + Number(n.embargos || 0) +
    Number(n.libranzas || 0) + Number(n.otras_deducciones || 0);
  return dev - ded;
}
function calcularTotales(n) {
  const dev = Number(n.sueldo_basico || 0) + Number(n.auxilio_transporte || 0) +
    Number(n.horas_extras_diurnas || 0) + Number(n.horas_extras_nocturnas || 0) +
    Number(n.horas_extras_dominicales || 0) + Number(n.horas_recargo_nocturno || 0) +
    Number(n.horas_recargo_dominical || 0) + Number(n.comisiones || 0) +
    Number(n.bonificaciones || 0) + Number(n.otros_devengos || 0);
  const ded = Number(n.deduccion_salud || 0) + Number(n.deduccion_pension || 0) +
    Number(n.deduccion_fondo_solidaridad || 0) + Number(n.embargos || 0) +
    Number(n.libranzas || 0) + Number(n.otras_deducciones || 0);
  return { devengos: dev, deducciones: ded, neto: dev - ded };
}

export default function DetallePeriodoPage() {
  const { addToast, confirm } = useToast();
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin } = useRole();
  const periodoId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(null);
  const [nominas, setNominas] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [detallesCache, setDetallesCache] = useState({});

  // Actions
  const [generando, setGenerando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [pagosLoading, setPagosLoading] = useState({});

  // Formulario de pago
  const [pagoForm, setPagoForm] = useState({});

  useEffect(() => {
    if (periodoId) cargarDatos();
  }, [periodoId]);

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
          trabajador:trabajador_id(id, nombre, primer_apellido, cedula, cargo_legacy, salario)
        `)
        .eq('periodo_nomina_id', periodoId)
        .order('trabajador_id');

      setNominas(noms || []);
    } catch (err) {
      console.error('Error:', err);
      addToast('Error al cargar datos', { type: 'error' })
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      const r = await generarNomina(periodoId);
      if (r.error) throw new Error(r.error);
      addToast('Nomina generada correctamente', { type: 'success' });
      cargarDatos();
    } catch (err) {
      addToast(err.message, { type: 'error' });
    } finally {
      setGenerando(false);
    }
  };

  const handleCerrar = async () => {
    setCerrando(true);
    try {
      const r = await cerrarPeriodoNomina(periodoId);
      if (r.error) throw new Error(r.error);
      addToast('Periodo cerrado correctamente', { type: 'success' });
      cargarDatos();
    } catch (err) {
      addToast(err.message, { type: 'error' });
    } finally {
      setCerrando(false);
    }
  };

  const handlePagar = async (nominaId) => {
    const data = pagoForm[nominaId] || {};
    if (!data.medio_pago) {
      addToast('Seleccione un medio de pago', { type: 'warning' });
      return;
    }
    setPagosLoading(prev => ({ ...prev, [nominaId]: true }));
    try {
      const r = await pagarNomina(nominaId, data);
      if (r.error) throw new Error(r.error);
      setPagoForm(prev => ({ ...prev, [nominaId]: {} }));
      cargarDatos();
    } catch (err) {
      addToast(err.message, { type: 'error' });
    } finally {
      setPagosLoading(prev => ({ ...prev, [nominaId]: false }));
    }
  };

  const toggleExpandir = async (nominaId) => {
    if (expandido === nominaId) {
      setExpandido(null);
      return;
    }
    setExpandido(nominaId);

    if (!detallesCache[nominaId]) {
      const { data } = await supabase
        .from('detalle_nomina')
        .select('*')
        .eq('nomina_id', nominaId)
        .order('tipo_registro');
      setDetallesCache(prev => ({ ...prev, [nominaId]: data || [] }));
    }
  };

  const handlePagoChange = (nominaId, field, value) => {
    setPagoForm(prev => ({
      ...prev,
      [nominaId]: { ...(prev[nominaId] || {}), [field]: value },
    }));
  };

  // --- LOADING ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando período...</p>
        </div>
      </div>
    );
  }

  // --- ERROR / NOT FOUND ---
  if (error || !periodo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Período no encontrado</h2>
          <p className="text-gray-500 mt-1">{error}</p>
          <Link href="/nomina" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">&larr; Volver a Nómina</Link>
        </div>
      </div>
    );
  }

  // Stats
  const totalStats = nominas.reduce((acc, n) => {
    const t = calcularTotales(n);
    return {
      trabajadores: acc.trabajadores + 1,
      devengos: acc.devengos + t.devengos,
      deducciones: acc.deducciones + t.deducciones,
      neto: acc.neto + t.neto,
    };
  }, { trabajadores: 0, devengos: 0, deducciones: 0, neto: 0 });

  const pendientes = nominas.filter(n => !n.pagado);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="mb-2">
              <Link href="/nomina" className="text-gray-500 hover:text-gray-900 text-sm">&larr; Volver</Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{periodo.nombre}</h1>
              <EstadoBadge estado={periodo.estado} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{periodo.codigo}</span>
              <span>{TIPO_LABELS[periodo.tipo] || periodo.tipo}</span>
              <span>{new Date(periodo.fecha_inicio).toLocaleDateString('es-CO')} &mdash; {new Date(periodo.fecha_fin).toLocaleDateString('es-CO')}</span>
              {periodo.fecha_pago && <span>Pago: {new Date(periodo.fecha_pago).toLocaleDateString('es-CO')}</span>}
            </div>
            {periodo.observaciones && (
              <p className="mt-2 text-sm text-gray-500">{periodo.observaciones}</p>
            )}
          </div>

          <div className="flex gap-2">
            {isAdmin && periodo.estado === 'abierto' && (
              <button
                onClick={handleGenerar}
                disabled={generando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                Generar N&oacute;mina
              </button>
            )}
            {isAdmin && periodo.estado === 'liquidado' && pendientes.length > 0 && (
              <button
                onClick={handleCerrar}
                disabled={cerrando}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {cerrando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Cerrar Per&iacute;odo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* StatsCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Trabajadores" value={totalStats.trabajadores} icon={Users} color="blue" />
        <StatsCard title="Total Devengos" value={formatCOP(totalStats.devengos)} icon={DollarSign} color="green" />
        <StatsCard title="Total Deducciones" value={formatCOP(totalStats.deducciones)} icon={FileText} color="orange" />
        <StatsCard title="Total Neto" value={formatCOP(totalStats.neto)} icon={DollarSign} color="purple" />
      </div>

      {/* Tabla de nóminas */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            N&oacute;minas
            <span className="ml-2 text-sm font-normal text-gray-500">({nominas.length} registros)</span>
          </h2>
        </div>

        {nominas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">No hay n&oacute;minas generadas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {periodo.estado === 'abierto'
                ? 'Genera la n&oacute;mina para liquidar todos los trabajadores activos.'
                : 'Este per&iacute;odo no tiene n&oacute;minas registradas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Trabajador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">C&eacute;dula</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cargo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Salario Base</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Sueldo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Aux Transp</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Deducc.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Neto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Pagado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acci&oacute;n</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {nominas.map((n) => {
                  const t = n.trabajador;
                  const nombre = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() : '—';
                  const tot = calcularTotales(n);
                  const estaExpandido = expandido === n.id;
                  const detalles = detallesCache[n.id] || [];
                  const pf = pagoForm[n.id] || {};

                  return (
                    <tr key={n.id}>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleExpandir(n.id)}
                          className="text-gray-400 hover:text-gray-700 transition"
                          title="Ver detalle"
                        >
                          {estaExpandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{nombre}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{t?.cedula || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{t?.cargo_legacy || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(n.salario_base)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(n.sueldo_basico)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(n.auxilio_transporte)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">{formatCOP(tot.deducciones)}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatCOP(tot.neto)}</td>
                      <td className="px-4 py-3 text-center">
                        {n.pagado ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <CircleCheck className="h-3 w-3" /> S&iacute;
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
                            <CircleX className="h-3 w-3" /> No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/nomina/recibo/${n.id}`}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                            title="Recibo"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                          {isAdmin && (
                            <Link
                              href={`/nomina/${periodoId}/editar`}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition"
                              title="Editar"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expandable detail rows */}
      {expandido && detallesCache[expandido] && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Detalle de la N&oacute;mina</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Devengos */}
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">Devengos</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {detalles.filter(d => d.tipo_registro === 'devengo').map(d => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{d.concepto}</td>
                        <td className="py-1.5 text-right font-medium">{formatCOP(d.valor)}</td>
                      </tr>
                    ))}
                    {detalles.filter(d => d.tipo_registro === 'devengo').length === 0 && (
                      <tr><td colSpan={2} className="py-2 text-gray-400">Sin devengos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Deducciones */}
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2">Deducciones</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {detalles.filter(d => d.tipo_registro === 'deduccion').map(d => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{d.concepto}</td>
                        <td className="py-1.5 text-right font-medium">{formatCOP(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Aportes empleador */}
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">Aportes Empleador</h4>
                <table className="w-full text-sm">
                  <tbody>
                    {detalles.filter(d => d.tipo_registro === 'aporte_empleador').map(d => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-1.5 text-gray-700">{d.concepto}</td>
                        <td className="py-1.5 text-right font-medium">{formatCOP(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sección de pagos pendientes */}
      {isAdmin && pendientes.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pagos Pendientes
              <span className="ml-2 text-sm font-normal text-gray-500">({pendientes.length} pendientes)</span>
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {pendientes.map((n) => {
              const t = n.trabajador;
              const nombre = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() : '—';
              const tot = calcularTotales(n);
              const pf = pagoForm[n.id] || {};
              const pagando = pagosLoading[n.id];

              return (
                <div key={n.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{nombre}</p>
                    <p className="text-sm text-gray-600">Neto: {formatCOP(tot.neto)}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={pf.medio_pago || ''}
                      onChange={(e) => handlePagoChange(n.id, 'medio_pago', e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Medio de pago</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="consignacion">Consignaci&oacute;n</option>
                    </select>
                    <input
                      type="text"
                      placeholder="No. comprobante"
                      value={pf.numero_comprobante || ''}
                      onChange={(e) => handlePagoChange(n.id, 'numero_comprobante', e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handlePagar(n.id)}
                      disabled={pagando || !pf.medio_pago}
                      className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {pagando ? <Loader2 className="h-3 w-3 animate-spin" /> : <CircleCheck className="h-3 w-3" />}
                      Pagar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
