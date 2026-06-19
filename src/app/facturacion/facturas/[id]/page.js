'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import { useToast } from '@/context/ToastContext'
import { anularFactura, registrarPago, crearNotaCredito, crearNotaDebito } from '@/actions/facturacion'
import { formatCOP, getEstadoFacturaLabel, getEstadoFacturaColor } from '@/lib/utils/facturacion'
import {
  ArrowLeft,
  Pencil,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Ban,
  FileMinus,
  FilePlus,
  CheckCircle2,
  XCircle,
  Banknote,
  Loader2,
} from 'lucide-react'

export default function FacturaDetallePage() {
  const { addToast } = useToast();
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin } = useRole()
  const [factura, setFactura] = useState(null)
  const [items, setItems] = useState([])
  const [recibos, setRecibos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [accion, setAccion] = useState(null) // pago, anular, nota-credito, nota-debito
  const [accionLoading, setAccionLoading] = useState(false)

  // Form states
  const [pagoForm, setPagoForm] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    valor_pagado: '',
    forma_pago: 'transferencia',
    numero_comprobante_transaccion: '',
    banco_origen: '',
    notas: '',
  })
  const [anularMotivo, setAnularMotivo] = useState('')
  const [notaForm, setNotaForm] = useState({
    tipo_documento_id: '',
    motivo: '',
    subtotal: '',
    iva: '',
    total: '',
  })
  const [tiposDocumentoNC, setTiposDocumentoNC] = useState([])
  const [tiposDocumentoND, setTiposDocumentoND] = useState([])

  useEffect(() => {
    if (params.id) cargarFactura()
  }, [params.id])

  async function cargarFactura() {
    try {
      setLoading(true)
      setError(null)

      const [facturaRes, itemsRes, recibosRes, tiposNCRes, tiposNDRes] = await Promise.all([
        supabase.from('facturas').select(`
          *,
          terceros!inner(id, nombre_completo, nombre_comercial, tipo_documento, numero_documento, telefono, email, direccion, ciudad),
          tipo_documentos_factura!inner(id, nombre, prefijo)
        `).eq('id', params.id).single(),
        supabase.from('items_factura').select('*').eq('factura_id', params.id).order('id'),
        supabase.from('recibos_caja').select('*').eq('factura_id', params.id).order('fecha_pago', { ascending: false }),
        supabase.from('tipo_documentos_factura').select('id, nombre, prefijo').eq('activo', true).eq('tipo', 'nota_credito').order('nombre'),
        supabase.from('tipo_documentos_factura').select('id, nombre, prefijo').eq('activo', true).eq('tipo', 'nota_debito').order('nombre'),
      ])

      if (facturaRes.error) throw facturaRes.error
      if (!facturaRes.data) throw new Error('Factura no encontrada')

      setFactura(facturaRes.data)
      setItems(itemsRes.data || [])
      setRecibos(recibosRes.data || [])
      setTiposDocumentoNC(tiposNCRes.data || [])
      setTiposDocumentoND(tiposNDRes.data || [])

      // Pre-fill pago form
      const pendiente = Number(facturaRes.data.total) || 0
      setPagoForm(prev => ({ ...prev, valor_pagado: String(pendiente) }))

      // Pre-fill nota form
      setNotaForm(prev => ({
        ...prev,
        subtotal: String(facturaRes.data.subtotal || 0),
        iva: String(facturaRes.data.iva || 0),
        total: String(facturaRes.data.total || 0),
      }))
    } catch (err) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar la factura')
    } finally {
      setLoading(false)
    }
  }

  async function handlePagar(e) {
    e.preventDefault()
    setAccionLoading(true)
    try {
      const result = await registrarPago({ ...pagoForm, factura_id: params.id })
      if (result.error) throw new Error(result.error)
      setAccion(null)
      cargarFactura()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setAccionLoading(false)
    }
  }

  async function handleAnular() {
    if (!anularMotivo.trim()) return addToast('Indique el motivo de anulación', { type: 'warning' })
    setAccionLoading(true)
    try {
      const result = await anularFactura(params.id, anularMotivo)
      if (result.error) throw new Error(result.error)
      setAccion(null)
      setAnularMotivo('')
      cargarFactura()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setAccionLoading(false)
    }
  }

  async function handleCrearNotaCredito(e) {
    e.preventDefault()
    setAccionLoading(true)
    try {
      const result = await crearNotaCredito({
        factura_id: params.id,
        tipo_documento_id: notaForm.tipo_documento_id,
        motivo: notaForm.motivo,
        subtotal: notaForm.subtotal,
        iva: notaForm.iva,
        total: notaForm.total,
      })
      if (result.error) throw new Error(result.error)
      setAccion(null)
      cargarFactura()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setAccionLoading(false)
    }
  }

  async function handleCrearNotaDebito(e) {
    e.preventDefault()
    setAccionLoading(true)
    try {
      const result = await crearNotaDebito({
        factura_id: params.id,
        tipo_documento_id: notaForm.tipo_documento_id,
        motivo: notaForm.motivo,
        subtotal: notaForm.subtotal,
        iva: notaForm.iva,
        total: notaForm.total,
      })
      if (result.error) throw new Error(result.error)
      setAccion(null)
      cargarFactura()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setAccionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando factura...</p>
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
            <Link href="/facturacion/facturas" className="text-blue-600 hover:text-blue-700 underline text-sm">Volver al listado</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!factura) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p className="text-gray-600 mb-4">Factura no encontrada</p>
          <Link href="/facturacion/facturas" className="text-blue-600 hover:text-blue-700 underline">Volver al listado</Link>
        </div>
      </div>
    )
  }

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value || '—'}</dd>
    </div>
  )

  const saldoPendiente = Number(factura.total) - (recibos.reduce((s, r) => s + Number(r.valor_aplicado || r.valor_pagado || 0), 0))
  const esEditable = factura.estado !== 'anulada' && factura.estado !== 'pagada'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
          <span>/</span>
          <Link href="/facturacion/facturas" className="hover:text-gray-900">Facturas</Link>
          <span>/</span>
          <span className="text-gray-900">{factura.numero_factura}</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{factura.numero_factura}</h1>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getEstadoFacturaColor(factura.estado)}`}>
                {getEstadoFacturaLabel(factura.estado)}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {factura.tipo_documentos_factura?.nombre} &mdash; {factura.terceros?.nombre_comercial || factura.terceros?.nombre_completo}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && esEditable && (
              <>
                <button onClick={() => setAccion('pago')}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition">
                  <Banknote className="h-4 w-4" /> Registrar Pago
                </button>
                <button onClick={() => setAccion('nota-credito')}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition">
                  <FileMinus className="h-4 w-4" /> NC
                </button>
                <button onClick={() => setAccion('nota-debito')}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-orange-300 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-50 transition">
                  <FilePlus className="h-4 w-4" /> ND
                </button>
                <button onClick={() => setAccion('anular')}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition">
                  <Ban className="h-4 w-4" /> Anular
                </button>
                <Link href={`/facturacion/facturas/${params.id}/editar`}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                  <Pencil className="h-4 w-4" /> Editar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action modals */}
      {accion === 'pago' && (
        <div className="bg-white rounded-lg border border-green-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Pago</h3>
          <form onSubmit={handlePagar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Pago</label>
              <input type="date" value={pagoForm.fecha_pago}
                onChange={(e) => setPagoForm(prev => ({ ...prev, fecha_pago: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Aplicado</label>
              <input type="number" min="0" step="100" value={pagoForm.valor_pagado}
                onChange={(e) => setPagoForm(prev => ({ ...prev, valor_pagado: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pago</label>
              <select value={pagoForm.forma_pago}
                onChange={(e) => setPagoForm(prev => ({ ...prev, forma_pago: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta_credito">Tarjeta Cr&eacute;dito</option>
                <option value="tarjeta_debito">Tarjeta D&eacute;bito</option>
                <option value="consignacion">Consignaci&oacute;n</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante / Ref</label>
              <input type="text" value={pagoForm.numero_comprobante_transaccion}
                onChange={(e) => setPagoForm(prev => ({ ...prev, numero_comprobante_transaccion: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banco Origen</label>
              <input type="text" value={pagoForm.banco_origen}
                onChange={(e) => setPagoForm(prev => ({ ...prev, banco_origen: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={pagoForm.notas}
                onChange={(e) => setPagoForm(prev => ({ ...prev, notas: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-2">
              <button type="submit" disabled={accionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {accionLoading ? <><Loader2 className="h-4 w-4 animate-spin inline" /> Procesando...</> : 'Confirmar Pago'}
              </button>
              <button type="button" onClick={() => setAccion(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {accion === 'anular' && (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Anular Factura</h3>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Motivo de anulaci&oacute;n</label>
            <textarea value={anularMotivo} onChange={(e) => setAnularMotivo(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Indique el motivo..." />
            <div className="flex items-center gap-2">
              <button onClick={handleAnular} disabled={accionLoading || !anularMotivo.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {accionLoading ? 'Anulando...' : 'Confirmar Anulaci&oacute;n'}
              </button>
              <button onClick={() => setAccion(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {(accion === 'nota-credito' || accion === 'nota-debito') && (
        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {accion === 'nota-credito' ? 'Crear Nota Cr&eacute;dito' : 'Crear Nota D&eacute;bito'}
          </h3>
          <form onSubmit={accion === 'nota-credito' ? handleCrearNotaCredito : handleCrearNotaDebito}
            className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
              <select value={notaForm.tipo_documento_id}
                onChange={(e) => setNotaForm(prev => ({ ...prev, tipo_documento_id: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccione...</option>
                {(accion === 'nota-credito' ? tiposDocumentoNC : tiposDocumentoND).map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.prefijo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input type="text" value={notaForm.motivo}
                onChange={(e) => setNotaForm(prev => ({ ...prev, motivo: e.target.value }))} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
              <input type="number" step="100" value={notaForm.subtotal}
                onChange={(e) => setNotaForm(prev => ({ ...prev, subtotal: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
              <input type="number" step="100" value={notaForm.iva}
                onChange={(e) => setNotaForm(prev => ({ ...prev, iva: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <button type="submit" disabled={accionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {accionLoading ? 'Creando...' : 'Crear Nota'}
              </button>
              <button type="button" onClick={() => setAccion(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Invoice Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-gray-500" /> Informaci&oacute;n Factura
          </h3>
          <dl>
            <InfoRow label="N&uacute;mero" value={factura.numero_factura} />
            <InfoRow label="Prefijo" value={factura.prefijo} />
            <InfoRow label="Consecutivo" value={factura.consecutivo} />
            <InfoRow label="Fecha Emisi&oacute;n" value={factura.fecha_emision ? new Date(factura.fecha_emision + 'T12:00:00').toLocaleDateString('es-CO') : '—'} />
            <InfoRow label="Fecha Vencimiento" value={factura.fecha_vencimiento ? new Date(factura.fecha_vencimiento + 'T12:00:00').toLocaleDateString('es-CO') : '—'} />
            <InfoRow label="Estado" value={<span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEstadoFacturaColor(factura.estado)}`}>{getEstadoFacturaLabel(factura.estado)}</span>} />
            <InfoRow label="Orden Servicio" value={factura.orden_servicio || '—'} />
          </dl>
        </div>

        {/* Client Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-gray-500" /> Cliente
          </h3>
          <dl>
            <InfoRow label="Nombre" value={factura.terceros?.nombre_comercial || factura.terceros?.nombre_completo} />
            <InfoRow label="Documento" value={`${factura.terceros?.tipo_documento} ${factura.terceros?.numero_documento}`} />
            <InfoRow label="Tel&eacute;fono" value={factura.terceros?.telefono} />
            <InfoRow label="Email" value={factura.terceros?.email} />
            <InfoRow label="Direcci&oacute;n" value={factura.terceros?.direccion} />
            <InfoRow label="Ciudad" value={factura.terceros?.ciudad} />
          </dl>
        </div>

        {/* Totals */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <DollarSign className="h-4 w-4 text-gray-500" /> Valores
          </h3>
          <dl>
            <InfoRow label="Subtotal" value={formatCOP(factura.subtotal)} />
            <InfoRow label="Base IVA" value={formatCOP(factura.base_iva)} />
            <InfoRow label="IVA" value={formatCOP(factura.iva)} />
            <InfoRow label="Total" value={<span className="font-bold text-lg">{formatCOP(factura.total)}</span>} />
            <InfoRow label="Saldo Pendiente" value={<span className={`font-semibold ${saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCOP(saldoPendiente)}</span>} />
          </dl>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Items de la Factura</h3>
        </div>
        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No hay items registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">C&oacute;digo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Descripci&oacute;n</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Cant.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Und</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Vr. Unitario</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">IVA %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">IVA Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => {
                  const subt = (Number(item.cantidad) || 0) * (Number(item.valor_unitario) || 0)
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-700">{item.codigo_item || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.descripcion}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{item.cantidad}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{item.unidad}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(item.valor_unitario)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{item.porcentaje_iva}%</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{formatCOP(item.iva_item)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCOP(subt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recibos */}
      {recibos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Recibos / Pagos ({recibos.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Recibo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Forma Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recibos.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{r.numero_recibo}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.fecha_pago ? new Date(r.fecha_pago + 'T12:00:00').toLocaleDateString('es-CO') : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCOP(r.valor_pagado)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.forma_pago}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.numero_comprobante_transaccion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
