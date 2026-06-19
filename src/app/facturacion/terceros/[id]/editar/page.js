'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { actualizarTercero } from '@/actions/facturacion'
import { useRole } from '@/context/RoleContext'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function EditarTerceroPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const { isAdmin, loading: roleLoading } = useRole()
  const { addToast } = useToast()
  const [cargando, setCargando] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    tipo_documento: 'NIT',
    numero_documento: '',
    digito_verificacion: '',
    nombre_completo: '',
    nombre_comercial: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    telefono: '',
    email: '',
    regimen_iva: 'comun',
    tipo_tercero: 'cliente',
    plazo_credito_dias: '30',
    cupo_credito: '0',
    autorretenedor: false,
  })

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/facturacion/terceros')
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
      const { data, error: err } = await supabase
        .from('terceros')
        .select('*')
        .eq('id', params.id)
        .single()
      if (err) throw err
      if (!data) throw new Error('Tercero no encontrado')

      setFormData({
        tipo_documento: data.tipo_documento || 'NIT',
        numero_documento: data.numero_documento || '',
        digito_verificacion: data.digito_verificacion ? String(data.digito_verificacion) : '',
        nombre_completo: data.nombre_completo || '',
        nombre_comercial: data.nombre_comercial || '',
        direccion: data.direccion || '',
        ciudad: data.ciudad || '',
        departamento: data.departamento || '',
        telefono: data.telefono || '',
        email: data.email || '',
        regimen_iva: data.regimen_iva || 'comun',
        tipo_tercero: data.tipo_tercero || 'cliente',
        plazo_credito_dias: data.plazo_credito_dias ? String(data.plazo_credito_dias) : '30',
        cupo_credito: data.cupo_credito ? String(data.cupo_credito) : '0',
        autorretenedor: data.autorretenedor || false,
      })
    } catch (err) {
      console.error('Error:', err)
      try { addToast('Error al cargar datos del tercero', { type: 'error' }) } catch(e) {}
      setError(err.message || 'Error al cargar el tercero')
    } finally {
      setCargando(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await actualizarTercero(params.id, formData)
      if (result.error) throw new Error(result.error)
      if (result.success) router.push(`/facturacion/terceros/${params.id}`)
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
          <p className="text-gray-600">Cargando informaci&oacute;n...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
          <span>/</span>
          <Link href="/facturacion/terceros" className="hover:text-gray-900">Terceros</Link>
          <span>/</span>
          <Link href={`/facturacion/terceros/${params.id}`} className="hover:text-gray-900">Detalle</Link>
          <span>/</span>
          <span className="text-gray-900">Editar</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Tercero</h1>
        <p className="text-sm text-gray-600 mt-1">Actualiza la informaci&oacute;n del tercero</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Info Basica */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informaci&oacute;n B&aacute;sica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Documento</label>
              <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="NIT">NIT</option>
                <option value="CC">C&eacute;dula Ciudadan&iacute;a</option>
                <option value="CE">C&eacute;dula Extranjer&iacute;a</option>
                <option value="TI">Tarjeta Identidad</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N&uacute;mero Documento</label>
              <input type="text" name="numero_documento" value={formData.numero_documento} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DV</label>
              <input type="number" name="digito_verificacion" value={formData.digito_verificacion} onChange={handleChange} min="0" max="9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
              <input type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
              <input type="text" name="nombre_comercial" value={formData.nombre_comercial} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contacto y Direcci&oacute;n</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Direcci&oacute;n</label>
              <input type="text" name="direccion" value={formData.direccion} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <input type="text" name="departamento" value={formData.departamento} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tel&eacute;fono</label>
              <input type="text" name="telefono" value={formData.telefono} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
          </div>
        </div>

        {/* Config Comercial */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuraci&oacute;n Comercial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">R&eacute;gimen IVA</label>
              <select name="regimen_iva" value={formData.regimen_iva} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="comun">Com&uacute;n</option>
                <option value="simplificado">Simplificado</option>
                <option value="no_responsable">No Responsable</option>
                <option value="gran_contribuyente">Gran Contribuyente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Tercero</label>
              <select name="tipo_tercero" value={formData.tipo_tercero} onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                <option value="cliente">Cliente</option>
                <option value="proveedor">Proveedor</option>
                <option value="ambos">Ambos</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plazo Cr&eacute;dito (d&iacute;as)</label>
              <input type="number" name="plazo_credito_dias" value={formData.plazo_credito_dias} onChange={handleChange} min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cupo Cr&eacute;dito ($)</label>
              <input type="number" name="cupo_credito" value={formData.cupo_credito} onChange={handleChange} min="0" step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="autorretenedor" checked={formData.autorretenedor} onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-medium text-gray-700">Autorretenedor</span>
              </label>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/facturacion/terceros/${params.id}`}
            className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </Link>
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
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
