'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import StatsCard from '@/components/ui/StatsCard';
import { formatCOP } from '@/lib/utils/nomina';
import {
  DollarSign,
  Clock,
  Users,
  FileText,
  Plus,
  Eye,
  AlertTriangle,
  Loader2,
  CircleCheck,
  CircleX,
} from 'lucide-react';

const TIPO_LABELS = {
  semanal: 'Semanal',
  decadual: 'Decadual',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
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
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function calcularNeto(n) {
  const dev =
    Number(n.sueldo_basico || 0) +
    Number(n.auxilio_transporte || 0) +
    Number(n.horas_extras_diurnas || 0) +
    Number(n.horas_extras_nocturnas || 0) +
    Number(n.horas_extras_dominicales || 0) +
    Number(n.horas_recargo_nocturno || 0) +
    Number(n.horas_recargo_dominical || 0) +
    Number(n.comisiones || 0) +
    Number(n.bonificaciones || 0) +
    Number(n.otros_devengos || 0);
  const ded =
    Number(n.deduccion_salud || 0) +
    Number(n.deduccion_pension || 0) +
    Number(n.deduccion_fondo_solidaridad || 0) +
    Number(n.embargos || 0) +
    Number(n.libranzas || 0) +
    Number(n.otras_deducciones || 0);
  return dev - ded;
}

function formatFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-CO');
}

export default function NominaPage() {
  const supabase = createClient();
  const { isAdmin } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState({
    periodos_activos: 0,
    nominas_pendientes: 0,
    total_pendiente_pago: 0,
    trabajadores_activos: 0,
  });
  const [periodos, setPeriodos] = useState([]);
  const [ultimasNominas, setUltimasNominas] = useState([]);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [periodosRes, ultNominasRes, trabajRes] = await Promise.all([
        supabase
          .from('periodos_nomina')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('nominas')
          .select(`
            id, codigo_nomina, sueldo_basico, auxilio_transporte,
            horas_extras_diurnas, horas_extras_nocturnas, horas_extras_dominicales,
            horas_recargo_nocturno, horas_recargo_dominical,
            comisiones, bonificaciones, otros_devengos,
            deduccion_salud, deduccion_pension, deduccion_fondo_solidaridad,
            embargos, libranzas, otras_deducciones,
            pagado, fecha_pago, created_at,
            trabajador:trabajador_id(id, nombre, primer_apellido, cedula),
            periodo:periodo_nomina_id(id, codigo, nombre)
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('trabajadores')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true)
          .eq('estado', 'activo'),
      ]);

      // Calcular pendientes
      const { count: pendCount } = await supabase
        .from('nominas')
        .select('id', { count: 'exact', head: true })
        .eq('pagado', false);

      // Calcular total neto pendiente (últimas)
      let totalPend = 0;
      if (ultNominasRes.data) {
        for (const n of ultNominasRes.data) {
          if (!n.pagado) totalPend += calcularNeto(n);
        }
      }

      setPeriodos(periodosRes.data || []);
      setUltimasNominas(ultNominasRes.data || []);
      setResumen({
        periodos_activos: periodosRes.data?.filter(p => p.estado === 'abierto').length || 0,
        nominas_pendientes: pendCount || 0,
        total_pendiente_pago: totalPend,
        trabajadores_activos: trabajRes.count || 0,
      });
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando m&oacute;dulo de n&oacute;mina...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">N&oacute;mina</h1>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error al cargar datos</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button onClick={cargarDatos} className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition">Reintentar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">N&oacute;mina</h1>
          <p className="text-sm text-gray-600">Gesti&oacute;n de n&oacute;mina, periodos y liquidaciones</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/nomina/novedades" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Novedades</span>
          </Link>
          <Link href="/nomina/prestaciones" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Prestaciones</span>
          </Link>
          {isAdmin && (
            <Link href="/nomina/nuevo" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
              <Plus className="h-4 w-4" />
              Nuevo Per&iacute;odo
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Per&iacute;odos Activos" value={resumen.periodos_activos} icon={Clock} color="blue" />
        <StatsCard title="N&oacute;minas Pendientes" value={resumen.nominas_pendientes} icon={FileText} color="orange" />
        <StatsCard title="Total Pendiente Pago" value={formatCOP(resumen.total_pendiente_pago)} icon={DollarSign} color="purple" />
        <StatsCard title="Trabajadores Activos" value={resumen.trabajadores_activos} icon={Users} color="green" />
      </div>

      {/* Períodos */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Per&iacute;odos de N&oacute;mina
            <span className="ml-2 text-sm font-normal text-gray-500">({periodos.length} per&iacute;odos)</span>
          </h2>
        </div>
        {periodos.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">No hay per&iacute;odos registrados</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primer per&iacute;odo de n&oacute;mina para comenzar.</p>
            {isAdmin && (
              <Link href="/nomina/nuevo" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                <Plus className="h-4 w-4" /> Nuevo Per&iacute;odo
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">C&oacute;digo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Per&iacute;odo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {periodos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">{p.codigo}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{TIPO_LABELS[p.tipo] || p.tipo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatFecha(p.fecha_inicio)} &mdash; {formatFecha(p.fecha_fin)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatFecha(p.fecha_pago)}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={p.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/nomina/${p.id}`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition" title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Últimas nóminas */}
      {ultimasNominas.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">&Uacute;ltimas N&oacute;minas Generadas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">C&oacute;digo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Trabajador</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Per&iacute;odo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Pagado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {ultimasNominas.map((n) => {
                  const t = n.trabajador;
                  const nombre = t ? `${t.nombre || ''} ${t.primer_apellido || ''}`.trim() || '—' : '—';
                  return (
                    <tr key={n.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{n.codigo_nomina || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{nombre}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{n.periodo?.nombre || n.periodo?.codigo || '—'}</td>
                      <td className="px-4 py-3">
                        {n.pagado ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                            <CircleCheck className="h-3 w-3" /> Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2.5 py-0.5">
                            <CircleX className="h-3 w-3" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/nomina/recibo/${n.id}`} className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition" title="Ver recibo">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
