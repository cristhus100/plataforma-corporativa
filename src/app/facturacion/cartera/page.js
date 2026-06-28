'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import { getCarteraAging, formatCOP } from '@/lib/utils/facturacion'
import {
  CreditCard,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Search,
  Eye,
  ArrowRight,
} from 'lucide-react'
import { exportarExcel } from '@/lib/utils/exportar'
import { useToast } from '@/context/ToastContext'

export default function CarteraPage() {
  const { addToast } = useToast()
  const supabase = createClient()
  const { isAdmin } = useRole()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [agingData, setAgingData] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    cargarCartera()
  }, [])

  async function cargarCartera() {
    try {
      setLoading(true)
      setError(null)
      const hoy = new Date().toISOString().split('T')[0]

      const { data, error: err } = await supabase
        .from('facturas')
        .select(`
          id, numero_factura, fecha_emision, fecha_vencimiento, subtotal, iva, total, estado,
          tercero_id,
          terceros!inner(nombre_completo, nombre_comercial, tipo_documento, numero_documento)
        `)
        .in('estado', ['pendiente', 'parcial'])
        .order('fecha_vencimiento', { ascending: true })

      if (err) throw err

      // Agregar saldo_pendiente calculado
      const facturasConSaldo = (data || []).map(f => ({
        ...f,
        saldo_pendiente: Number(f.total) - (/* pagos registrados - simplified */ 0),
      }))

      const aging = getCarteraAging(facturasConSaldo)
      setAgingData(aging)
      setFacturas(facturasConSaldo)
    } catch (err) {
      console.error('Error:', err)
      addToast('Error al cargar la cartera', { type: 'error' })
      setError('Error al cargar la cartera')
    } finally {
      setLoading(false)
    }
  }

  const facturasFiltradas = facturas.filter(f => {
    if (!search) return true
    const term = search.toLowerCase()
    const cliente = (f.terceros?.nombre_comercial || f.terceros?.nombre_completo || '').toLowerCase()
    const num = (f.numero_factura || '').toLowerCase()
    return cliente.includes(term) || num.includes(term)
  })

  async function exportarExcelFn() {
    const columns = [
      { key: 'numero_factura', label: 'Factura' },
      { key: 'cliente_label', label: 'Cliente', formatter: (_v, item) => item.terceros?.nombre_comercial || item.terceros?.nombre_completo || '—' },
      { key: 'fecha_vencimiento', label: 'Vencimiento', formatter: (v) => v ? new Date(v + 'T12:00:00').toLocaleDateString('es-CO') : '—' },
      { key: 'total', label: 'Total', formatter: (v) => `$${Number(v || 0).toLocaleString('es-CO')}` },
      { key: 'estado', label: 'Estado', formatter: (_v, item) => {
        const venc = new Date(item.fecha_vencimiento + 'T12:00:00')
        const diff = Math.max(0, Math.floor((new Date() - venc) / (1000 * 60 * 60 * 24)))
        const labels = { pendiente: 'Pendiente', pagada: 'Pagada', vencida: 'Vencida', anulada: 'Anulada', parcial: 'Parcial' }
        return labels[item.estado === 'pendiente' && diff > 0 ? 'vencida' : item.estado] || item.estado
      }},
      { key: 'dias_mora', label: 'Días Mora', formatter: (_v, item) => {
        const venc = new Date(item.fecha_vencimiento + 'T12:00:00')
        return Math.max(0, Math.floor((new Date() - venc) / (1000 * 60 * 60 * 24)))
      }},
    ]
    await exportarExcel(facturasFiltradas, columns, 'cartera', 'Cartera - Serviequipos')
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
          <p className="text-gray-600">Cargando cartera...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-2" />
            <p className="text-red-800 font-medium mb-2">{error}</p>
            <button onClick={cargarCartera}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
            <span>/</span>
            <span className="text-gray-900">Cartera</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cartera</h1>
          <p className="text-sm text-gray-600">An&aacute;lisis de cartera por antig&uuml;edad de saldos</p>
        </div>
        <button
          onClick={exportarExcelFn}
          disabled={facturas.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Exportar a Excel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">Excel</span>
        </button>
      </div>

      {/* Empty State */}
      {facturas.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">Cartera al d&iacute;a</h3>
          <p className="mt-1 text-sm text-gray-500">
            No hay facturas pendientes de pago. &iexcl;Excelente!
          </p>
          <Link href="/facturacion/facturas"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700">
            <ArrowRight className="h-4 w-4" /> Ver facturas
          </Link>
        </div>
      ) : (
        <>
          {/* Aging Report */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-50"><CheckCircle2 className="h-4 w-4 text-blue-600" /></div>
                <span className="text-xs font-medium text-gray-500">0-30 d&iacute;as</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCOP(agingData?.rangos[0]?.total || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-yellow-50"><AlertTriangle className="h-4 w-4 text-yellow-600" /></div>
                <span className="text-xs font-medium text-gray-500">31-60 d&iacute;as</span>
              </div>
              <p className="text-2xl font-bold text-yellow-700">
                {formatCOP(agingData?.rangos[1]?.total || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-orange-50"><AlertTriangle className="h-4 w-4 text-orange-600" /></div>
                <span className="text-xs font-medium text-gray-500">61-90 d&iacute;as</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                {formatCOP(agingData?.rangos[2]?.total || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-red-50"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
                <span className="text-xs font-medium text-gray-500">M&aacute;s de 90 d&iacute;as</span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {formatCOP(agingData?.rangos[3]?.total || 0)}
              </p>
            </div>
          </div>

          {/* Total pendiente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gray-900"><DollarSign className="h-5 w-5 text-white" /></div>
                <span className="text-lg font-semibold text-gray-900">Total Cartera Pendiente</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCOP(agingData?.total_pendiente || 0)}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por cliente o n&uacute;mero de factura..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Factura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Vencimiento</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Antig&uuml;edad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acci&oacute;n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {facturasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    facturasFiltradas.map((f) => {
                      const vencimiento = new Date(f.fecha_vencimiento + 'T12:00:00')
                      const hoy = new Date()
                      const diffDays = Math.max(0, Math.floor((hoy - vencimiento) / (1000 * 60 * 60 * 24)))
                      const estadoReal = f.estado === 'pendiente' && diffDays > 0 ? 'vencida' : f.estado

                      let agingColor = 'text-green-600'
                      let agingBg = 'bg-green-50'
                      if (diffDays > 90) { agingColor = 'text-red-700'; agingBg = 'bg-red-50' }
                      else if (diffDays > 60) { agingColor = 'text-orange-700'; agingBg = 'bg-orange-50' }
                      else if (diffDays > 30) { agingColor = 'text-yellow-700'; agingBg = 'bg-yellow-50' }

                      return (
                        <tr key={f.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{f.numero_factura}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {f.terceros?.nombre_comercial || f.terceros?.nombre_completo || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {f.fecha_vencimiento ? vencimiento.toLocaleDateString('es-CO') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">{formatCOP(f.total)}</td>
                          <td className="px-4 py-3">{getEstadoBadge(estadoReal)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${agingBg} ${agingColor}`}>
                              {diffDays === 0 ? 'Al d&iacute;a' : `${diffDays} d&iacute;as`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/facturacion/facturas/${f.id}`}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                              title="Ver factura">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
