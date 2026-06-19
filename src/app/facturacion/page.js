'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import StatsCard from '@/components/ui/StatsCard'
import { formatCOP } from '@/lib/utils/facturacion'
import { useToast } from '@/context/ToastContext'
import {
  DollarSign,
  Receipt,
  AlertTriangle,
  Users,
  FileText,
  UserPlus,
  CreditCard,
  FileMinus,
  FilePlus,
  ArrowRight,
  Calendar,
} from 'lucide-react'

export default function FacturacionDashboardPage() {
  const supabase = createClient()
  const { isAdmin } = useRole()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalFacturadoMes: 0,
    facturasPendientes: 0,
    carteraVencida: 0,
    clientesActivos: 0,
  })
  const [ultimasFacturas, setUltimasFacturas] = useState([])

  const quickLinks = [
    { label: 'Terceros', href: '/facturacion/terceros', icon: Users, description: 'Clientes y proveedores' },
    { label: 'Facturas', href: '/facturacion/facturas', icon: FileText, description: 'Facturación electrónica' },
    { label: 'Cartera', href: '/facturacion/cartera', icon: CreditCard, description: 'Análisis de cartera' },
    { label: 'Notas Crédito', href: '/facturacion/notas-credito', icon: FileMinus, description: 'Notas crédito' },
    { label: 'Notas Débito', href: '/facturacion/notas-debito', icon: FilePlus, description: 'Notas débito' },
  ]

  useEffect(() => {
    cargarDashboard()
  }, [])

  async function cargarDashboard() {
    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const hoy = now.toISOString().split('T')[0]

      const [
        totalFacturadoRes,
        pendientesRes,
        vencidasRes,
        clientesRes,
        ultimasRes,
      ] = await Promise.all([
        supabase
          .from('facturas')
          .select('total')
          .gte('fecha_emision', primerDiaMes)
          .lte('fecha_emision', hoy)
          .not('estado', 'eq', 'anulada'),
        supabase
          .from('facturas')
          .select('id', { count: 'exact', head: true })
          .in('estado', ['pendiente', 'parcial']),
        supabase
          .from('facturas')
          .select('total, saldo_pendiente')
          .in('estado', ['pendiente', 'parcial'])
          .lt('fecha_vencimiento', hoy),
        supabase
          .from('terceros')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true)
          .eq('tipo_tercero', 'cliente'),
        supabase
          .from('facturas')
          .select(`
            id, numero_factura, fecha_emision, total, estado,
            tercero_id,
            terceros!inner(nombre_completo, nombre_comercial, tipo_documento, numero_documento)
          `)
          .order('fecha_emision', { ascending: false })
          .limit(5),
      ])

      const totalMes = (totalFacturadoRes.data || []).reduce(
        (sum, f) => sum + Number(f.total || 0), 0
      )

      const vencidaTotal = (vencidasRes.data || []).reduce(
        (sum, f) => sum + Number(f.saldo_pendiente || f.total || 0), 0
      )

      setStats({
        totalFacturadoMes: totalMes,
        facturasPendientes: pendientesRes.count || 0,
        carteraVencida: vencidaTotal,
        clientesActivos: clientesRes.count || 0,
      })
      setUltimasFacturas(ultimasRes.data || [])
    } catch (err) {
      console.error('Error cargando dashboard:', err)
      try { addToast('Error al cargar datos del dashboard', { type: 'error' }) } catch(e) {}
      setError('Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }

  function getEstadoBadge(estado) {
    const colors = {
      pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pagada: 'bg-green-100 text-green-800 border-green-200',
      vencida: 'bg-red-100 text-red-800 border-red-200',
      anulada: 'bg-gray-100 text-gray-500 border-gray-200',
      parcial: 'bg-blue-100 text-blue-800 border-blue-200',
    }
    const labels = {
      pendiente: 'Pendiente',
      pagada: 'Pagada',
      vencida: 'Vencida',
      anulada: 'Anulada',
      parcial: 'Parcial',
    }
    return (
      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[estado] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
        {labels[estado] || estado}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-medium">{error}</p>
            <button
              onClick={cargarDashboard}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-600">
            Gestión de facturación, cartera y documentos electrónicos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Facturado este Mes"
          value={formatCOP(stats.totalFacturadoMes)}
          icon={DollarSign}
          color="blue"
        />
        <StatsCard
          title="Facturas Pendientes"
          value={stats.facturasPendientes}
          icon={Receipt}
          color="orange"
        />
        <StatsCard
          title="Cartera Vencida"
          value={formatCOP(stats.carteraVencida)}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          title="Clientes Activos"
          value={stats.clientesActivos}
          icon={Users}
          color="green"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Módulos</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition group"
              >
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-blue-100 transition">
                  <Icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500 truncate">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
              </Link>
            )
          })}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            Últimas Facturas
          </h2>
          <Link
            href="/facturacion/facturas"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver todas
          </Link>
        </div>

        {ultimasFacturas.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">No hay facturas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Aún no se han registrado facturas en el sistema.
            </p>
            {isAdmin && (
              <Link
                href="/facturacion/facturas/nueva"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FileText className="h-4 w-4" />
                Crear primera factura
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Número</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {ultimasFacturas.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm font-mono font-medium text-gray-900">{f.numero_factura}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {f.terceros?.nombre_comercial || f.terceros?.nombre_completo || '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {f.fecha_emision ? new Date(f.fecha_emision + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">{formatCOP(f.total)}</td>
                    <td className="px-6 py-3">{getEstadoBadge(f.estado)}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/facturacion/facturas/${f.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Ver <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
