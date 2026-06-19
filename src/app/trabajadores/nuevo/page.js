'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { crearTrabajador } from '@/actions';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';

export default function NuevoTrabajadorPage() {
  const supabase = createClient();
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useRole();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [frentes, setFrentes] = useState([]);

  // Redirect si no es admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/trabajadores');
    }
  }, [roleLoading, isAdmin, router]);

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>;
  if (!isAdmin) return null;

  const [openSections, setOpenSections] = useState({
    personal: true,
    laboral: false,
    seguridad_social: false,
    emergencia: false,
  });

  const [form, setForm] = useState({
    // Información Personal
    tipo_documento: 'CC',
    cedula: '',
    primer_apellido: '',
    segundo_apellido: '',
    nombre: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    genero: '',
    estado_civil: '',
    rh: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    departamento: '',
    // Información Laboral
    cargo_id: '',
    departamento_id: '',
    frente_trabajo_id: '',
    fecha_ingreso: '',
    tipo_contrato: '',
    salario: '',
    // Seguridad Social
    eps: '',
    arl: '',
    fondo_pension: '',
    caja_compensacion: '',
    // Contacto Emergencia
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    contacto_emergencia_parentesco: '',
    activo: true,
  });

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    const { data: cargosData } = await supabase.from('cargos').select('*').order('nombre');
    const { data: deptData } = await supabase.from('departamentos').select('*').order('nombre');
    const { data: frentesData } = await supabase.from('frentes_trabajo').select('*').eq('activo', true).order('nombre');
    setCargos(cargosData || []);
    setDepartamentos(deptData || []);
    // Mostrar solo frentes de Santa Rosa
    const soloSantaRosa = (frentesData || []).filter(f =>
      f.codigo === 'FT-SR' || f.nombre?.toLowerCase().includes('santa rosa')
    )
    setFrentes(soloSantaRosa);
  };

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await crearTrabajador(form)

      if (result.error) throw new Error(result.error)
      if (result.success) {
        router.push(`/trabajadores/${result.id}`);
      }
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al crear trabajador', { type: 'error' }) } catch(e) {}
      setError(err.message || 'Error al crear trabajador');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/trabajadores" className="hover:text-gray-900">
            Empleados
          </Link>
          <span>/</span>
          <span className="text-gray-900">Nuevo</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Registrar Nuevo Empleado</h1>
        <p className="text-gray-600 mt-1">
          Complete la información del empleado. Los campos marcados con * son obligatorios.
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
        {/* INFORMACIÓN PERSONAL */}
        <CollapsibleSection
          title="Información Personal"
          isOpen={openSections.personal}
          onToggle={() => toggleSection('personal')}
          required
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Documento <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_documento"
                value={form.tipo_documento}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PA">Pasaporte</option>
                <option value="TI">Tarjeta de Identidad</option>
              </select>
            </div>
            <FormField label="Cédula *" name="cedula" value={form.cedula} onChange={handleChange} required />
            <FormField label="RH" name="rh" value={form.rh} onChange={handleChange} placeholder="Ej: O+" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <FormField label="Primer Apellido *" name="primer_apellido" value={form.primer_apellido} onChange={handleChange} required />
            <FormField label="Segundo Apellido" name="segundo_apellido" value={form.segundo_apellido} onChange={handleChange} />
            <FormField label="Nombres *" name="nombre" value={form.nombre} onChange={handleChange} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <FormField label="Fecha de Nacimiento" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
            <FormField label="Lugar de Nacimiento" name="lugar_nacimiento" value={form.lugar_nacimiento} onChange={handleChange} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
              <select name="genero" value={form.genero} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
              <select name="estado_civil" value={form.estado_civil} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Seleccionar</option>
                <option value="soltero">Soltero(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="union_libre">Unión Libre</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viudo">Viudo(a)</option>
              </select>
            </div>
            <FormField label="Teléfono *" name="telefono" value={form.telefono} onChange={handleChange} required type="tel" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
            <FormField label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} />
            <FormField label="Departamento (Geográfico)" name="departamento" value={form.departamento} onChange={handleChange} placeholder="Ej: Cundinamarca" />
          </div>
        </CollapsibleSection>

        {/* INFORMACIÓN LABORAL */}
        <CollapsibleSection
          title="Información Laboral"
          isOpen={openSections.laboral}
          onToggle={() => toggleSection('laboral')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <select name="cargo_id" value={form.cargo_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Seleccionar cargo</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento (Área)</label>
              <select name="departamento_id" value={form.departamento_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Seleccionar área</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frente de Trabajo</label>
              <select name="frente_trabajo_id" value={form.frente_trabajo_id} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Sin asignar</option>
                {frentes.map((f) => (
                  <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <FormField label="Fecha de Ingreso" name="fecha_ingreso" type="date" value={form.fecha_ingreso} onChange={handleChange} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
              <select name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Seleccionar</option>
                <option value="indefinido">Término Indefinido</option>
                <option value="fijo">Término Fijo</option>
                <option value="obra_labor">Obra o Labor</option>
                <option value="prestacion_servicios">Prestación de Servicios</option>
                <option value="aprendizaje">Aprendizaje SENA</option>
              </select>
            </div>
            <FormField label="Salario (COP)" name="salario" type="number" value={form.salario} onChange={handleChange} placeholder="1300000" />
          </div>
        </CollapsibleSection>

        {/* SEGURIDAD SOCIAL */}
        <CollapsibleSection
          title="Seguridad Social"
          isOpen={openSections.seguridad_social}
          onToggle={() => toggleSection('seguridad_social')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="EPS" name="eps" value={form.eps} onChange={handleChange} placeholder="Ej: Sura, Sanitas, Compensar" />
            <FormField label="ARL" name="arl" value={form.arl} onChange={handleChange} placeholder="Ej: Sura, Positiva, Colmena" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField label="Fondo de Pensión" name="fondo_pension" value={form.fondo_pension} onChange={handleChange} placeholder="Ej: Porvenir, Colpensiones" />
            <FormField label="Caja de Compensación" name="caja_compensacion" value={form.caja_compensacion} onChange={handleChange} placeholder="Ej: Compensar, Colsubsidio" />
          </div>
        </CollapsibleSection>

        {/* CONTACTO DE EMERGENCIA */}
        <CollapsibleSection
          title="Contacto de Emergencia"
          isOpen={openSections.emergencia}
          onToggle={() => toggleSection('emergencia')}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Nombre" name="contacto_emergencia_nombre" value={form.contacto_emergencia_nombre} onChange={handleChange} />
            <FormField label="Teléfono" name="contacto_emergencia_telefono" value={form.contacto_emergencia_telefono} onChange={handleChange} type="tel" />
            <FormField label="Parentesco" name="contacto_emergencia_parentesco" value={form.contacto_emergencia_parentesco} onChange={handleChange} placeholder="Ej: Esposa, Hermano" />
          </div>
        </CollapsibleSection>

        {/* BOTONES */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/trabajadores"
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
                <span className="animate-spin">⌛</span>
                Guardando...
              </>
            ) : (
              <>Guardar Empleado</>
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

function FormField({ label, name, type = 'text', value, onChange, placeholder, required }) {
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
      />
    </div>
  );
}
