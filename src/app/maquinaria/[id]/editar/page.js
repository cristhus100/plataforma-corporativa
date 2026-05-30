'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'

export default function EditarMaquinariaPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const { isAdmin, loading: roleLoading } = useRole()

  const [cargando, setCargando] = useState(true)

  // Redirect si no es admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/maquinaria');
    }
  }, [roleLoading, isAdmin, router]);

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>;
  if (!isAdmin) return null;
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [tiposMaquinaria, setTiposMaquinaria] = useState([])

  const [formData, setFormData] = useState({
    codigo_interno: '',
    nombre: '',
    tipo_maquinaria_id: '',
    marca: '',
    modelo: '',
    anio: '',
    numero_serie: '',
    numero_motor: '',
    numero_chasis: '',
    placa: '',
    estado: 'operativa',
    ubicacion_actual: '',
    horometro_actual: '',
    kilometraje_actual: '',
    fecha_adquisicion: '',
    valor_adquisicion: '',
    proveedor: '',
    observaciones: '',
  })

  const [openSections, setOpenSections] = useState({
    basica: true,
    tecnica: false,
    adquisicion: false,
    ubicacion: false,
    observaciones: false,
  })

  useEffect(() => {
    if (params.id) {
      cargarDatos()
    }
  }, [params.id])

  async function cargarDatos() {
    try {
      setCargando(true)

      // Cargar catálogos y datos en paralelo
      const [tiposRes, maqRes] = await Promise.all([
        supabase.from('tipos_maquinaria').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('maquinaria').select('*').eq('id', params.id).single(),
      ])

      if (tiposRes.error) throw tiposRes.error
      if (maqRes.error) throw maqRes.error

      setTiposMaquinaria(tiposRes.data || [])

      const m = maqRes.data

      // Mapear nombres de columnas DB a nombres del formulario
      setFormData({
        codigo_interno: m.codigo_interno || '',
        nombre: m.nombre || '',
        tipo_maquinaria_id: m.tipo_maquinaria_id ? String(m.tipo_maquinaria_id) : '',
        marca: m.marca || '',
        modelo: m.modelo || '',
        anio: m.anio ? String(m.anio) : '',
        numero_serie: m.numero_serie || m.serial || '',
        numero_motor: m.numero_motor || '',
        numero_chasis: m.numero_chasis || '',
        placa: m.placa || '',
        estado: m.estado || 'operativa',
        ubicacion_actual: m.ubicacion_actual || '',
        horometro_actual: m.horometro_actual || m.horometro || '',
        kilometraje_actual: m.kilometraje_actual || m.kilometraje || '',
        fecha_adquisicion: m.fecha_adquisicion || m.fecha_compra || '',
        valor_adquisicion: m.valor_adquisicion || m.valor_compra || '',
        proveedor: m.proveedor || '',
        observaciones: m.observaciones || '',
      })
    } catch (err) {
      console.error('Error cargando maquinaria:', err)
      setError('No se pudo cargar la información del equipo')
    } finally {
      setCargando(false)
    }
  }

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    try {
      const dataToUpdate = {
        ...formData,
        tipo_maquinaria_id: formData.tipo_maquinaria_id ? parseInt(formData.tipo_maquinaria_id) : null,
        anio: formData.anio ? parseInt(formData.anio) : null,
        horometro_actual: formData.horometro_actual ? parseFloat(formData.horometro_actual) : null,
        kilometraje_actual: formData.kilometraje_actual ? parseFloat(formData.kilometraje_actual) : null,
        valor_adquisicion: formData.valor_adquisicion ? parseFloat(formData.valor_adquisicion) : null,
        fecha_adquisicion: formData.fecha_adquisicion || null,
      }

      Object.keys(dataToUpdate).forEach((key) => {
        if (dataToUpdate[key] === '') dataToUpdate[key] = null
      })

      const { error: updateError } = await supabase
        .from('maquinaria')
        .update(dataToUpdate)
        .eq('id', params.id)

      if (updateError) throw updateError

      router.push(`/maquinaria/${params.id}`)
    } catch (err) {
      console.error('Error:', err)
      setError(err.message || 'Error al actualizar la maquinaria')
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/maquinaria" className="hover:text-gray-900">
            Maquinaria
          </Link>
          <span>/</span>
          <Link href={`/maquinaria/${params.id}`} className="hover:text-gray-900">
            Detalle
          </Link>
          <span>/</span>
          <span className="text-gray-900">Editar</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Maquinaria</h1>
        <p className="text-gray-600 mt-1">
          Actualiza la información del equipo
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600">⚠️</span>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* INFORMACIÓN BÁSICA */}
        <CollapsibleSection
          title="Información Básica"
          isOpen={openSections.basica}
          onToggle={() => toggleSection('basica')}
          required
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Código Interno"
              name="codigo_interno"
              value={formData.codigo_interno}
              onChange={handleChange}
              placeholder="Ej: MAQ-001"
              required
            />
            <FormField
              label="Nombre del Equipo"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Retroexcavadora CAT 420F"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Maquinaria <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_maquinaria_id"
                value={formData.tipo_maquinaria_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="">Seleccione un tipo</option>
                {tiposMaquinaria.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label="Marca"
              name="marca"
              value={formData.marca}
              onChange={handleChange}
              placeholder="Ej: Caterpillar"
            />
            <FormField
              label="Modelo"
              name="modelo"
              value={formData.modelo}
              onChange={handleChange}
              placeholder="Ej: 420F"
            />
            <FormField
              label="Año"
              name="anio"
              type="number"
              value={formData.anio}
              onChange={handleChange}
              placeholder="Ej: 2020"
              min="1950"
              max="2030"
            />
          </div>
        </CollapsibleSection>

        {/* ESPECIFICACIONES TÉCNICAS */}
        <CollapsibleSection
          title="Especificaciones Técnicas"
          isOpen={openSections.tecnica}
          onToggle={() => toggleSection('tecnica')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Número de Serie" name="numero_serie" value={formData.numero_serie} onChange={handleChange} />
            <FormField label="Número de Motor" name="numero_motor" value={formData.numero_motor} onChange={handleChange} />
            <FormField label="Número de Chasis" name="numero_chasis" value={formData.numero_chasis} onChange={handleChange} />
            <FormField label="Placa" name="placa" value={formData.placa} onChange={handleChange} placeholder="Ej: ABC123" />
            <FormField
              label="Horómetro Actual"
              name="horometro_actual"
              type="number"
              step="0.01"
              value={formData.horometro_actual}
              onChange={handleChange}
              placeholder="Horas"
            />
            <FormField
              label="Kilometraje Actual"
              name="kilometraje_actual"
              type="number"
              step="0.01"
              value={formData.kilometraje_actual}
              onChange={handleChange}
              placeholder="Km"
            />
          </div>
        </CollapsibleSection>

        {/* ADQUISICIÓN */}
        <CollapsibleSection
          title="Información de Adquisición"
          isOpen={openSections.adquisicion}
          onToggle={() => toggleSection('adquisicion')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Fecha de Adquisición"
              name="fecha_adquisicion"
              type="date"
              value={formData.fecha_adquisicion}
              onChange={handleChange}
            />
            <FormField
              label="Valor de Adquisición (COP)"
              name="valor_adquisicion"
              type="number"
              step="0.01"
              value={formData.valor_adquisicion}
              onChange={handleChange}
              placeholder="0"
            />
            <div className="md:col-span-2">
              <FormField
                label="Proveedor"
                name="proveedor"
                value={formData.proveedor}
                onChange={handleChange}
                placeholder="Nombre del proveedor"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* UBICACIÓN Y ESTADO */}
        <CollapsibleSection
          title="Ubicación y Estado"
          isOpen={openSections.ubicacion}
          onToggle={() => toggleSection('ubicacion')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="operativa">Operativa</option>
                <option value="en_mantenimiento">En Mantenimiento</option>
                <option value="en_reparacion">En Reparación</option>
                <option value="fuera_servicio">Fuera de Servicio</option>
                <option value="dada_de_baja">Dada de Baja</option>
              </select>
            </div>
            <FormField
              label="Ubicación Actual"
              name="ubicacion_actual"
              value={formData.ubicacion_actual}
              onChange={handleChange}
              placeholder="Ej: Obra La Calera"
            />
          </div>
        </CollapsibleSection>

        {/* OBSERVACIONES */}
        <CollapsibleSection
          title="Observaciones"
          isOpen={openSections.observaciones}
          onToggle={() => toggleSection('observaciones')}
        >
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Notas adicionales sobre el equipo..."
          />
        </CollapsibleSection>

        {/* BOTONES */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/maquinaria/${params.id}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {guardando ? (
              <>
                <span className="animate-spin">⌛</span>
                Guardando...
              </>
            ) : (
              <>Guardar Cambios</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

function CollapsibleSection({ title, isOpen, onToggle, required, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {title}
          {required && <span className="text-xs text-red-500 font-normal">(Obligatorio)</span>}
        </h2>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && <div className="px-6 pb-6 pt-2 border-t border-gray-100">{children}</div>}
    </div>
  )
}

function FormField({ label, name, type = 'text', value, onChange, placeholder, required, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        {...props}
      />
    </div>
  )
}
