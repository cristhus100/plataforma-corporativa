'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import { useToast } from '@/context/ToastContext'
import { eliminarTercero } from '@/actions/facturacion'
import { formatCOP } from '@/lib/utils/facturacion'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Shield,
  CreditCard,
  DollarSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

export default function TerceroDetallePage() {
  const { addToast } = useToast();
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { isAdmin } = useRole()
  const [tercero, setTercero] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (params.id) {
      cargarTercero()
    }
  }, [params.id])

  async function cargarTercero() {
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('terceros')
        .select('*')
        .eq('id', params.id)
        .single()

      if (err) throw err
      if (!data) throw new Error('Tercero no encontrado')
      setTercero(data)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message || 'Error al cargar el tercero')
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminar() {
    if (!tercero) return
    setDeleting(true)
    try {
      const res = await eliminarTercero(params.id)
      if (res.error) throw new Error(res.error)
      router.push('/facturacion/terceros')
    } catch (err) {
      addToast(err.message, { type: 'error' })
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const tipoLabels = {
    cliente: 'Cliente',
    proveedor: 'Proveedor',
    ambos: 'Ambos',
    otro: 'Otro',
  }

  const regimenLabels = {
    comun: 'Com&uacute;n',
    simplificado: 'Simplificado',
    no_responsable: 'No Responsable',
    gran_contribuyente: 'Gran Contribuyente',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando informaci&oacute;n...</p>
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
            <Link href="/facturacion/terceros" className="text-blue-600 hover:text-blue-700 underline text-sm">
              Volver al listado
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!tercero) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Tercero no encontrado</p>
          <Link href="/facturacion/terceros" className="text-blue-600 hover:text-blue-700 underline">
            Volver al listado
          </Link>
        </div>
      </div>
    )
  }

  const InfoCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-gray-500" />
        {title}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </div>
  )

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between gap-2">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 text-right">{value || '—'}</dd>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link href="/facturacion" className="hover:text-gray-900">Facturaci&oacute;n</Link>
          <span>/</span>
          <Link href="/facturacion/terceros" className="hover:text-gray-900">Terceros</Link>
          <span>/</span>
          <span className="text-gray-900">{tercero.nombre_comercial || tercero.nombre_completo}</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tercero.nombre_comercial || tercero.nombre_completo}</h1>
              <p className="text-sm text-gray-500">
                {tercero.tipo_documento} {tercero.numero_documento}
                {tercero.digito_verificacion ? ` - ${tercero.digito_verificacion}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              tercero.tipo_tercero === 'cliente' || tercero.tipo_tercero === 'ambos'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-orange-50 text-orange-700 border-orange-200'
            }`}>
              {tipoLabels[tercero.tipo_tercero] || tercero.tipo_tercero}
            </span>
            {isAdmin && (
              <Link
                href={`/facturacion/terceros/${params.id}/editar`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Datos B&aacute;sicos" icon={Building2}>
          <InfoRow label="Raz&oacute;n Social" value={tercero.nombre_completo} />
          <InfoRow label="Nombre Comercial" value={tercero.nombre_comercial} />
          <InfoRow label="Documento" value={`${tercero.tipo_documento} ${tercero.numero_documento}`} />
          <InfoRow label="DV" value={tercero.digito_verificacion} />
          <InfoRow label="Tipo" value={tipoLabels[tercero.tipo_tercero] || tercero.tipo_tercero} />
        </InfoCard>

        <InfoCard title="Contacto" icon={Phone}>
          <InfoRow label="Tel&eacute;fono" value={tercero.telefono} />
          <InfoRow label="Email" value={tercero.email} />
          <InfoRow label="Direcci&oacute;n" value={tercero.direccion} />
          <InfoRow label="Ciudad" value={tercero.ciudad} />
          <InfoRow label="Departamento" value={tercero.departamento} />
        </InfoCard>

        <InfoCard title="Configuraci&oacute;n Tributaria" icon={Shield}>
          <InfoRow label="R&eacute;gimen IVA" value={regimenLabels[tercero.regimen_iva] || tercero.regimen_iva} />
          <InfoRow label="Autorretenedor" value={tercero.autorretenedor ? 'S&iacute;' : 'No'} />
          <InfoRow label="Activo" value={
            tercero.activo
              ? <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> S&iacute;</span>
              : <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="h-3.5 w-3.5" /> No</span>
          } />
        </InfoCard>

        <InfoCard title="Condiciones Comerciales" icon={CreditCard}>
          <InfoRow label="Plazo Cr&eacute;dito" value={tercero.plazo_credito_dias ? `${tercero.plazo_credito_dias} d&iacute;as` : '—'} />
          <InfoRow label="Cupo Cr&eacute;dito" value={tercero.cupo_credito ? formatCOP(tercero.cupo_credito) : '—'} />
        </InfoCard>
      </div>

      {/* Delete Zone */}
      {isAdmin && (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Zona de Peligro</h2>
              <p className="text-sm text-gray-500">Desactivar este tercero permanentemente</p>
            </div>
          </div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar Tercero
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-800 font-medium">
                &iquest;Seguro de eliminar <strong>{tercero.nombre_completo}</strong>?
              </p>
              <p className="text-xs text-red-600">Se desactivar&aacute; el registro. Los datos hist&oacute;ricos se conservar&aacute;n.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleEliminar}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Eliminando...' : 'S&iacute;, eliminar'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
