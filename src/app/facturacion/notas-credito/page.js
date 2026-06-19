'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { crearNotaCredito } from '@/actions/facturacion'
import { useRole } from '@/context/RoleContext'
import { formatCOP } from '@/lib/utils/facturacion'
import {
  FileMinus,
  Search,
  Plus,
  Eye,
  XCircle,
  Loader2,
  Save,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function NotasCreditoPage() {
  const supabase = createClient()
  const { isAdmin } = useRole()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notas, setNotas] = useState([])
  const [search, setSearch] = useState('')

  // Form state for creating new NC
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [facturas, setFacturas] = useState([])
  const [tiposDocumento, setTiposDocumento] = useState([])
  const [formData, setFormData] = useState({
    factura_id: '',
    tipo_documento_id: '',
    motivo: '',
    subtotal: '',
    iva: '',
    total: '',
  })

  useEffect(() => {
    Promise.all([cargarNotas(), cargarCatalogos()])
  }, [])

  async function cargarNotas() {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('notas_credito')
        .select(`
          *,
          facturas!inner(id, numero_factura, total,
            terceros!inner(nombre_completo, nombre_comercial)
          )
        `)
        .order('created_at', { ascending: false })

      if (err) throw err
      setNotas(data || [])
    } catch (err) {
      console.error('Error:', err)
      try { addToast('Error al cargar las notas de crédito', { type: 'error' }) } catch(e) {}
      setError('Error al cargar las notas cr&eacute;dito')
    } finally {
      setLoading(false)
    }
  }

  async function cargarCatalogos() {
    try {
      const [facturasRes, tiposRes] = await Promise.all([
        supabase.from('facturas').select('id, numero_factura, total, estado, tercero_id')
          .not('estado', 'eq', 'anulada').order('numero_factura'),
        supabase.from('tipo_documentos_factura').select('id, nombre, prefijo')
          .eq('activo', true).eq('tipo', 'nota_credito').order('nombre'),
      ])
      if (facturasRes.data) setFacturas(facturasRes.data)
      if (tiposRes.data) setTiposDocumento(tiposRes.data)
    } catch (err) {
      console.error('Error catalogos:', err)
      try { addToast('Error al cargar catálogos', { type: 'error' }) } catch(e) {}
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Auto-fill when selecting a factura
    if (name === 'factura_id') {
      const factura = facturas.find(f => String(f.id) === value)
      if (factura) {
        setFormData(prev => ({
          ...prev,
          factura_id: value,
          subtotal: String(factura.total || 0),
          total: String(factura.total || 0),
        }))
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

    try {
      if (!formData.factura_id) throw new Error('Seleccione una factura')
      if (!formData.tipo_documento_id) throw new Error('Seleccione un tipo de documento')
      if (!formData.motivo?.trim()) throw new Error('Indique el motivo')

      const result = await crearNotaCredito({
        factura_id: Number(formData.factura_id),
        tipo_documento_id: Number(formData.tipo_documento_id),
        motivo: formData.motivo,
        subtotal: formData.subtotal || '0',
        iva: formData.iva || '0',
        total: formData.total || '0',
      })

      if (result.error) throw new Error(result.error)
      if (result.success) {
        setShowForm(false)
        setFormData({ factura_id: '', tipo_documento_id: '', motivo: '', subtotal: '', iva: '', total: '' })
        cargarNotas()
      }
    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const notasFiltradas = notas.filter(n => {
    if (!search) return true
    const term = search.toLowerCase()
    return (n.numero_nota || '').toLowerCase().includes(term) ||
           (n.facturas?.numero_factura || '').toLowerCase().includes(term) ||
           (n.facturas?.terceros?.nombre_comercial || '').toLowerCase().includes(term) ||
           (n.facturas?.terceros?.nombre_completo || '').toLowerCase().includes(term)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando notas cr&eacute;dito...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <XCircle className="mx-auto h-12 w-12 text-red-400 mb-2" />
            <p className="text-red-800 font-medium mb-2">{error}</p>
            <button onClick={cargarNotas}
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
            <span className="text-gray-900">Notas Cr&eacute;dito</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Notas Cr&eacute;dito</h1>
          <p className="text-sm text-gray-600">Documentos electr&oacute;nicos de Nota Cr&eacute;dito</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancelar' : 'Nueva NC'}
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear Nota Cr&eacute;dito</h2>
          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{formError}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Factura <span className="text-red-500">*</span></label>
              <select name="factura_id" value={formData.factura_id} onChange={handleFormChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione...</option>
                {facturas.map(f => (
                  <option key={f.id} value={f.id}>{f.numero_factura}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento <span className="text-red-500">*</span></label>
              <select name="tipo_documento_id" value={formData.tipo_documento_id} onChange={handleFormChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione...</option>
                {tiposDocumento.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.prefijo})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo <span className="text-red-500">*</span></label>
              <input type="text" name="motivo" value={formData.motivo} onChange={handleFormChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Devoluci&oacute;n de mercanc&iacute;a, descuento..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input type="number" name="subtotal" step="100" value={formData.subtotal} onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
              <input type="number" name="iva" step="100" value={formData.iva} onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <button type="submit" disabled={formLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {formLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creando...</> : <><Save className="h-4 w-4" /> Crear NC</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por n&uacute;mero, factura o cliente..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {notasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <FileMinus className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {notas.length === 0 ? 'No hay notas cr&eacute;dito registradas' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {notas.length === 0 ? 'Las notas cr&eacute;dito aparecer&aacute;n aqu&iacute; una vez creadas desde una factura.' : 'Intenta ajustar la b&uacute;squeda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">N&uacute;mero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Motivo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {notasFiltradas.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{n.numero_nota}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{n.facturas?.numero_factura || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{n.motivo || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-gray-900">{formatCOP(n.total)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('es-CO') : '—'}
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
