'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NuevaMaquinariaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tiposMaquinaria, setTiposMaquinaria] = useState([])
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)

  const [openSections, setOpenSections] = useState({
    foto: true,
    basica: true,
    tecnica: false,
    adquisicion: false,
    ubicacion: false,
    observaciones: false,
  })

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
    estado: 'operativa', // ✅ minúscula
    ubicacion_actual: '',
    horometro_actual: '',
    kilometraje_actual: '',
    fecha_adquisicion: '',
    valor_adquisicion: '',
    proveedor: '',
    observaciones: '',
  })

  useEffect(() => {
    async function fetchTipos() {
      const { data, error } = await supabase
        .from('tipos_maquinaria')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      if (!error) setTiposMaquinaria(data || [])
    }
    fetchTipos()
  }, [])

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no puede superar 5MB')
      return
    }

    setFotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setFotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const uploadFoto = async (codigoInterno) => {
    if (!fotoFile) return null

    const fileExt = fotoFile.name.split('.').pop()
    const fileName = `${codigoInterno}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('fotos-maquinaria')
      .upload(filePath, fotoFile, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('fotos-maquinaria')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.codigo_interno || !formData.nombre || !formData.tipo_maquinaria_id) {
        throw new Error('Código interno, nombre y tipo son obligatorios')
      }

      let fotoUrl = null
      if (fotoFile) {
        fotoUrl = await uploadFoto(formData.codigo_interno)
      }

      const dataToInsert = {
        ...formData,
        tipo_maquinaria_id: parseInt(formData.tipo_maquinaria_id),
        anio: formData.anio ? parseInt(formData.anio) : null,
        horometro_actual: formData.horometro_actual ? parseFloat(formData.horometro_actual) : null,
        kilometraje_actual: formData.kilometraje_actual ? parseFloat(formData.kilometraje_actual) : null,
        valor_adquisicion: formData.valor_adquisicion ? parseFloat(formData.valor_adquisicion) : null,
        fecha_adquisicion: formData.fecha_adquisicion || null,
        foto_url: fotoUrl,
        activo: true,
      }

      Object.keys(dataToInsert).forEach((key) => {
        if (dataToInsert[key] === '') dataToInsert[key] = null
      })

      // 🔍 DEBUG: Ver exactamente qué se envía
      console.log('📦 Payload a insertar:', JSON.stringify(dataToInsert, null, 2))
      console.log('🎯 Estado enviado:', dataToInsert.estado)

      const { data, error: insertError } = await supabase
        .from('maquinaria')
        .insert([dataToInsert])
        .select()

      if (insertError) {
        console.error('❌ Error completo:', insertError)
        throw insertError
      }

      console.log('✅ Insertado correctamente:', data)
      router.push('/maquinaria')
    } catch (err) {
      console.error('Error:', err)
      setError(err.message || 'Error al crear la maquinaria')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/maquinaria" className="hover:text-gray-900">
            Maquinaria
          </Link>
          <span>/</span>
          <span className="text-gray-900">Nueva</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Registrar Nueva Maquinaria</h1>
        <p className="text-gray-600 mt-1">
          Complete la información del equipo. Los campos marcados con * son obligatorios.
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
        {/* FOTO */}
        <CollapsibleSection
          title="📸 Foto del Equipo"
          isOpen={openSections.foto}
          onToggle={() => toggleSection('foto')}
        >
          <div className="flex flex-col items-center gap-4">
            {fotoPreview ? (
              <div className="relative">
                <img
                  src={fotoPreview}
                  alt="Preview"
                  className="w-64 h-64 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFotoFile(null)
                    setFotoPreview(null)
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
                <span className="text-5xl mb-2">📷</span>
                <span className="text-sm">Sin foto</span>
              </div>
            )}
            <label className="cursor-pointer bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
              {fotoPreview ? 'Cambiar foto' : 'Seleccionar foto'}
              <input
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500">Formatos: JPG, PNG. Máx 5MB</p>
          </div>
        </CollapsibleSection>

        {/* INFORMACIÓN BÁSICA */}
        <CollapsibleSection
          title="🔧 Información Básica"
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
          title="⚙️ Especificaciones Técnicas"
          isOpen={openSections.tecnica}
          onToggle={() => toggleSection('tecnica')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Número de Serie"
              name="numero_serie"
              value={formData.numero_serie}
              onChange={handleChange}
            />
            <FormField
              label="Número de Motor"
              name="numero_motor"
              value={formData.numero_motor}
              onChange={handleChange}
            />
            <FormField
              label="Número de Chasis"
              name="numero_chasis"
              value={formData.numero_chasis}
              onChange={handleChange}
            />
            <FormField
              label="Placa"
              name="placa"
              value={formData.placa}
              onChange={handleChange}
              placeholder="Ej: ABC123"
            />
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
          title="📅 Información de Adquisición"
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
          title="📍 Ubicación y Estado"
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
          title="📝 Observaciones"
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
            href="/maquinaria"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Guardando...
              </>
            ) : (
              <>💾 Guardar Maquinaria</>
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
