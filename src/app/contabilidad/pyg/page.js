'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { formatValorContable } from '@/lib/utils/contabilidad';
import { exportarExcel } from '@/lib/utils/exportar';
import {
  AlertTriangle,
  Loader2,
  LineChart,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function PyGPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fechaDesde, setFechaDesde] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({ ingresos: [], gastos: [] });
  const [totales, setTotales] = useState({ ingresos: 0, gastos: 0 });
  const [consultado, setConsultado] = useState(false);

  async function handleConsultar() {
    try {
      setLoading(true);
      setError(null);
      setConsultado(false);

      // Get income and expense accounts
      const { data: cuentas, error: errCuentas } = await supabase
        .from('plan_cuentas')
        .select('*')
        .in('tipo', ['ingreso', 'gasto'])
        .eq('activa', true)
        .order('codigo');

      if (errCuentas) throw errCuentas;
      if (!cuentas || cuentas.length === 0) {
        setData({ ingresos: [], gastos: [] });
        setTotales({ ingresos: 0, gastos: 0 });
        setConsultado(true);
        return;
      }

      const cuentaIds = cuentas.map(c => c.id);

      // Get asientos within the period
      let query = supabase
        .from('asientos_contables')
        .select(`
          *,
          comprobante:comprobante_id ( estado, fecha )
        `)
        .in('cuenta_id', cuentaIds)
        .eq('comprobante.estado', 'activo');

      if (fechaDesde) {
        query = query.gte('comprobante.fecha', fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte('comprobante.fecha', fechaHasta + 'T23:59:59');
      }

      const { data: allAsientos, error: errAsientos } = await query;
      if (errAsientos) throw errAsientos;

      const asientosByCuenta = {};
      (allAsientos || []).forEach(a => {
        if (!asientosByCuenta[a.cuenta_id]) asientosByCuenta[a.cuenta_id] = [];
        asientosByCuenta[a.cuenta_id].push(a);
      });

      // Income accounts (naturaleza = credito, so haber - debe)
      const ingresos = [];
      const gastos = [];

      cuentas.forEach(cuenta => {
        const asientos = asientosByCuenta[cuenta.id] || [];
        const debe = asientos
          .filter(a => a.naturaleza === 'debito')
          .reduce((sum, a) => sum + Number(a.valor), 0);
        const haber = asientos
          .filter(a => a.naturaleza === 'credito')
          .reduce((sum, a) => sum + Number(a.valor), 0);

        let saldo;
        if (cuenta.naturaleza === 'credito') {
          saldo = haber - debe;
        } else {
          saldo = debe - haber;
        }

        if (cuenta.tipo === 'ingreso') {
          ingresos.push({ ...cuenta, saldo: Math.max(0, saldo) });
        } else {
          gastos.push({ ...cuenta, saldo: Math.max(0, saldo) });
        }
      });

      const totalIngresos = ingresos.reduce((sum, r) => sum + r.saldo, 0);
      const totalGastos = gastos.reduce((sum, r) => sum + r.saldo, 0);

      setData({ ingresos, gastos });
      setTotales({ ingresos: totalIngresos, gastos: totalGastos });
      setConsultado(true);
    } catch (err) {
      console.error('Error loading PyG:', err);
      try { addToast('Error al cargar datos', { type: 'error' }) } catch(e) {}
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const resultado = totales.ingresos - totales.gastos;

  async function exportarExcelFn() {
    const columns = [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Cuenta' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'saldo', label: 'Saldo', formatter: (v) => `$${Number(v || 0).toLocaleString('es-CO')}` },
    ];
    const combined = [
      ...data.ingresos.filter(i => i.saldo > 0).map(i => ({ ...i, tipo: 'Ingreso' })),
      ...data.gastos.filter(g => g.saldo > 0).map(g => ({ ...g, tipo: 'Gasto' })),
    ];
    const excelData = combined.map((item) =>
      columns.reduce((acc, col) => ({ ...acc, [col.label]: col.formatter ? col.formatter(item[col.key], item) : (item[col.key] ?? '') }), {})
    );
    await exportarExcel(excelData, columns, 'pyg', 'Estado de Resultados - Serviequipos');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estado de Resultados (PyG)</h1>
        <p className="text-sm text-gray-600">Ingresos y gastos del período</p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Período Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Período Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleConsultar}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LineChart className="h-4 w-4" />
            )}
            Generar PyG
          </button>
          <button
            onClick={exportarExcelFn}
            disabled={!consultado || (data.ingresos.length === 0 && data.gastos.length === 0)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a Excel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Results */}
      {consultado && (
        <div className="space-y-6">
          {/* INGRESOS */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-green-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                INGRESOS
              </h2>
            </div>
            {data.ingresos.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No hay ingresos registrados en el período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cuenta</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.ingresos.filter(i => i.saldo > 0).map((i) => (
                      <tr key={i.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 text-sm font-mono text-gray-600">{i.codigo}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{i.nombre}</td>
                        <td className="px-6 py-3 text-right text-sm font-mono text-green-700">
                          {formatValorContable(i.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-green-50">
                    <tr>
                      <td colSpan="2" className="px-6 py-3 text-right text-sm font-bold text-green-800">
                        TOTAL INGRESOS
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-mono font-bold text-green-800">
                        {formatValorContable(totales.ingresos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* GASTOS */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 bg-red-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-red-800 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                GASTOS
              </h2>
            </div>
            {data.gastos.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">No hay gastos registrados en el período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cuenta</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {data.gastos.filter(g => g.saldo > 0).map((g) => (
                      <tr key={g.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 text-sm font-mono text-gray-600">{g.codigo}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{g.nombre}</td>
                        <td className="px-6 py-3 text-right text-sm font-mono text-red-700">
                          {formatValorContable(g.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50">
                    <tr>
                      <td colSpan="2" className="px-6 py-3 text-right text-sm font-bold text-red-800">
                        TOTAL GASTOS
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-mono font-bold text-red-800">
                        {formatValorContable(totales.gastos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* RESULTADO */}
          <div className={`rounded-lg border shadow-sm p-6 ${
            resultado >= 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {resultado >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <h3 className={`text-xl font-bold ${resultado >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                    RESULTADO DEL PERÍODO
                  </h3>
                  <p className={`text-sm ${resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {resultado >= 0 ? 'Utilidad' : 'Pérdida'}
                  </p>
                </div>
              </div>
              <p className={`text-3xl font-bold font-mono ${resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatValorContable(resultado)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!consultado && !loading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-16 text-center">
          <LineChart className="mx-auto h-16 w-16 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Seleccione un período y haga clic en "Generar PyG" para ver el estado de resultados.
          </p>
        </div>
      )}
    </div>
  );
}
