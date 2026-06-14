'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { registrarPago } from '@/actions/facturacion'
import { useRole } from '@/context/RoleContext'
import { formatCOP } from '@/lib/utils/facturacion'
import { ArrowLeft, Save, Loader2, Search, Banknote } from 'lucide-react'

export default function NuevoReciboPage() {
  const supabase = createClient()
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRole()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [facturasEncontradas, setFacturasEncontradas] = useState([])
  const [selectedFactura, setSelectedFactura] = useState(null)
  const [buscando, setBuscando] = useState(false)

  const [formData, setFormData] = useState({
    factura_id: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    valor_pagado: '',
    forma_pago: 'transferencia',
    numero_comprobante_transaccion: '',
    banco_origen: '',
    notas: '',
  })

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/facturacion/facturas')
    }
  }, [roleLoading, isAdmin, router])

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>
  if (!isAdmin) return null

  async function buscarFactura() {
    if (!searchTerm.trim()) return
    setBuscando(true)
    try {
      const term = `%${searchTerm}%`
      const { data, error: err } = await supabase
        .from('facturas')
        .select(`
          id, numero_factura, fecha_emision, fecha_vencimiento, total, estado,
          terceros!inner(nombre_completo, nombre_comercial, tipo_documento, numero_documento)
        `)
        .or(`numero_factura.ilike.${term},terceros.nombre_completo.ilike.${term},terceros.nombre_comercial.ilike.${term}`)
        .in('estado', ['pendiente', 'parcial'])
        .order('fecha_emision', { ascending: false })
        .limit(10)

      if (err) throw err
      setFacturasEncontradas(data || [])
    } catch (err) {
      console.error('Error:', err)
      alert('Error al buscar facturas')
    } finally {
      setBuscando(false)
    }
  }

  function seleccionarFactura(factura) {
    setSelectedFactura(factura)
    setFormData(prev => ({
      ...prev,
      factura_id: String(factura.id),
      valor_pagado: String(factura.total),
    }))
    setFacturasEncontradas([])
    setSearchTerm(factura.numero_factura)
  }

  function limpiarSeleccion() {
    setSelectedFactura(null)
    setSearchTerm('')
    setFormData(prev => ({
      ...prev,
      factura_id: '',
      valor_pagado: '',
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.factura_id) throw new Error('Seleccione una factura')
      if (!formData.valor_pagado || Number(formData.valor_pagado) <= 0) {
        throw new Error('El valor del pago debe ser mayor a cero')
      }

      const result = await registrarPago({
        ...formData,
        factura_id: Number(formData.factura_id),
        valor_pagado: formData.valor_pagado,
      })

      if (result.error) throw new Error(result.error)
      if (result.success) {
        router.push(`/facturacion/facturas/${formData.factura_id}`)
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
          <span>/</span>
          <Link href="/facturacion/facturas" className="hover:text-gray-900">Facturas</Link>
          <span>/</span>
          <span className="text-gray-900">Nuevo Recibo</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Pago</h1>
        <p className="text-sm text-gray-600 mt-1">Registra un pago o abono a una factura pendiente</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Buscar Factura */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Buscar Factura</h2>
        {!selectedFactura ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarFactura()}
                  placeholder="Buscar por n&uacute;mero de factura o cliente..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <button onClick={buscarFactura} disabled={buscando || !searchTerm.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {facturasEncontradas.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Factura</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Cliente</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">Total</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Estado</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {facturasEncontradas.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{f.numero_factura}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">
                          {f.terceros?.nombre_comercial || f.terceros?.nombre_completo}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-right text-gray-900">{formatCOP(f.total)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                            f.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>{f.estado === 'pendiente' ? 'Pendiente' : 'Parcial'}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => seleccionarFactura(f)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!buscando && searchTerm && facturasEncontradas.length === 0 && (
              <p className="mt-3 text-sm text-gray-500">No se encontraron facturas pendientes.</p>
            )}
          </>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-900">{selectedFactura.numero_factura}</p>
                <p className="text-sm text-blue-700">{selectedFactura.terceros?.nombre_comercial || selectedFactura.terceros?.nombre_completo}</p>
                <p className="text-sm text-blue-600 mt-1 font-medium">Total: {formatCOP(selectedFactura.total)}</p>
              </div>
              <button onClick={limpiarSeleccion}
                className="px-3 py-1 border border-blue-300 text-blue-700 rounded text-xs font-medium hover:bg-blue-100">
                Cambiar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Form */}
      {selectedFactura && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos del Pago</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Pago <span className="text-red-500">*</span>
                </label>
                <input type="date" name="fecha_pago" value={formData.fecha_pago} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor a Aplicar <span className="text-red-500">*</span>
                </label>
                <input type="number" name="valor_pagado" min="0" step="100" value={formData.valor_pagado}
                  onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
                <select name="forma_pago" value={formData.forma_pago} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                  <option value="tarjeta_credito">Tarjeta Cr&eacute;dito</option>
                  <option value="tarjeta_debito">Tarjeta D&eacute;bito</option>
                  <option value="consignacion">Consignaci&oacute;n</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N&uacute;mero Comprobante</label>
                <input type="text" name="numero_comprobante_transaccion" value={formData.numero_comprobante_transaccion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco Origen</label>
                <input type="text" name="banco_origen" value={formData.banco_origen} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea name="notas" value={formData.notas} onChange={handleChange} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/facturacion/facturas"
              className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Cancelar
            </Link>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <><Banknote className="h-4 w-4" /> Registrar Pago</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
