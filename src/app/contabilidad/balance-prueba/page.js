'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { formatValorContable } from '@/lib/utils/contabilidad';
import {
  AlertTriangle,
  Loader2,
  Calculator,
  Download,
} from 'lucide-react';

export default function BalancePruebaPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0]);
  const [cuentas, setCuentas] = useState([]);
  const [totals, setTotals] = useState({ debitos: 0, creditos: 0 });
  const [consultado, setConsultado] = useState(false);

  async function handleConsultar() {
    try {
      setLoading(true);
      setError(null);
      setConsultado(false);

      // Get all accounts that accept movement
      const { data: allCuentas, error: errCuentas } = await supabase
        .from('plan_cuentas')
        .select('*')
        .eq('acepta_movimiento', true)
        .eq('activa', true)
        .order('codigo');

      if (errCuentas) throw errCuentas;
      if (!allCuentas || allCuentas.length === 0) {
        setCuentas([]);
        setTotals({ debitos: 0, creditos: 0 });
        setConsultado(true);
        return;
      }

      const cuentaIds = allCuentas.map(c => c.id);

      // Get all asientos for these accounts up to the cutoff date
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

      const asientosByCuenta = {};
      (allAsientos || []).forEach(a => {
        if (!asientosByCuenta[a.cuenta_id]) asientosByCuenta[a.cuenta_id] = [];
        asientosByCuenta[a.cuenta_id].push(a);
      });

      // Compute balance for each account
      const results = allCuentas.map(cuenta => {
        const asientos = asientosByCuenta[cuenta.id] || [];
        const debe = asientos
          .filter(a => a.naturaleza === 'debito')
          .reduce((sum, a) => sum + Number(a.valor), 0);
        const haber = asientos
          .filter(a => a.naturaleza === 'credito')
          .reduce((sum, a) => sum + Number(a.valor), 0);

        let saldoDebito = 0;
        let saldoCredito = 0;

        if (cuenta.naturaleza === 'debito') {
          const saldo = debe - haber;
          if (saldo >= 0) saldoDebito = saldo;
          else saldoCredito = Math.abs(saldo);
        } else {
          const saldo = haber - debe;
          if (saldo >= 0) saldoCredito = saldo;
          else saldoDebito = Math.abs(saldo);
        }

        return {
          ...cuenta,
          saldoDebito,
          saldoCredito,
        };
      });

      // Only show accounts with non-zero balance
      const nonZero = results.filter(r => r.saldoDebito > 0 || r.saldoCredito > 0);

      setCuentas(nonZero);
      setTotals({
        debitos: nonZero.reduce((sum, r) => sum + r.saldoDebito, 0),
        creditos: nonZero.reduce((sum, r) => sum + r.saldoCredito, 0),
      });
      setConsultado(true);
    } catch (err) {
      console.error('Error loading balance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const diferencia = Math.abs(totals.debitos - totals.creditos);

  function getNaturalezaBadge(nat) {
    return nat === 'debito'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-green-200 bg-green-50 text-green-700';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Balance de Prueba</h1>
        <p className="text-sm text-gray-600">Listado de saldos de todas las cuentas a una fecha determinada</p>
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
              <Calculator className="h-4 w-4" />
            )}
            Generar Balance de Prueba
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
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {cuentas.length === 0 ? (
            <div className="p-12 text-center">
              <Calculator className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-400">No hay movimientos registrados hasta la fecha</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Naturaleza</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo Débito</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo Crédito</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {cuentas.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-900">{c.codigo}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getNaturalezaBadge(c.naturaleza)}`}>
                          {c.naturaleza === 'debito' ? 'Débito' : 'Crédito'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-mono text-blue-700">
                        {c.saldoDebito > 0 ? formatValorContable(c.saldoDebito) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-mono text-green-700">
                        {c.saldoCredito > 0 ? formatValorContable(c.saldoCredito) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {cuentas.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-wrap items-center gap-6 justify-end">
                <div className="text-sm">
                  <span className="text-gray-500">Total Débitos:</span>{' '}
                  <span className="font-mono font-bold text-blue-700">{formatValorContable(totals.debitos)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Total Créditos:</span>{' '}
                  <span className="font-mono font-bold text-green-700">{formatValorContable(totals.creditos)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Diferencia:</span>{' '}
                  <span className={`font-mono font-bold ${diferencia < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatValorContable(diferencia)}
                  </span>
                  {diferencia < 0.01 && (
                    <span className="ml-2 text-xs text-green-600 font-medium">(Cuadra)</span>
                  )}
                  {diferencia >= 0.01 && (
                    <span className="ml-2 text-xs text-red-600 font-medium">(No cuadra)</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!consultado && !loading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-16 text-center">
          <Calculator className="mx-auto h-16 w-16 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500">
            Seleccione una fecha de corte y haga clic en "Generar Balance de Prueba" para ver los resultados.
          </p>
        </div>
      )}
    </div>
  );
}
