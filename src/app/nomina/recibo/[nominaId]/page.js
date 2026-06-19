'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCOP, getTipoContratoLabel } from '@/lib/utils/nomina';
import { Printer, Loader2, AlertTriangle, ArrowLeft, CircleCheck } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function ReciboPage() {
  const { addToast } = useToast();
  const params = useParams();
  const supabase = createClient();
  const nominaId = params.nominaId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nomina, setNomina] = useState(null);
  const [detalles, setDetalles] = useState([]);

  useEffect(() => {
    if (nominaId) cargarDatos();
  }, [nominaId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: n, error: errN } = await supabase
        .from('nominas')
        .select(`
          *,
          trabajador:trabajador_id(*),
          periodo:periodo_nomina_id(*)
        `)
        .eq('id', nominaId)
        .single();

      if (errN) throw errN;
      if (!n) throw new Error('N&oacute;mina no encontrada');
      setNomina(n);

      const { data: dets } = await supabase
        .from('detalle_nomina')
        .select('*')
        .eq('nomina_id', nominaId)
        .order('tipo_registro');

      setDetalles(dets || []);
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al cargar los datos de la nómina', { type: 'error' }) } catch(e) {}
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = () => {
    const devengos = detalles.filter(d => d.tipo_registro === 'devengo');
    const deducciones = detalles.filter(d => d.tipo_registro === 'deduccion');
    const aportes = detalles.filter(d => d.tipo_registro === 'aporte_empleador');

    const totalDev = devengos.reduce((s, d) => s + Number(d.valor || 0), 0);
    const totalDed = deducciones.reduce((s, d) => s + Number(d.valor || 0), 0);
    const totalApo = aportes.reduce((s, d) => s + Number(d.valor || 0), 0);

    return { devengos, deducciones, aportes, totalDev, totalDed, totalApo, neto: totalDev - totalDed };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando recibo de n&oacute;mina...</p>
        </div>
      </div>
    );
  }

  if (error || !nomina) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Recibo no encontrado</h2>
          <p className="text-gray-500 mt-1">{error}</p>
          <Link href="/nomina" className="mt-4 inline-block text-blue-600 hover:text-blue-700 font-medium">&larr; Volver a N&oacute;mina</Link>
        </div>
      </div>
    );
  }

  const t = nomina.trabajador;
  const p = nomina.periodo;
  const tot = calcularTotales();
  const nombreCompleto = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() : '—';

  // Totales forzados desde columnas directas (en caso que detalle esté vacío)
  const devengosForzados = () => {
    if (tot.devengos.length > 0) return null;
    const dev = Number(nomina.sueldo_basico || 0) + Number(nomina.auxilio_transporte || 0) +
      Number(nomina.horas_extras_diurnas || 0) + Number(nomina.horas_extras_nocturnas || 0) +
      Number(nomina.horas_extras_dominicales || 0) + Number(nomina.horas_recargo_nocturno || 0) +
      Number(nomina.horas_recargo_dominical || 0) + Number(nomina.comisiones || 0) +
      Number(nomina.bonificaciones || 0) + Number(nomina.otros_devengos || 0);
    const ded = Number(nomina.deduccion_salud || 0) + Number(nomina.deduccion_pension || 0) +
      Number(nomina.deduccion_fondo_solidaridad || 0) + Number(nomina.embargos || 0) +
      Number(nomina.libranzas || 0) + Number(nomina.otras_deducciones || 0);
    return { dev, ded, neto: dev - ded };
  };
  const totalsForzados = devengosForzados();

  return (
    <>
      {/* Barra de acciones (no printable) */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/nomina/${p?.id || '#'}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al per&iacute;odo
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </button>
      </div>

      {/* RECIBO DE NÓMINA */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden print:shadow-none print:border-0 print:rounded-none">
        {/* Header */}
        <div className="border-b-2 border-gray-900 p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
            SERVIEQUIPOS MANTENIMIENTO LTDA
          </h1>
          <p className="text-sm text-gray-600">NIT 832.005.736-3</p>
          <h2 className="mt-3 text-lg font-semibold text-gray-800 uppercase">
            LIQUIDACI&Oacute;N DE N&Oacute;MINA
          </h2>
          <p className="text-xs text-gray-500 mt-1">No. {nomina.codigo_nomina}</p>
        </div>

        {/* Información del empleado */}
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Informaci&oacute;n del Empleado</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nombre:</span>
              <span className="font-medium text-gray-900 text-right">{nombreCompleto}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">C&eacute;dula:</span>
              <span className="font-medium text-gray-900 text-right">{t?.cedula || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cargo:</span>
              <span className="font-medium text-gray-900 text-right">{t?.cargo_legacy || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tipo Contrato:</span>
              <span className="font-medium text-gray-900 text-right">{getTipoContratoLabel(t?.tipo_contrato)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Salario Base:</span>
              <span className="font-medium text-gray-900 text-right">{formatCOP(nomina.salario_base)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">D&iacute;as Laborados:</span>
              <span className="font-medium text-gray-900 text-right">{nomina.dias_laborados}</span>
            </div>
          </div>
        </div>

        {/* Información del período */}
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Per&iacute;odo de Liquidaci&oacute;n</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Per&iacute;odo:</span>
              <span className="font-medium text-gray-900 text-right">{p?.nombre || p?.codigo || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha Inicio:</span>
              <span className="font-medium text-gray-900 text-right">
                {p?.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString('es-CO') : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha Fin:</span>
              <span className="font-medium text-gray-900 text-right">
                {p?.fecha_fin ? new Date(p.fecha_fin).toLocaleDateString('es-CO') : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fecha Pago:</span>
              <span className="font-medium text-gray-900 text-right">
                {nomina.fecha_pago ? new Date(nomina.fecha_pago).toLocaleDateString('es-CO') : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">D&iacute;as Laborados:</span>
              <span className="font-medium text-gray-900 text-right">{nomina.dias_laborados}</span>
            </div>
          </div>
        </div>

        {/* Devengos */}
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-green-700 uppercase mb-3">DEVENGOS</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-600">Concepto</th>
                <th className="py-2 text-right font-medium text-gray-600">Base</th>
                <th className="py-2 text-right font-medium text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {/* From detalle_nomina */}
              {tot.devengos.map(d => (
                <tr key={d.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{d.concepto}</td>
                  <td className="py-2 text-right text-gray-600">{d.base_calculo ? formatCOP(d.base_calculo) : '—'}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCOP(d.valor)}</td>
                </tr>
              ))}
              {/* Fallback: from nomina columns if no detalle */}
              {tot.devengos.length === 0 && (
                <>
                  {Number(nomina.sueldo_basico) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Sueldo b&aacute;sico ({nomina.dias_laborados} d&iacute;as)</td>
                      <td className="py-2 text-right text-gray-600">{formatCOP(nomina.salario_base)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.sueldo_basico)}</td>
                    </tr>
                  )}
                  {Number(nomina.auxilio_transporte) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Auxilio de transporte</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.auxilio_transporte)}</td>
                    </tr>
                  )}
                  {Number(nomina.horas_extras_diurnas) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Horas extras diurnas</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.horas_extras_diurnas)}</td>
                    </tr>
                  )}
                  {Number(nomina.horas_extras_nocturnas) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Horas extras nocturnas</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.horas_extras_nocturnas)}</td>
                    </tr>
                  )}
                  {Number(nomina.horas_extras_dominicales) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Horas extras dominicales</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.horas_extras_dominicales)}</td>
                    </tr>
                  )}
                  {Number(nomina.horas_recargo_nocturno) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Recargo nocturno</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.horas_recargo_nocturno)}</td>
                    </tr>
                  )}
                  {Number(nomina.horas_recargo_dominical) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Recargo dominical</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.horas_recargo_dominical)}</td>
                    </tr>
                  )}
                  {Number(nomina.comisiones) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Comisiones</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.comisiones)}</td>
                    </tr>
                  )}
                  {Number(nomina.bonificaciones) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Bonificaciones</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.bonificaciones)}</td>
                    </tr>
                  )}
                  {Number(nomina.otros_devengos) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Otros devengos</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.otros_devengos)}</td>
                    </tr>
                  )}
                  {Number(nomina.sueldo_basico) === 0 && Number(nomina.auxilio_transporte) === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">Sin devengos registrados</td></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Deducciones */}
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-red-700 uppercase mb-3">DEDUCCIONES</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-600">Concepto</th>
                <th className="py-2 text-right font-medium text-gray-600">Base</th>
                <th className="py-2 text-right font-medium text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {tot.deducciones.map(d => (
                <tr key={d.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{d.concepto}</td>
                  <td className="py-2 text-right text-gray-600">{d.base_calculo ? formatCOP(d.base_calculo) : '—'}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCOP(d.valor)}</td>
                </tr>
              ))}
              {/* Fallback from nomina columns */}
              {tot.deducciones.length === 0 && (
                <>
                  {Number(nomina.deduccion_salud) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Aporte a salud (4%)</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.deduccion_salud)}</td>
                    </tr>
                  )}
                  {Number(nomina.deduccion_pension) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Aporte a pensi&oacute;n (4%)</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.deduccion_pension)}</td>
                    </tr>
                  )}
                  {Number(nomina.deduccion_fondo_solidaridad) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Fondo solidaridad pensional</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.deduccion_fondo_solidaridad)}</td>
                    </tr>
                  )}
                  {Number(nomina.embargos) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Embargos judiciales</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.embargos)}</td>
                    </tr>
                  )}
                  {Number(nomina.libranzas) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Libranzas</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.libranzas)}</td>
                    </tr>
                  )}
                  {Number(nomina.otras_deducciones) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Otras deducciones</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.otras_deducciones)}</td>
                    </tr>
                  )}
                  {Number(nomina.deduccion_salud) === 0 && Number(nomina.deduccion_pension) === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">Sin deducciones registradas</td></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="border-b-2 border-gray-900 p-6">
          <div className="max-w-sm ml-auto">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Total Devengos:</span>
              <span className="font-semibold text-green-700">{formatCOP(tot.totalDev > 0 ? tot.totalDev : (totalsForzados?.dev || 0))}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-gray-600">Total Deducciones:</span>
              <span className="font-semibold text-red-700">{formatCOP(tot.totalDed > 0 ? tot.totalDed : (totalsForzados?.ded || 0))}</span>
            </div>
            <div className="flex justify-between py-2 mt-1 border-t border-gray-300 text-base">
              <span className="font-bold text-gray-900">NETO A PAGAR:</span>
              <span className="font-bold text-gray-900 text-lg">
                {formatCOP(tot.neto > 0 ? tot.neto : (totalsForzados?.neto || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Aportes empleador */}
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-blue-700 uppercase mb-3">APORTES DEL EMPLEADOR</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left font-medium text-gray-600">Concepto</th>
                <th className="py-2 text-right font-medium text-gray-600">%</th>
                <th className="py-2 text-right font-medium text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {tot.aportes.map(a => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-800">{a.concepto}</td>
                  <td className="py-2 text-right text-gray-600">{a.porcentaje ? `${a.porcentaje}%` : '—'}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCOP(a.valor)}</td>
                </tr>
              ))}
              {/* Fallback from nomina columns */}
              {tot.aportes.length === 0 && (
                <>
                  {Number(nomina.aporte_salud_empleador) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Salud empleador (8.5%)</td>
                      <td className="py-2 text-right text-gray-600">8.5%</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.aporte_salud_empleador)}</td>
                    </tr>
                  )}
                  {Number(nomina.aporte_pension_empleador) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Pensi&oacute;n empleador (12%)</td>
                      <td className="py-2 text-right text-gray-600">12%</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.aporte_pension_empleador)}</td>
                    </tr>
                  )}
                  {Number(nomina.aporte_arl_empleador) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">ARL</td>
                      <td className="py-2 text-right text-gray-600">—</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.aporte_arl_empleador)}</td>
                    </tr>
                  )}
                  {Number(nomina.aporte_caja_compensacion) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">Caja de Compensaci&oacute;n (4%)</td>
                      <td className="py-2 text-right text-gray-600">4%</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.aporte_caja_compensacion)}</td>
                    </tr>
                  )}
                  {Number(nomina.aporte_sena) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">SENA (2%)</td>
                      <td className="py-2 text-right text-gray-600">2%</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.aporte_sena)}</td>
                    </tr>
                  )}
                  {Number(nomina.aporte_icbf) > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="py-2 text-gray-800">ICBF (3%)</td>
                      <td className="py-2 text-right text-gray-600">3%</td>
                      <td className="py-2 text-right font-medium text-gray-900">{formatCOP(nomina.aporte_icbf)}</td>
                    </tr>
                  )}
                  {Number(nomina.aporte_salud_empleador) === 0 && (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-400">Sin aportes registrados</td></tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Estado de pago */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              {nomina.pagado ? (
                <div className="flex items-center gap-2">
                  <CircleCheck className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">
                    PAGADO
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    {nomina.fecha_pago && new Date(nomina.fecha_pago).toLocaleDateString('es-CO')}
                    {nomina.medio_pago && ` — ${nomina.medio_pago}`}
                    {nomina.numero_comprobante && ` — Comp: ${nomina.numero_comprobante}`}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-yellow-700">PENDIENTE DE PAGO</span>
              )}
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Generado: {new Date(nomina.created_at).toLocaleString('es-CO')}</p>
              <p className="mt-0.5">C&oacute;digo: {nomina.codigo_nomina}</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
          @page { margin: 15mm; size: A4 portrait; }
        }
      `}</style>
    </>
  );
}
