'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { useToast } from '@/context/ToastContext';

export default function EditarTrabajadorPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const { addToast } = useToast();
  const trabajadorId = params.id;

  // Redirect si no es admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/trabajadores');
    }
  }, [roleLoading, isAdmin, router]);

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>;
  if (!isAdmin) return null;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [datosOriginales, setDatosOriginales] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [frentes, setFrentes] = useState([]);

  const [formData, setFormData] = useState({
    cedula: '',
    tipo_documento: 'CC',
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    fecha_nacimiento: '',
    genero: '',
    estado_civil: '',

    email: '',
    telefono: '',
    telefono_emergencia: '',
    contacto_emergencia: '',
    direccion: '',
    ciudad: '',
    departamento_residencia: '',

    cargo_id: '',
    departamento_id: '',
    frente_trabajo_id: '',
    fecha_ingreso: '',
    tipo_contrato: '',
    salario: '',
    estado: 'activo',

    eps: '',
    arl: '',
    afp: '',
    caja_compensacion: '',

    banco: '',
    tipo_cuenta: '',
    numero_cuenta: '',

    nivel_educativo: '',
    profesion: '',
    rh: '',
    observaciones: '',
  });

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [cargosRes, deptRes, frentesRes] = await Promise.all([
          supabase.from('cargos').select('id, nombre').order('nombre'),
          supabase.from('departamentos').select('id, nombre').order('nombre'),
          supabase.from('frentes_trabajo').select('id, codigo, nombre').eq('activo', true).order('nombre'),
        ]);

        setCargos(cargosRes.data || []);
        setDepartamentos(deptRes.data || []);
        // Mostrar solo frentes de Santa Rosa
        const soloSantaRosa = (frentesRes.data || []).filter(f =>
          f.codigo === 'FT-SR' || f.nombre?.toLowerCase().includes('santa rosa')
        )
        setFrentes(soloSantaRosa);

        const { data, error } = await supabase
          .from('trabajadores')
          .select('*, cargo:cargos(id, nombre), departamento_area:departamentos(id, nombre)')
          .eq('id', trabajadorId)
          .single();

        if (error) throw error;

        if (data) {
          // Determinar cargo_id: primero el FK, si no, buscar por nombre en catálogo
          let cargoId = data.cargo_id || '';
          if (!cargoId && data.cargo) {
            const match = (cargosRes.data || []).find(
              (c) => c.nombre.toLowerCase() === data.cargo.toLowerCase()
            );
            if (match) cargoId = match.id;
          }

          // Determinar departamento_id
          let deptoId = data.departamento_id || '';
          if (!deptoId && data.departamento) {
            const match = (deptRes.data || []).find(
              (d) => d.nombre.toLowerCase() === data.departamento.toLowerCase()
            );
            if (match) deptoId = match.id;
          }

          const datosFormulario = {
            cedula: data.cedula || '',
            tipo_documento: data.tipo_documento || 'CC',
            nombre: data.nombre || '',
            primer_apellido: data.primer_apellido || '',
            segundo_apellido: data.segundo_apellido || '',
            fecha_nacimiento: data.fecha_nacimiento || '',
            genero: data.genero || '',
            estado_civil: data.estado_civil || '',
            email: data.email || '',
            telefono: data.telefono || '',
            telefono_emergencia: data.telefono_emergencia || '',
            contacto_emergencia: data.contacto_emergencia || '',
            direccion: data.direccion || '',
            ciudad: data.ciudad || '',
            departamento_residencia: data.departamento_residencia || '',
            cargo_id: cargoId,
            departamento_id: deptoId,
            frente_trabajo_id: data.frente_trabajo_id || '',
            fecha_ingreso: data.fecha_ingreso || '',
            tipo_contrato: data.tipo_contrato || '',
            salario: data.salario || '',
            estado: data.estado || 'activo',
            eps: data.eps || '',
            arl: data.arl || '',
            afp: data.afp || '',
            caja_compensacion: data.caja_compensacion || '',
            banco: data.banco || '',
            tipo_cuenta: data.tipo_cuenta || '',
            numero_cuenta: data.numero_cuenta || '',
            nivel_educativo: data.nivel_educativo || '',
            profesion: data.profesion || '',
            rh: data.rh || '',
            observaciones: data.observaciones || '',
          };

          setFormData(datosFormulario);
          setDatosOriginales(datosFormulario);
        }
      } catch (err) {
        console.error('Error cargando trabajador:', err);
        addToast('Error al cargar datos del trabajador', { type: 'error' })
        setError('No se pudo cargar la información del trabajador');
      } finally {
        setCargando(false);
      }
    }

    if (trabajadorId) {
      cargarDatos();
    }
  }, [trabajadorId]);

  function limpiarDatos(data) {
    const camposFecha = ['fecha_nacimiento', 'fecha_ingreso'];
    const camposNumericos = ['salario', 'cargo_id', 'departamento_id', 'frente_trabajo_id'];

    const limpio = {};

    for (const key in data) {
      const valor = data[key];

      if (valor === '' || valor === undefined || valor === null) {
        limpio[key] = null;
        continue;
      }

      if (camposNumericos.includes(key)) {
        const num = parseInt(valor, 10);
        limpio[key] = isNaN(num) ? null : num;
        continue;
      }

      if (camposFecha.includes(key)) {
        limpio[key] = valor && valor.trim() !== '' ? valor : null;
        continue;
      }

      limpio[key] = typeof valor === 'string' ? valor.trim() : valor;
    }

    return limpio;
  }

  function detectarCambios() {
    const cambios = [];
    const etiquetas = {
      cedula: 'Cédula',
      tipo_documento: 'Tipo de Documento',
      nombre: 'Nombre',
      primer_apellido: 'Primer Apellido',
      segundo_apellido: 'Segundo Apellido',
      fecha_nacimiento: 'Fecha de Nacimiento',
      genero: 'Género',
      estado_civil: 'Estado Civil',
      email: 'Email',
      telefono: 'Teléfono',
      telefono_emergencia: 'Teléfono de Emergencia',
      contacto_emergencia: 'Contacto de Emergencia',
      direccion: 'Dirección',
      ciudad: 'Ciudad',
      departamento_residencia: 'Departamento de Residencia',
      cargo_id: 'Cargo',
      departamento_id: 'Departamento',
      frente_trabajo_id: 'Frente de Trabajo',
      fecha_ingreso: 'Fecha de Ingreso',
      tipo_contrato: 'Tipo de Contrato',
      salario: 'Salario',
      estado: 'Estado',
      eps: 'EPS',
      arl: 'ARL',
      afp: 'AFP',
      caja_compensacion: 'Caja de Compensación',
      banco: 'Banco',
      tipo_cuenta: 'Tipo de Cuenta',
      numero_cuenta: 'Número de Cuenta',
      nivel_educativo: 'Nivel Educativo',
      profesion: 'Profesión',
      rh: 'RH',
      observaciones: 'Observaciones',
    };

    Object.keys(formData).forEach((campo) => {
      if (datosOriginales && String(formData[campo]) !== String(datosOriginales[campo])) {
        const valorAnterior = datosOriginales[campo];
        const valorNuevo = formData[campo];

        // Mostrar nombre legible para cambios de cargo/departamento
        let displayAnterior = valorAnterior || '(vacío)';
        let displayNuevo = valorNuevo || '(vacío)';

        if (campo === 'cargo_id') {
          const cAnterior = cargos.find((c) => String(c.id) === String(valorAnterior));
          const cNuevo = cargos.find((c) => String(c.id) === String(valorNuevo));
          if (cAnterior) displayAnterior = cAnterior.nombre;
          if (cNuevo) displayNuevo = cNuevo.nombre;
        }
        if (campo === 'departamento_id') {
          const dAnterior = departamentos.find((d) => String(d.id) === String(valorAnterior));
          const dNuevo = departamentos.find((d) => String(d.id) === String(valorNuevo));
          if (dAnterior) displayAnterior = dAnterior.nombre;
          if (dNuevo) displayNuevo = dNuevo.nombre;
        }
        if (campo === 'frente_trabajo_id') {
          const fAnterior = frentes.find((f) => String(f.id) === String(valorAnterior));
          const fNuevo = frentes.find((f) => String(f.id) === String(valorNuevo));
          if (fAnterior) displayAnterior = `${fAnterior.codigo} — ${fAnterior.nombre}`;
          if (fNuevo) displayNuevo = `${fNuevo.codigo} — ${fNuevo.nombre}`;
        }

        cambios.push({
          campo: etiquetas[campo] || campo,
          valor_anterior: displayAnterior,
          valor_nuevo: displayNuevo,
        });
      }
    });

    return cambios;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      const cambios = detectarCambios();
      const datosActualizar = limpiarDatos(formData);

      // Eliminar campos legacy que ya no existen en la BD
      delete datosActualizar.cargo_legacy;
      delete datosActualizar.departamento_legacy;

      const { error: errorUpdate } = await supabase
        .from('trabajadores')
        .update(datosActualizar)
        .eq('id', trabajadorId);

      if (errorUpdate) throw errorUpdate;

      if (cambios.length > 0) {
        const descripcion = cambios
          .map((c) => `${c.campo}: "${c.valor_anterior}" → "${c.valor_nuevo}"`)
          .join(' | ');

        await supabase.from('historial_trabajadores').insert({
          trabajador_id: trabajadorId,
          tipo_evento: 'actualizacion',
          descripcion: descripcion,
          fecha_evento: new Date().toISOString(),
        });
      }

      router.push(`/trabajadores/${trabajadorId}`);
    } catch (err) {
      console.error('Error actualizando trabajador:', err);
      addToast('Error al guardar los cambios', { type: 'error' })
      setError(err.message || 'Error al guardar los cambios');
      setGuardando(false);
    }
  }

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm";
  const selectClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/trabajadores" className="hover:text-gray-900">
            Empleados
          </Link>
          <span>/</span>
          <Link href={`/trabajadores/${trabajadorId}`} className="hover:text-gray-900">
            Detalle
          </Link>
          <span>/</span>
          <span className="text-gray-900">Editar</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Editar Empleado</h1>
        <p className="text-gray-600 mt-1">
          Actualiza la información del empleado
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* IDENTIFICACIÓN */}
        <Section title="Identificación">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tipo de Documento" required>
              <select
                value={formData.tipo_documento}
                onChange={handleChange('tipo_documento')}
                className={selectClass}
                required
              >
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PA">Pasaporte</option>
                <option value="TI">Tarjeta de Identidad</option>
              </select>
            </Field>
            <Field label="Número de Documento" required>
              <input
                type="text"
                value={formData.cedula}
                onChange={handleChange('cedula')}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Nombre" required>
              <input
                type="text"
                value={formData.nombre}
                onChange={handleChange('nombre')}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Primer Apellido" required>
              <input
                type="text"
                value={formData.primer_apellido}
                onChange={handleChange('primer_apellido')}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Segundo Apellido">
              <input
                type="text"
                value={formData.segundo_apellido}
                onChange={handleChange('segundo_apellido')}
                className={inputClass}
              />
            </Field>
            <Field label="Fecha de Nacimiento">
              <input
                type="date"
                value={formData.fecha_nacimiento}
                onChange={handleChange('fecha_nacimiento')}
                className={inputClass}
              />
            </Field>
            <Field label="Género">
              <select
                value={formData.genero}
                onChange={handleChange('genero')}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Estado Civil">
              <select
                value={formData.estado_civil}
                onChange={handleChange('estado_civil')}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                <option value="soltero">Soltero(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="union_libre">Unión Libre</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viudo">Viudo(a)</option>
              </select>
            </Field>
            <Field label="Tipo de Sangre (RH)">
              <select
                value={formData.rh}
                onChange={handleChange('rh')}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* CONTACTO */}
        <Section title="Información de Contacto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={formData.telefono}
                onChange={handleChange('telefono')}
                className={inputClass}
              />
            </Field>
            <Field label="Contacto de Emergencia">
              <input
                type="text"
                value={formData.contacto_emergencia}
                onChange={handleChange('contacto_emergencia')}
                className={inputClass}
              />
            </Field>
            <Field label="Teléfono de Emergencia">
              <input
                type="tel"
                value={formData.telefono_emergencia}
                onChange={handleChange('telefono_emergencia')}
                className={inputClass}
              />
            </Field>
            <Field label="Dirección">
              <input
                type="text"
                value={formData.direccion}
                onChange={handleChange('direccion')}
                className={inputClass}
              />
            </Field>
            <Field label="Ciudad">
              <input
                type="text"
                value={formData.ciudad}
                onChange={handleChange('ciudad')}
                className={inputClass}
              />
            </Field>
            <Field label="Departamento (Geográfico)">
              <input
                type="text"
                value={formData.departamento_residencia}
                onChange={handleChange('departamento_residencia')}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* INFORMACIÓN LABORAL */}
        <Section title="Información Laboral">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cargo" required>
              <select
                value={formData.cargo_id}
                onChange={handleChange('cargo_id')}
                className={selectClass}
                required
              >
                <option value="">Seleccionar cargo...</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Departamento" required>
              <select
                value={formData.departamento_id}
                onChange={handleChange('departamento_id')}
                className={selectClass}
                required
              >
                <option value="">Seleccionar...</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de Ingreso" required>
              <input
                type="date"
                value={formData.fecha_ingreso}
                onChange={handleChange('fecha_ingreso')}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Tipo de Contrato">
              <select
                value={formData.tipo_contrato}
                onChange={handleChange('tipo_contrato')}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                <option value="indefinido">Término Indefinido</option>
                <option value="fijo">Término Fijo</option>
                <option value="obra_labor">Obra o Labor</option>
                <option value="prestacion_servicios">Prestación de Servicios</option>
                <option value="aprendizaje">Aprendizaje SENA</option>
              </select>
            </Field>
            <Field label="Salario (COP)">
              <input
                type="number"
                value={formData.salario}
                onChange={handleChange('salario')}
                className={inputClass}
                placeholder="Ej: 2500000"
              />
            </Field>
            <Field label="Frente de Trabajo">
              <select
                value={formData.frente_trabajo_id}
                onChange={handleChange('frente_trabajo_id')}
                className={selectClass}
              >
                <option value="">Sin asignar</option>
                {frentes.map((f) => (
                  <option key={f.id} value={f.id}>{f.codigo} — {f.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado" required>
              <select
                value={formData.estado}
                onChange={handleChange('estado')}
                className={selectClass}
                required
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="vacaciones">En Vacaciones</option>
                <option value="incapacidad">En Incapacidad</option>
                <option value="retirado">Retirado</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* SEGURIDAD SOCIAL */}
        <Section title="Seguridad Social">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="EPS">
              <input
                type="text"
                value={formData.eps}
                onChange={handleChange('eps')}
                className={inputClass}
                placeholder="Ej: Sura, Sanitas, Compensar"
              />
            </Field>
            <Field label="ARL">
              <input
                type="text"
                value={formData.arl}
                onChange={handleChange('arl')}
                className={inputClass}
                placeholder="Ej: Sura, Positiva, Colmena"
              />
            </Field>
            <Field label="Fondo de Pensiones (AFP)">
              <input
                type="text"
                value={formData.afp}
                onChange={handleChange('afp')}
                className={inputClass}
                placeholder="Ej: Porvenir, Protección, Colpensiones"
              />
            </Field>
            <Field label="Caja de Compensación">
              <input
                type="text"
                value={formData.caja_compensacion}
                onChange={handleChange('caja_compensacion')}
                className={inputClass}
                placeholder="Ej: Compensar, Cafam, Colsubsidio"
              />
            </Field>
          </div>
        </Section>

        {/* INFORMACIÓN BANCARIA */}
        <Section title="Información Bancaria">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Banco">
              <input
                type="text"
                value={formData.banco}
                onChange={handleChange('banco')}
                className={inputClass}
                placeholder="Ej: Bancolombia, Davivienda"
              />
            </Field>
            <Field label="Tipo de Cuenta">
              <select
                value={formData.tipo_cuenta}
                onChange={handleChange('tipo_cuenta')}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
              </select>
            </Field>
            <Field label="Número de Cuenta">
              <input
                type="text"
                value={formData.numero_cuenta}
                onChange={handleChange('numero_cuenta')}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* INFORMACIÓN ADICIONAL */}
        <Section title="Información Adicional">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nivel Educativo">
              <select
                value={formData.nivel_educativo}
                onChange={handleChange('nivel_educativo')}
                className={selectClass}
              >
                <option value="">Seleccionar...</option>
                <option value="primaria">Primaria</option>
                <option value="bachiller">Bachiller</option>
                <option value="tecnico">Técnico</option>
                <option value="tecnologo">Tecnólogo</option>
                <option value="profesional">Profesional</option>
                <option value="especializacion">Especialización</option>
                <option value="maestria">Maestría</option>
                <option value="doctorado">Doctorado</option>
              </select>
            </Field>
            <Field label="Profesión">
              <input
                type="text"
                value={formData.profesion}
                onChange={handleChange('profesion')}
                className={inputClass}
                placeholder="Ej: Ingeniero Mecánico"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Observaciones">
                <textarea
                  value={formData.observaciones}
                  onChange={handleChange('observaciones')}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none"
                  placeholder="Notas adicionales sobre el trabajador..."
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* BOTONES */}
        <div className="flex justify-end gap-4 pt-4">
          <Link
            href={`/trabajadores/${trabajadorId}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Componentes auxiliares
function Section({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
