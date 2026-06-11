'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'

export default function NuevaOrdenPage() {
  const supabase = createClient()
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRole()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [maquinaria, setMaquinaria] = useState([])
  const [vehiculos, setVehiculos] = useState([])
  const [frentes, setFrentes] = useState([])
  const [trabajadores, setTrabajadores] = useState([])

  // Redirect si no es admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/mantenimiento/ordenes');
    }
  }, [roleLoading, isAdmin, router]);

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>;
  if (!isAdmin) return null;

  const [openSections, setOpenSections] = useState({
    basica: true,
    equipo: true,
    programacion: false,
    costos: false,
    observaciones: false,
  });

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'preventivo',
    prioridad: 'media',
    maquinaria_id: '',
    vehiculo_id: '',
    frente_trabajo_id: '',
    responsable_id: '',
    fecha_programada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fecha_inicio: '',
    fecha_fin: '',
    horometro_actual: '',
    costo_estimado: '',
    costo_real: '',
    observaciones: '',
  });

  useEffect(() => {
    cargarCatalogos();
  }, []);

  // Cuando cambia maquinaria, auto-asignar horómetro actual desde la máquina
  useEffect(() => {
    if (form.maquinaria_id && maquinaria.length > 0) {
      const maq = maquinaria.find(m => String(m.id) === String(form.maquinaria_id));
      if (maq && maq.horometro_actual) {
        setForm(prev => ({ ...prev, horometro_actual: maq.horometro_actual }));
      }
    }
  }, [form.maquinaria_id, maquinaria]);

  // Cuando cambia maquinaria o vehículo, auto-asignar frente de trabajo
  useEffect(() => {
    let frenteId = '';

    if (form.maquinaria_id && maquinaria.length > 0) {
      const maq = maquinaria.find(m => String(m.id) === String(form.maquinaria_id));
      if (maq?.frente_trabajo_id) frenteId = maq.frente_trabajo_id;
    } else if (form.vehiculo_id && vehiculos.length > 0) {
      const veh = vehiculos.find(v => String(v.id) === String(form.vehiculo_id));
      if (veh?.frente_trabajo_id) frenteId = veh.frente_trabajo_id;
    }

    if (frenteId) {
      setForm(prev => ({ ...prev, frente_trabajo_id: frenteId }));
    }
  }, [form.maquinaria_id, form.vehiculo_id, maquinaria, vehiculos]);

  const cargarCatalogos = async () => {
    const [maqRes, vehRes, frentesRes, trabRes] = await Promise.all([
      supabase.from('maquinaria').select('id, codigo_interno, nombre, horometro_actual, frente_trabajo_id').eq('activo', true).order('codigo_interno'),
      supabase.from('vehiculos').select('id, nombre, placa, frente_trabajo_id').eq('activo', true).order('nombre'),
      supabase.from('frentes_trabajo').select('id, codigo, nombre').eq('activo', true).order('nombre'),
      supabase.from('trabajadores').select('id, cedula, nombre, primer_apellido').eq('activo', true).order('primer_apellido'),
    ]);

    if (!maqRes.error) setMaquinaria(maqRes.data || []);
    if (!vehRes.error) setVehiculos(vehRes.data || []);
    if (!frentesRes.error) setFrentes(frentesRes.data || []);
    if (!trabRes.error) setTrabajadores(trabRes.data || []);
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.titulo || !form.fecha_programada) {
        throw new Error('Título y fecha programada son obligatorios');
      }

      const dataToInsert = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        tipo: form.tipo,
        prioridad: form.prioridad,
        estado: 'pendiente',
        maquinaria_id: form.maquinaria_id ? parseInt(form.maquinaria_id) : null,
        vehiculo_id: form.vehiculo_id ? parseInt(form.vehiculo_id) : null,
        frente_trabajo_id: form.frente_trabajo_id ? parseInt(form.frente_trabajo_id) : null,
        responsable_id: form.responsable_id ? parseInt(form.responsable_id) : null,
        fecha_programada: form.fecha_programada,
        fecha_inicio: form.fecha_inicio || null,
        horometro_actual: form.horometro_actual ? parseFloat(form.horometro_actual) : null,
        costo_estimado: form.costo_estimado ? parseInt(form.costo_estimado) : null,
        observaciones: form.observaciones || null,
      };

      const { data, error: insertError } = await supabase
        .from('ordenes_mantenimiento')
        .insert([dataToInsert])
        .select()
        .single();

      if (insertError) throw insertError;

      router.push(`/mantenimiento/ordenes/${data.id}`);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear la orden');
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm";
  const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white";
  const textareaClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/mantenimiento/ordenes" className="hover:text-gray-900">
            Órdenes de Mantenimiento
          </Link>
          <span>/</span>
          <span className="text-gray-900">Nueva</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Nueva Orden de Mantenimiento</h1>
        <p className="text-gray-600 mt-1">
          Programa un mantenimiento preventivo, correctivo o predictivo
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
          title="Información General"
          isOpen={openSections.basica}
          onToggle={() => toggleSection('basica')}
          required
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Título de la Orden"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              placeholder="Ej: Cambio de aceite programado"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="preventivo">🛠️ Preventivo</option>
                <option value="correctivo">⚠️ Correctivo</option>
                <option value="predictivo">📊 Predictivo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad <span className="text-red-500">*</span>
              </label>
              <select
                name="prioridad"
                value={form.prioridad}
                onChange={handleChange}
                required
                className={selectClass}
              >
                <option value="baja">🟢 Baja</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🟠 Alta</option>
                <option value="critica">🔴 Crítica</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              className={textareaClass}
              placeholder="Describe el alcance del mantenimiento..."
            />
          </div>
        </CollapsibleSection>

        {/* EQUIPO */}
        <CollapsibleSection
          title="Equipo"
          isOpen={openSections.equipo}
          onToggle={() => toggleSection('equipo')}
          required
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Selecciona el equipo que recibirá el mantenimiento</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maquinaria</label>
                <select
                  name="maquinaria_id"
                  value={form.maquinaria_id}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Sin seleccionar</option>
                  {maquinaria.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.codigo_interno} — {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehículo</label>
                <select
                  name="vehiculo_id"
                  value={form.vehiculo_id}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Sin seleccionar</option>
                  {vehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.placa})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-2">
                {form.maquinaria_id
                  ? 'El frente de trabajo se auto-asignará desde la maquinaria seleccionada'
                  : 'Selecciona maquinaria o vehículo para auto-asignar el frente de trabajo'}
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* PROGRAMACIÓN */}
        <CollapsibleSection
          title="Programación y Responsable"
          isOpen={openSections.programacion}
          onToggle={() => toggleSection('programacion')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Fecha Programada"
              name="fecha_programada"
              type="date"
              value={form.fecha_programada}
              onChange={handleChange}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frente de Trabajo</label>
              <select
                name="frente_trabajo_id"
                value={form.frente_trabajo_id}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">Sin asignar</option>
                {frentes.map((f) => (
                  <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
              <select
                name="responsable_id"
                value={form.responsable_id}
                onChange={handleChange}
                className={selectClass}
              >
                <option value="">Sin asignar</option>
                {trabajadores.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.primer_apellido} ({t.cedula})
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label="Horómetro Actual"
              name="horometro_actual"
              type="number"
              step="0.1"
              value={form.horometro_actual}
              onChange={handleChange}
              placeholder="Horas"
            />
          </div>
        </CollapsibleSection>

        {/* COSTOS */}
        <CollapsibleSection
          title="Costos Estimados"
          isOpen={openSections.costos}
          onToggle={() => toggleSection('costos')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Costo Estimado (COP)"
              name="costo_estimado"
              type="number"
              value={form.costo_estimado}
              onChange={handleChange}
              placeholder="0"
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
            value={form.observaciones}
            onChange={handleChange}
            rows={4}
            className={textareaClass}
            placeholder="Notas adicionales sobre la orden..."
          />
        </CollapsibleSection>

        {/* BOTONES */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/mantenimiento/ordenes"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Creando orden...
              </>
            ) : (
              <>📋 Crear Orden</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componentes auxiliares
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
  );
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
        {...props}
      />
    </div>
  );
}
