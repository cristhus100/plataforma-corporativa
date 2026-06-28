'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import { formatCOP } from '@/lib/utils/facturacion'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function EditarFacturaPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const { isAdmin, loading: roleLoading } = useRole()
  const { addToast } = useToast()
  const [cargando, setCargando] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [terceros, setTerceros] = useState([])
  const [tiposDocumento, setTiposDocumento] = useState([])

  const [formData, setFormData] = useState({
    tipo_documento_id: '',
    tercero_id: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    notas: '',
    orden_servicio: '',
  })

  const [items, setItems] = useState([])

  const API_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/facturacion/facturas')
    }
  }, [roleLoading, isAdmin, router])

  useEffect(() => {
    if (params.id) cargarDatos()
  }, [params.id])

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>
  if (!isAdmin) return null

  async function cargarDatos() {
    try {
      setCargando(true)
      const [tercerosRes, tiposRes, facturaRes, itemsRes] = await Promise.all([
        supabase.from('terceros').select('id, nombre_completo, nombre_comercial')
          .eq('activo', true).in('tipo_tercero', ['cliente', 'ambos']).order('nombre_completo'),
        supabase.from('tipo_documentos_factura').select('id, nombre, prefijo')
          .eq('activo', true).order('nombre'),
        supabase.from('facturas').select('*').eq('id', params.id).single(),
        supabase.from('items_factura').select('*').eq('factura_id', params.id).order('id'),
      ])

      if (facturaRes.error) throw facturaRes.error
      if (!facturaRes.data) throw new Error('Factura no encontrada')

      setTerceros(tercerosRes.data || [])
      setTiposDocumento(tiposRes.data || [])

      const f = facturaRes.data
      setFormData({
        tipo_documento_id: String(f.tipo_documento_id || ''),
        tercero_id: String(f.tercero_id || ''),
        fecha_emision: f.fecha_emision || '',
        fecha_vencimiento: f.fecha_vencimiento || '',
        notas: f.notas || '',
        orden_servicio: f.orden_servicio || '',
      })

      setItems((itemsRes.data || []).map(item => ({
        id: item.id,
        codigo_item: item.codigo_item || '',
        descripcion: item.descripcion || '',
        cantidad: Number(item.cantidad) || 1,
        unidad: item.unidad || 'UNIDAD',
        valor_unitario: Number(item.valor_unitario) || 0,
        porcentaje_iva: Number(item.porcentaje_iva) || 0,
      })))
    } catch (err) {
      console.error('Error:', err)
      addToast('Error al cargar la factura', { type: 'error' })
      setError(err.message || 'Error al cargar la factura')
    } finally {
      setCargando(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: ['cantidad', 'valor_unitario', 'porcentaje_iva'].includes(field) ? Number(value) || 0 : value,
      }
      return updated
    })
  }

  const addItem = () => {
    setItems(prev => [...prev, { descripcion: '', cantidad: 1, unidad: 'UNIDAD', valor_unitario: 0, porcentaje_iva: 19, codigo_item: '' }])
  }

  const removeItem = (index) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const calculos = items.reduce((acc, item) => {
    const subt = (Number(item.cantidad) || 0) * (Number(item.valor_unitario) || 0)
    const iva = subt * ((Number(item.porcentaje_iva) || 0) / 100)
    return { subtotal: acc.subtotal + subt, iva: acc.iva + iva }
  }, { subtotal: 0, iva: 0 })
  const total = calculos.subtotal + calculos.iva

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.tercero_id) throw new Error('Seleccione un cliente')
      const validItems = items.filter(item => item.descripcion?.trim())
      if (validItems.length === 0) throw new Error('Agregue al menos un item con descripci&oacute;n')

      // Actualizar la factura
      const { error: errFact } = await supabase
        .from('facturas')
        .update({
          tercero_id: Number(formData.tercero_id),
          fecha_emision: formData.fecha_emision,
          fecha_vencimiento: formData.fecha_vencimiento || null,
          notas: formData.notas || null,
          orden_servicio: formData.orden_servicio || null,
          subtotal: Math.round(calculos.subtotal * 100) / 100,
          iva: Math.round(calculos.iva * 100) / 100,
          total: Math.round(total * 100) / 100,
        })
        .eq('id', params.id)

      if (errFact) throw errFact

      // Eliminar items existentes y recrearlos
      await supabase.from('items_factura').delete().eq('factura_id', params.id)

      const itemsToInsert = validItems.map(item => ({
        factura_id: Number(params.id),
        codigo_item: item.codigo_item || null,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad) || 1,
        unidad: item.unidad || 'UNIDAD',
        valor_unitario: Number(item.valor_unitario) || 0,
        porcentaje_iva: Number(item.porcentaje_iva) || 0,
        iva_item: Math.round(
          (Number(item.cantidad || 1) * Number(item.valor_unitario || 0)) *
          (Number(item.porcentaje_iva || 0) / 100) * 100
        ) / 100,
      }))

      const { error: errItems } = await supabase
        .from('items_factura')
        .insert(itemsToInsert)

      if (errItems) throw errItems

      router.push(`/facturacion/facturas/${params.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando factura...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
          <span>/</span>
          <Link href="/facturacion/facturas" className="hover:text-gray-900">Facturas</Link>
          <span>/</span>
          <Link href={`/facturacion/facturas/${params.id}`} className="hover:text-gray-900">Detalle</Link>
          <span>/</span>
          <span className="text-gray-900">Editar</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Factura</h1>
        <p className="text-sm text-gray-600 mt-1">Actualiza la informaci&oacute;n de la factura</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Encabezado */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Encabezado</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
              <select name="tipo_documento_id" value={formData.tipo_documento_id} onChange={handleChange} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed">
                <option value="">Seleccione...</option>
                {tiposDocumento.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.prefijo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente <span className="text-red-500">*</span></label>
              <select name="tercero_id" value={formData.tercero_id} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione...</option>
                {terceros.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_comercial || t.nombre_completo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden Servicio</label>
              <input type="text" name="orden_servicio" value={formData.orden_servicio} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisi&oacute;n <span className="text-red-500">*</span></label>
              <input type="date" name="fecha_emision" value={formData.fecha_emision} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
              <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea name="notas" value={formData.notas} onChange={handleChange} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Plus className="h-3.5 w-3.5" /> Agregar Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">C&oacute;digo</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Descripci&oacute;n</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">Cant.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">Und</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">Vr. Unitario</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">IVA %</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">Subtotal</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item, idx) => {
                  const subt = (Number(item.cantidad) || 0) * (Number(item.valor_unitario) || 0)
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input type="text" value={item.codigo_item}
                          onChange={(e) => handleItemChange(idx, 'codigo_item', e.target.value)}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.descripcion}
                          onChange={(e) => handleItemChange(idx, 'descripcion', e.target.value)} required
                          className="w-full min-w-[200px] px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Descripci&oacute;n del item..." />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="1" value={item.cantidad}
                          onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.unidad}
                          onChange={(e) => handleItemChange(idx, 'unidad', e.target.value)}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="100" value={item.valor_unitario}
                          onChange={(e) => handleItemChange(idx, 'valor_unitario', e.target.value)}
                          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" max="100" value={item.porcentaje_iva}
                          onChange={(e) => handleItemChange(idx, 'porcentaje_iva', e.target.value)}
                          className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </td>
                      <td className="px-3 py-2 text-sm font-medium text-right text-gray-900">{formatCOP(subt)}</td>
                      <td className="px-3 py-2 text-right">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4">
            <div className="flex justify-end">
              <dl className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">Subtotal:</dt>
                  <dd className="font-medium text-gray-900">{formatCOP(calculos.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600">IVA:</dt>
                  <dd className="font-medium text-gray-900">{formatCOP(calculos.iva)}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                  <dt className="text-gray-900">Total:</dt>
                  <dd className="text-gray-900">{formatCOP(total)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/facturacion/facturas/${params.id}`}
            className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" /> Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-4 w-4" /> Guardar Cambios</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
