'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import StatsCard from '@/components/ui/StatsCard';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';
import { formatValorContable } from '@/lib/utils/contabilidad';
import {
  FileText,
  BookOpen,
  Calculator,
  BarChart3,
  PieChart,
  LineChart,
  Plus,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Plan de Cuentas (PUC)', href: '/contabilidad/puc', icon: BookOpen, color: 'blue' },
  { label: 'Nuevo Comprobante', href: '/contabilidad/comprobante/nuevo', icon: Plus, color: 'green' },
  { label: 'Comprobantes', href: '/contabilidad/comprobantes', icon: FileText, color: 'purple' },
  { label: 'Mayor', href: '/contabilidad/mayor', icon: BarChart3, color: 'orange' },
  { label: 'Balance de Prueba', href: '/contabilidad/balance-prueba', icon: Calculator, color: 'red' },
  { label: 'PyG', href: '/contabilidad/pyg', icon: LineChart, color: 'green' },
  { label: 'Balance General', href: '/contabilidad/balance-general', icon: PieChart, color: 'blue' },
];

export default function ContabilidadDashboard() {
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    cuentasActivas: 0,
    comprobantesMes: 0,
    totalDebitos: 0,
    totalCreditos: 0,
  });
  const [ultimosComprobantes, setUltimosComprobantes] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const now = new Date();
        const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [
          cuentasRes,
          comprobantesRes,
          debitosRes,
          creditosRes,
          ultimosRes,
        ] = await Promise.all([
          supabase.from('plan_cuentas').select('id', { count: 'exact', head: true }).eq('activa', true),
          supabase.from('comprobantes').select('id', { count: 'exact', head: true }).eq('estado', 'activo').gte('fecha', primerDia).lte('fecha', ultimoDia),
          supabase.from('comprobantes').select('total_debito', { count: 'exact' }).eq('estado', 'activo').gte('fecha', primerDia).lte('fecha', ultimoDia),
          supabase.from('comprobantes').select('total_credito', { count: 'exact' }).eq('estado', 'activo').gte('fecha', primerDia).lte('fecha', ultimoDia),
          supabase
            .from('comprobantes')
            .select(`
              id,
              numero_comprobante,
              fecha,
              concepto,
              total_debito,
              total_credito,
              estado,
              tipo_comprobante_id,
              tipo_comprobantes ( id, codigo, nombre )
            `)
            .eq('estado', 'activo')
            .order('fecha', { ascending: false })
            .limit(5),
        ]);

        const totalDebitos = (debitosRes.data || []).reduce((sum, r) => sum + Number(r.total_debito || 0), 0);
        const totalCreditos = (creditosRes.data || []).reduce((sum, r) => sum + Number(r.total_credito || 0), 0);

        setStats({
          cuentasActivas: cuentasRes.count || 0,
          comprobantesMes: comprobantesRes.count || 0,
          totalDebitos,
          totalCreditos,
        });
        setUltimosComprobantes(ultimosRes.data || []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        try { addToast('Error al cargar datos del dashboard', { type: 'error' }) } catch(e) {}
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 animate-pulse">Cargando panel de contabilidad...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
          <h1 className="text-2xl font-bold text-gray-900">Contabilidad</h1>
          <p className="text-sm text-gray-600">Módulo de contabilidad general y plan de cuentas</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Cuentas Activas" value={stats.cuentasActivas} icon={BookOpen} color="blue" />
        <StatsCard title="Comprobantes del Mes" value={stats.comprobantesMes} icon={FileText} color="green" />
        <StatsCard title="Total Débitos" value={formatValorContable(stats.totalDebitos)} icon={Calculator} color="orange" />
        <StatsCard title="Total Créditos" value={formatValorContable(stats.totalCreditos)} icon={Calculator} color="purple" />
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className={`rounded-lg p-2.5 bg-${link.color}-50 text-${link.color}-600`}>
              <link.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 leading-tight">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* Últimos 5 Comprobantes */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Últimos Comprobantes</h2>
        </div>
        {ultimosComprobantes.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-400">No hay comprobantes registrados</p>
            {isAdmin && (
              <Link
                href="/contabilidad/comprobante/nuevo"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo Comprobante
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">N°</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Concepto</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Débitos</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Créditos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {ultimosComprobantes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link href={`/contabilidad/comprobante/${c.id}`} className="hover:text-blue-600 transition">
                        {c.numero_comprobante}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{c.tipo_comprobantes?.codigo || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {new Date(c.fecha).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{c.concepto}</td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-gray-700">
                      {formatValorContable(c.total_debito)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono text-gray-700">
                      {formatValorContable(c.total_credito)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
