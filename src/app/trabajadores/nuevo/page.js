export const dynamic = 'force-dynamic';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function NuevoTrabajadorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);

  const [form, setForm] = useState({
    // Información Personal
    tipo_documento: 'CC',
    cedula: '',
    primer_apellido: '',
    segundo_apellido: '',
    nombre: '', // ✅ CORREGIDO: era "nombres"
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
    setCargos(cargosData || []);
    setDepartamentos(deptData || []);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const datos = {
        ...form,
        cargo_id: form.cargo_id || null,
        departamento_id: form.departamento_id || null,
        salario: form.salario ? parseFloat(form.salario) : null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        fecha_ingreso: form.fecha_ingreso || null,
      };

      const { data, error } = await supabase
        .from('trabajadores')
        .insert([datos])
        .select()
        .single();

      if (error) throw error;

      alert('Trabajador creado exitosamente');
      router.push(`/dashboard/trabajadores/${data.id}`); // ✅ CORREGIDO: ruta dashboard
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear trabajador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard/trabajadores" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>
          ← Volver a trabajadores
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', margin: '8px 0 4px 0' }}>
          Nuevo Trabajador
        </h1>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
          Completa la información del nuevo empleado
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SECCIÓN 1: Información Personal */}
        <Section title="Información Personal">
          <Grid cols={3}>
            <Field label="Tipo Documento *">
              <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} required style={inputStyle}>
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PA">Pasaporte</option>
                <option value="TI">Tarjeta de Identidad</option>
              </select>
            </Field>
            <Field label="Cédula *">
              <input type="text" name="cedula" value={form.cedula} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="RH">
              <select name="rh" value={form.rh} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar</option>
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((rh) => (
                  <option key={rh} value={rh}>{rh}</option>
                ))}
              </select>
            </Field>
          </Grid>

          <Grid cols={3}>
            <Field label="Primer Apellido *">
              <input type="text" name="primer_apellido" value={form.primer_apellido} onChange={handleChange} required style={inputStyle} />
            </Field>
            <Field label="Segundo Apellido">
              <input type="text" name="segundo_apellido" value={form.segundo_apellido} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Nombres *">
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange} required style={inputStyle} />
            </Field>
          </Grid>

          <Grid cols={3}>
            <Field label="Fecha de Nacimiento">
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Lugar de Nacimiento">
              <input type="text" name="lugar_nacimiento" value={form.lugar_nacimiento} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Género">
              <select name="genero" value={form.genero} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="O">Otro</option>
              </select>
            </Field>
          </Grid>

          <Grid cols={2}>
            <Field label="Estado Civil">
              <select name="estado_civil" value={form.estado_civil} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar</option>
                <option value="soltero">Soltero(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="union_libre">Unión Libre</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viudo">Viudo(a)</option>
              </select>
            </Field>
            <Field label="Teléfono *">
              <input type="tel" name="telefono" value={form.telefono} onChange={handleChange} required style={inputStyle} />
            </Field>
          </Grid>

          <Grid cols={2}>
            <Field label="Email">
              <input type="email" name="email" value={form.email} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Dirección">
              <input type="text" name="direccion" value={form.direccion} onChange={handleChange} style={inputStyle} />
            </Field>
          </Grid>

          <Grid cols={2}>
            <Field label="Ciudad">
              <input type="text" name="ciudad" value={form.ciudad} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Departamento (Geográfico)">
              <input type="text" name="departamento" value={form.departamento} onChange={handleChange} placeholder="Ej: Cundinamarca" style={inputStyle} />
            </Field>
          </Grid>
        </Section>

        {/* SECCIÓN 2: Información Laboral */}
        <Section title="Información Laboral">
          <Grid cols={2}>
            <Field label="Cargo">
              <select name="cargo_id" value={form.cargo_id} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar cargo</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Departamento (Área)">
              <select name="departamento_id" value={form.departamento_id} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar área</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </Field>
          </Grid>

          <Grid cols={3}>
            <Field label="Fecha de Ingreso">
              <input type="date" name="fecha_ingreso" value={form.fecha_ingreso} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Tipo de Contrato">
              <select name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange} style={inputStyle}>
                <option value="">Seleccionar</option>
                <option value="indefinido">Término Indefinido</option>
                <option value="fijo">Término Fijo</option>
                <option value="obra_labor">Obra o Labor</option>
                <option value="prestacion_servicios">Prestación de Servicios</option>
                <option value="aprendizaje">Aprendizaje SENA</option>
              </select>
            </Field>
            <Field label="Salario (COP)">
              <input type="number" name="salario" value={form.salario} onChange={handleChange} placeholder="1300000" style={inputStyle} />
            </Field>
          </Grid>
        </Section>

        {/* SECCIÓN 3: Seguridad Social */}
        <Section title="Seguridad Social">
          <Grid cols={2}>
            <Field label="EPS">
              <input type="text" name="eps" value={form.eps} onChange={handleChange} placeholder="Ej: Sura, Sanitas, Compensar" style={inputStyle} />
            </Field>
            <Field label="ARL">
              <input type="text" name="arl" value={form.arl} onChange={handleChange} placeholder="Ej: Sura, Positiva, Colmena" style={inputStyle} />
            </Field>
          </Grid>
          <Grid cols={2}>
            <Field label="Fondo de Pensión">
              <input type="text" name="fondo_pension" value={form.fondo_pension} onChange={handleChange} placeholder="Ej: Porvenir, Colpensiones" style={inputStyle} />
            </Field>
            <Field label="Caja de Compensación">
              <input type="text" name="caja_compensacion" value={form.caja_compensacion} onChange={handleChange} placeholder="Ej: Compensar, Colsubsidio" style={inputStyle} />
            </Field>
          </Grid>
        </Section>

        {/* SECCIÓN 4: Contacto de Emergencia */}
        <Section title="Contacto de Emergencia">
          <Grid cols={3}>
            <Field label="Nombre">
              <input type="text" name="contacto_emergencia_nombre" value={form.contacto_emergencia_nombre} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Teléfono">
              <input type="tel" name="contacto_emergencia_telefono" value={form.contacto_emergencia_telefono} onChange={handleChange} style={inputStyle} />
            </Field>
            <Field label="Parentesco">
              <input type="text" name="contacto_emergencia_parentesco" value={form.contacto_emergencia_parentesco} onChange={handleChange} placeholder="Ej: Esposa, Hermano" style={inputStyle} />
            </Field>
          </Grid>
        </Section>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
          <Link href="/dashboard/trabajadores" style={{
            padding: '12px 24px',
            backgroundColor: '#F5F5F5',
            color: '#1A1A1A',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
          }}>
            Cancelar
          </Link>
          <button type="submit" disabled={loading} style={{
            padding: '12px 32px',
            backgroundColor: '#FFC107',
            color: '#1A1A1A',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Guardando...' : 'Guardar Trabajador'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componentes auxiliares
function Section({ title, children }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', marginBottom: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1A1A1A', marginTop: 0, marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #FFC107' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Grid({ cols, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '16px', marginBottom: '16px' }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1A1A1A', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E5E5E5',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: 'white',
};
