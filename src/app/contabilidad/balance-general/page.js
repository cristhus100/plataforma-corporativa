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
  PieChart,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function BalanceGeneralPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({ activo: [], pasivo: [], patrimonio: [] });
  const [totales, setTotales] = useState({ activo: 0, pasivo: 0, patrimonio: 0 });
  const [consultado, setConsultado] = useState(false);

  async function handleConsultar() {
    try {
      setLoading(true);
      setError(null);
      setConsultado(false);

      // Get balance sheet accounts (activo, pasivo, patrimonio)
      const { data: cuentas, error: errCuentas } = await supabase
        .from('plan_cuentas')
        .select('*')
        .in('tipo', ['activo', 'pasivo', 'patrimonio'])
        .eq('activa', true)
        .order('codigo');

      if (errCuentas) throw errCuentas;
      if (!cuentas || cuentas.length === 0) {
        setData({ activo: [], pasivo: [], patrimonio: [] });
        setTotales({ activo: 0, pasivo: 0, patrimonio: 0 });
        setConsultado(true);
        return;
      }

      const cuentaIds = cuentas.map(c => c.id);

      // Get all asientos up to the cutoff date
      let query = supabase
        .from('asientos_contables')
        .select(`
          *,
          comprobante:comprobante_id ( estado, fecha )
        `)
        .in('cuenta_id', cuentaIds)
        .eq('comprobante.estado', 'activo');

      if (fechaCorte) {
        query = query.lte('comprobante.fecha', fechaCorte + 'T23:59:59');
      }

      const { data: allAsientos, error: errAsientos } = await query;
      if (errAsientos) throw errAsientos;

      // Group asientos by cuenta_id
      const asientosByCuenta = {};
      (allAsientos || []).forEach(a => {
        if (!asientosByCuenta[a.cuenta_id]) asientosByCuenta[a.cuenta_id] = [];
        asientosByCuenta[a.cuenta_id].push(a);
      });

      // Compute balance for each account
      const activo = [];
      const pasivo = [];
      const patrimonio = [];

      cuentas.forEach(cuenta => {
        const asientos = asientosByCuenta[cuenta.id] || [];
        const debe = asientos
          .filter(a => a.naturaleza === 'debito')
          .reduce((sum, a) => sum + Number(a.valor), 0);
        const haber = asientos
          .filter(a => a.naturaleza === 'credito')
          .reduce((sum, a) => sum + Number(a.valor), 0);

        let saldo;
        if (cuenta.naturaleza === 'debito') {
          saldo = debe - haber;
        } else {
          saldo = haber - debe;
        }

        if (saldo <= 0) return; // Skip accounts with no balance

        const entry = { ...cuenta, saldo };

        if (cuenta.tipo === 'activo') activo.push(entry);
        else if (cuenta.tipo === 'pasivo') pasivo.push(entry);
        else patrimonio.push(entry);
      });

      const totalActivo = activo.reduce((sum, r) => sum + r.saldo, 0);
      const totalPasivo = pasivo.reduce((sum, r) => sum + r.saldo, 0);
      const totalPatrimonio = patrimonio.reduce((sum, r) => sum + r.saldo, 0);

      setData({ activo, pasivo, patrimonio });
      setTotales({ activo: totalActivo, pasivo: totalPasivo, patrimonio: totalPatrimonio });
      setConsultado(true);
    } catch (err) {
      console.error('Error loading balance general:', err);
      try { addToast('Error al cargar el balance general', { type: 'error' }) } catch(e) {}
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalPasivoPatrimonio = totales.pasivo + totales.patrimonio;
  const diferencia = Math.abs(totales.activo - totalPasivoPatrimonio);
  const estaCuadrado = diferencia < 0.01;

  function renderSection(title, items, total, colorClasses) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className={`border-b border-gray-200 ${colorClasses.header} px-6 py-4`}>
          <h2 className={`text-lg font-semibold ${colorClasses.title}`}>{title}</h2>
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <p className="text-sm">No hay cuentas con saldo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cuenta</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.codigo}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.nombre}</td>
                    <td className={`px-4 py-3 text-right text-sm font-mono font-semibold ${colorClasses.saldo}`}>
                      {formatValorContable(item.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={colorClasses.footer}>
                <tr>
                  <td colSpan="2" className={`px-4 py-3 text-right text-sm font-bold ${colorClasses.title}`}>
                    TOTAL {title.toUpperCase()}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-mono font-bold ${colorClasses.title}`}>
                    {formatValorContable(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  }

  async function exportarExcelFn() {
    const columns = [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Cuenta' },
      { key: 'tipo', label: 'Clasificación', formatter: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
      { key: 'saldo', label: 'Saldo', formatter: (v) => `$${Number(v || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    ]
    const allItems = [
      ...data.activo.map(i => ({ ...i, tipo: 'activo' })),
      ...data.pasivo.map(i => ({ ...i, tipo: 'pasivo' })),
      ...data.patrimonio.map(i => ({ ...i, tipo: 'patrimonio' })),
    ]
    const rows = allItems.map(item => {
      const row = {}
      columns.forEach(col => {
        row[col.label] = col.formatter ? col.formatter(item[col.key], item) : (item[col.key] ?? '')
      })
      return row
    })
    await exportarExcel(rows, columns, 'balance_general', 'Balance General - Serviequipos')
  }

  const hayItems = data.activo.length > 0 || data.pasivo.length > 0 || data.patrimonio.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance General</h1>
          <p className="text-sm text-gray-600">Situación financiera de la empresa a una fecha determinada</p>
        </div>
        {consultado && (
          <button
            onClick={exportarExcelFn}
            disabled={!hayItems}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="Exportar a Excel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Excel</span>
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de Corte</label>
            <input
              type="date"
              value={fechaCorte}
              onChange={(e) => setFechaCorte(e.target.value)}
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
              <PieChart className="h-4 w-4" />
            )}
            Generar Balance General
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ACTIVO */}
            <div>
              {renderSection('Activo', data.activo, totales.activo, {
                header: 'bg-blue-50',
                title: 'text-blue-800',
                saldo: 'text-blue-700',
                footer: 'bg-blue-50',
              })}
            </div>

            {/* PASIVO + PATRIMONIO */}
            <div className="space-y-6">
              {renderSection('Pasivo', data.pasivo, totales.pasivo, {
                header: 'bg-orange-50',
                title: 'text-orange-800',
                saldo: 'text-orange-700',
                footer: 'bg-orange-50',
              })}

              {renderSection('Patrimonio', data.patrimonio, totales.patrimonio, {
                header: 'bg-purple-50',
                title: 'text-purple-800',
                saldo: 'text-purple-700',
                footer: 'bg-purple-50',
              })}
            </div>
          </div>

          {/* Equality Check */}
          <div className={`rounded-lg border shadow-sm p-6 ${
            estaCuadrado
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Activo</p>
                <p className="text-2xl font-bold font-mono text-blue-700">
                  {formatValorContable(totales.activo)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Pasivo + Patrimonio</p>
                <p className="text-2xl font-bold font-mono text-orange-700">
                  {formatValorContable(totalPasivoPatrimonio)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Verificación</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {estaCuadrado ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <span className="text-lg font-semibold text-green-700">Balance Cuadrado</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-600" />
                      <span className="text-lg font-semibold text-red-700">
                        Diferencia: {formatValorContable(diferencia)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!consultado && !loading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-16 text-center">
          <PieChart className="mx-auto h-16 w-16 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Seleccione una fecha de corte y haga clic en "Generar Balance General" para ver los resultados.
          </p>
        </div>
      )}
    </div>
  );
}
