'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchPaginated } from '@/lib/supabase/paginacion'
import Pagination from '@/components/ui/Pagination'
import StatsCard from '@/components/ui/StatsCard'
import usePaginacion from '@/hooks/usePaginacion'
import { useRole } from '@/context/RoleContext'
import { formatCOP, getEstadoFacturaLabel, getEstadoFacturaColor } from '@/lib/utils/facturacion'
import {
  FileText,
  Search,
  Plus,
  Eye,
  Pencil,
  DollarSign,
  Receipt,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

export default function FacturasPage() {
  const supabase = createClient()
  const { isAdmin } = useRole()
  const [resumen, setResumen] = useState({
    totalMes: 0,
    pendientes: 0,
    vencidas: 0,
    pagadas: 0,
  })
  const [tiposDocumento, setTiposDocumento] = useState([])

  useEffect(() => {
    async function init() {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]

      const [pendientesRes, vencidasRes, pagadasRes, tiposRes] = await Promise.all([
        supabase.from('facturas').select('total').in('estado', ['pendiente', 'parcial']),
        supabase.from('facturas').select('total, saldo_pendiente').in('estado', ['pendiente', 'parcial']).lt('fecha_vencimiento', today),
        supabase.from('facturas').select('id', { count: 'exact', head: true }).eq('estado', 'pagada'),
        supabase.from('tipo_documentos_factura').select('id, nombre, prefijo').eq('activo', true).order('nombre'),
      ])

      const totalPend = (pendientesRes.data || []).reduce((s, f) => s + Number(f.total || 0), 0)
      const totalVenc = (vencidasRes.data || []).reduce((s, f) => s + Number(f.saldo_pendiente || f.total || 0), 0)

      setResumen({
        totalMes: totalPend,
        pendientes: pendientesRes.data?.length || 0,
        vencidas: totalVenc,
        pagadas: pagadasRes.count || 0,
      })
      setTiposDocumento(tiposRes.data || [])
    }
    init()
  }, [supabase])

  const fetchFn = useCallback(async ({ page, limit, search, filtros }) => {
    let query = supabase
      .from('facturas')
      .select(`
        id, numero_factura, fecha_emision, fecha_vencimiento, subtotal, iva, total, estado,
        tercero_id,
        terceros!inner(nombre_completo, nombre_comercial, tipo_documento, numero_documento),
        tipo_documento_id,
        tipo_documentos_factura!inner(nombre, prefijo)
      `, { count: 'exact' })

    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado)
    }
    if (filtros?.tipo_documento) {
      query = query.eq('tipo_documento_id', filtros.tipo_documento)
    }
    if (search) {
      const term = `%${search}%`
      query = query.or(
        `numero_factura.ilike.${term},terceros.nombre_completo.ilike.${term},terceros.nombre_comercial.ilike.${term}`
      )
    }

    query = query.order('fecha_emision', { ascending: false })
    return fetchPaginated(query, page, limit)
  }, [supabase])

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
    filtrosIniciales: { estado: '', tipo_documento: '' },
  })

  const hayFiltrosActivos = paginacion.search || paginacion.filtros.estado || paginacion.filtros.tipo_documento

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
            <span>/</span>
            <span className="text-gray-900">Facturas</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-600">Gesti&oacute;n de facturaci&oacute;n electr&oacute;nica</p>
        </div>
        {isAdmin && (
          <Link
            href="/facturacion/facturas/nueva"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Pendiente" value={formatCOP(resumen.totalMes)} icon={DollarSign} color="blue" />
        <StatsCard title="Pendientes" value={resumen.pendientes} icon={Receipt} color="orange" />
        <StatsCard title="Vencidas" value={formatCOP(resumen.vencidas)} icon={AlertTriangle} color="red" />
        <StatsCard title="Pagadas" value={resumen.pagadas} icon={CheckCircle2} color="green" />
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por n&uacute;mero o cliente..."
                value={paginacion.search}
                onChange={(e) => paginacion.setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <select
              value={paginacion.filtros.estado}
              onChange={(e) => paginacion.setFiltro('estado', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="parcial">Parcial</option>
              <option value="vencida">Vencida</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <select
              value={paginacion.filtros.tipo_documento}
              onChange={(e) => paginacion.setFiltro('tipo_documento', e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              {tiposDocumento.map((t) => (
                <option key={t.id} value={t.id}>{t.nombre} ({t.prefijo})</option>
              ))}
            </select>
          </div>
        </div>
        {hayFiltrosActivos && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando <strong>{paginacion.total}</strong> resultados
            </span>
            <button onClick={paginacion.limpiarFiltros} className="text-blue-600 hover:text-blue-700 font-medium">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {paginacion.loading ? (
          <div className="p-12 text-center text-gray-500">Cargando facturas...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {paginacion.total === 0 ? 'No hay facturas registradas' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {paginacion.total === 0 ? 'Comienza creando tu primera factura.' : 'Intenta ajustar los filtros.'}
            </p>
            {paginacion.total === 0 && isAdmin && (
              <Link href="/facturacion/facturas/nueva" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Nueva Factura
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">N&uacute;mero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map((f) => {
                  // Recalcular vencida si aplica
                  const hoy = new Date()
                  const vencimiento = new Date(f.fecha_vencimiento + 'T12:00:00')
                  const estadoReal = f.estado === 'pendiente' && vencimiento < hoy ? 'vencida' : f.estado

                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                        <Link href={`/facturacion/facturas/${f.id}`} className="hover:text-blue-600 transition">
                          {f.numero_factura}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {f.terceros?.nombre_comercial || f.terceros?.nombre_completo || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {f.fecha_emision ? new Date(f.fecha_emision + 'T12:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">{formatCOP(f.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEstadoFacturaColor(estadoReal)}`}>
                          {getEstadoFacturaLabel(estadoReal)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/facturacion/facturas/${f.id}`}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                            title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Link>
                          {isAdmin && f.estado !== 'anulada' && f.estado !== 'pagada' && (
                            <Link href={`/facturacion/facturas/${f.id}/editar`}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition"
                              title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!paginacion.loading && paginacion.totalPages > 1 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4">
            <Pagination
              page={paginacion.page}
              totalPages={paginacion.totalPages}
              onPageChange={paginacion.setPage}
              isLoading={paginacion.loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
