'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { formatValorContable, calcularSaldoCuenta } from '@/lib/utils/contabilidad';
import {
  Search,
  AlertTriangle,
  Loader2,
  BarChart3,
} from 'lucide-react';

export default function MayorPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);

  const [selectedCuenta, setSelectedCuenta] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [asientos, setAsientos] = useState([]);
  const [cuentaInfo, setCuentaInfo] = useState(null);

  useEffect(() => {
    async function loadCuentas() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('plan_cuentas')
          .select('id, codigo, nombre, naturaleza')
          .eq('activa', true)
          .eq('acepta_movimiento', true)
          .order('codigo');
        if (err) throw err;
        setCuentas(data || []);
      } catch (err) {
        console.error('Error loading cuentas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCuentas();
  }, [supabase]);

  async function handleConsultar() {
    if (!selectedCuenta) return;

    try {
      setLoadingData(true);
      setError(null);

      // Get cuenta info
      const { data: cuenta, error: errCuenta } = await supabase
        .from('plan_cuentas')
        .select('*')
        .eq('id', selectedCuenta)
        .single();

      if (errCuenta) throw errCuenta;
      setCuentaInfo(cuenta);

      // Build query for asientos
      let query = supabase
        .from('asientos_contables')
        .select(`
          *,
          comprobante:comprobante_id (
            id,
            numero_comprobante,
            fecha,
            concepto,
            estado
          )
        `)
        .eq('cuenta_id', selectedCuenta)
        .eq('comprobante.estado', 'activo')
        .order('comprobante_id', { ascending: true })
        .order('id', { ascending: true });

      if (fechaDesde) {
        query = query.gte('comprobante.fecha', fechaDesde);
      }
      if (fechaHasta) {
        query = query.lte('comprobante.fecha', fechaHasta + 'T23:59:59');
      }

      const { data, error: errAsientos } = await query;
      if (errAsientos) throw errAsientos;
      setAsientos(data || []);
    } catch (err) {
      console.error('Error consulting mayor:', err);
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  }

  const saldoFinal = cuentaInfo
    ? calcularSaldoCuenta(asientos, cuentaInfo.naturaleza)
    : 0;

  let saldoCorriente = 0;

  function getNaturalezaBadge(nat) {
    return nat === 'debito'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-green-100 text-green-700 border-green-200';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 animate-pulse">Cargando cuentas...</p>
        </div>
      </div>
    );
  }

  if (error && asientos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mayor</h1>
          <p className="text-sm text-gray-600">Consulta de movimientos por cuenta contable</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta Contable</label>
            <select
              value={selectedCuenta}
              onChange={(e) => setSelectedCuenta(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Seleccione una cuenta</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              onClick={handleConsultar}
              disabled={!selectedCuenta || loadingData}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loadingData ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Consultar'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {error && asientos.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {cuentaInfo && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                <span className="font-mono">{cuentaInfo.codigo}</span> — {cuentaInfo.nombre}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                <span>Naturaleza: <strong>{cuentaInfo.naturaleza === 'debito' ? 'Débito' : 'Crédito'}</strong></span>
                <span>Movimientos: <strong>{asientos.length}</strong></span>
                <span>Saldo: <strong className="text-lg font-bold text-gray-900">{formatValorContable(saldoFinal)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {cuentaInfo && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {asientos.length === 0 ? (
            <div className="p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-400">
                {selectedCuenta ? 'No hay movimientos para esta cuenta en el período seleccionado' : 'Seleccione una cuenta y consulte'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Comprobante</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Descripción</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Débito</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Crédito</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {asientos.map((a) => {
                    const val = Number(a.valor) || 0;
                    if (a.naturaleza === 'debito') {
                      saldoCorriente += val;
                    } else {
                      saldoCorriente -= val;
                    }
                    // Adjust for naturaleza of the account
                    const runningSaldo = cuentaInfo.naturaleza === 'debito' ? saldoCorriente : -saldoCorriente;

                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                          {a.comprobante?.fecha
                            ? new Date(a.comprobante.fecha).toLocaleDateString('es-CO')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700">
                          {a.comprobante?.numero_comprobante ? (
                            <Link href={`/contabilidad/comprobante/${a.comprobante_id}`} className="hover:text-blue-600 transition">
                              {a.comprobante.numero_comprobante}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-sm truncate">
                          {a.descripcion || a.comprobante?.concepto || '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-blue-700">
                          {a.naturaleza === 'debito' ? formatValorContable(val) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-green-700">
                          {a.naturaleza === 'credito' ? formatValorContable(val) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-gray-900">
                          {formatValorContable(runningSaldo)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Final balance row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan="5" className="px-4 py-3 text-right text-sm text-gray-700">
                      Saldo Final
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                      {formatValorContable(saldoFinal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
