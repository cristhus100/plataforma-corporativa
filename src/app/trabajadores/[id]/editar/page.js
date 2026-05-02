'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Campo from '@/components/ui/Campo';

export default function EditarTrabajadorPage() {
  const router = useRouter();
  const params = useParams();
  const trabajadorId = params.id;
  const supabase = createClient();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [datosOriginales, setDatosOriginales] = useState(null);

  const [formData, setFormData] = useState({
    // Identificación
    cedula: '',
    tipo_documento: 'CC',
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    fecha_nacimiento: '',
    genero: '',
    estado_civil: '',
    
    // Contacto
    email: '',
    telefono: '',
    telefono_emergencia: '',
    contacto_emergencia: '',
    direccion: '',
    ciudad: '',
    departamento_residencia: '',
    
    // Información laboral
    cargo: '',
    departamento: '',
    fecha_ingreso: '',
    tipo_contrato: '',
    salario: '',
    estado: 'activo',
    
    // Seguridad social
    eps: '',
    arl: '',
    afp: '',
    caja_compensacion: '',
    
    // Información bancaria
    banco: '',
    tipo_cuenta: '',
    numero_cuenta: '',
    
    // Adicional
    nivel_educativo: '',
    profesion: '',
    rh: '',
    observaciones: '',
  });

  // Cargar datos del trabajador
  useEffect(() => {
    async function cargarTrabajador() {
      try {
        const { data, error } = await supabase
          .from('trabajadores')
          .select('*')
          .eq('id', trabajadorId)
          .single();

        if (error) throw error;

        if (data) {
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
            cargo: data.cargo || '',
            departamento: data.departamento || '',
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
        setError('No se pudo cargar la información del trabajador');
      } finally {
        setCargando(false);
      }
    }

    if (trabajadorId) {
      cargarTrabajador();
    }
  }, [trabajadorId]);

  // 🔥 NUEVA FUNCIÓN: Limpia los datos antes de enviar a Supabase
  // Convierte strings vacíos a null para campos DATE y NUMERIC
  function limpiarDatos(data) {
    const camposFecha = ['fecha_nacimiento', 'fecha_ingreso'];
    const camposNumericos = ['salario'];

    const limpio = {};

    for (const key in data) {
      const valor = data[key];

      // Strings vacíos o undefined → null
      if (valor === '' || valor === undefined || valor === null) {
        limpio[key] = null;
        continue;
      }

      // Campos numéricos: convertir a número o null
      if (camposNumericos.includes(key)) {
        const num = parseFloat(valor);
        limpio[key] = isNaN(num) ? null : num;
        continue;
      }

      // Campos de fecha: validar que tenga formato válido
      if (camposFecha.includes(key)) {
        limpio[key] = valor && valor.trim() !== '' ? valor : null;
        continue;
      }

      // Resto de campos: dejar tal cual (con trim para strings)
      limpio[key] = typeof valor === 'string' ? valor.trim() : valor;
    }

    return limpio;
  }

  // Detectar cambios para el historial
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
      cargo: 'Cargo',
      departamento: 'Departamento',
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
      if (datosOriginales && formData[campo] !== datosOriginales[campo]) {
        cambios.push({
          campo: etiquetas[campo] || campo,
          valor_anterior: datosOriginales[campo] || '(vacío)',
          valor_nuevo: formData[campo] || '(vacío)',
        });
      }
    });

    return cambios;
  }

  // Guardar cambios
  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    try {
      const cambios = detectarCambios();

      // 🔥 LIMPIAR DATOS antes de enviar (convierte "" a null)
      const datosActualizar = limpiarDatos(formData);

      // Actualizar trabajador
      const { error: errorUpdate } = await supabase
        .from('trabajadores')
        .update(datosActualizar)
        .eq('id', trabajadorId);

      if (errorUpdate) throw errorUpdate;

      // Registrar en historial si hubo cambios
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
      setError(err.message || 'Error al guardar los cambios');
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-[#FFC107] text-lg">Cargando información...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/trabajadores/${trabajadorId}`}
            className="text-gray-400 hover:text-[#FFC107] text-sm mb-2 inline-block"
          >
            ← Volver al detalle
          </Link>
          <h1 className="text-3xl font-bold text-white">Editar Trabajador</h1>
          <p className="text-gray-400 mt-1">
            Actualiza la información del empleado
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN: IDENTIFICACIÓN */}
          <section className="bg-[#212121] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#FFC107] mb-4">
              📋 Identificación
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Tipo de Documento" required>
                <select
                  value={formData.tipo_documento}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo_documento: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PA">Pasaporte</option>
                  <option value="TI">Tarjeta de Identidad</option>
                </select>
              </Campo>

              <Campo label="Número de Documento" required>
                <input
                  type="text"
                  value={formData.cedula}
                  onChange={(e) =>
                    setFormData({ ...formData, cedula: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                />
              </Campo>

              <Campo label="Nombre" required>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                />
              </Campo>

              <Campo label="Primer Apellido" required>
                <input
                  type="text"
                  value={formData.primer_apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, primer_apellido: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                />
              </Campo>

              <Campo label="Segundo Apellido">
                <input
                  type="text"
                  value={formData.segundo_apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, segundo_apellido: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Fecha de Nacimiento">
                <input
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_nacimiento: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Género">
                <select
                  value={formData.genero}
                  onChange={(e) =>
                    setFormData({ ...formData, genero: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </Campo>

              <Campo label="Estado Civil">
                <select
                  value={formData.estado_civil}
                  onChange={(e) =>
                    setFormData({ ...formData, estado_civil: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="soltero">Soltero(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="union_libre">Unión Libre</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viudo">Viudo(a)</option>
                </select>
              </Campo>

              <Campo label="Tipo de Sangre (RH)">
                <select
                  value={formData.rh}
                  onChange={(e) =>
                    setFormData({ ...formData, rh: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
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
              </Campo>
            </div>
          </section>

          {/* SECCIÓN: CONTACTO */}
          <section className="bg-[#212121] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#FFC107] mb-4">
              📞 Información de Contacto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Email">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Teléfono">
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Contacto de Emergencia">
                <input
                  type="text"
                  value={formData.contacto_emergencia}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacto_emergencia: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Teléfono de Emergencia">
                <input
                  type="tel"
                  value={formData.telefono_emergencia}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      telefono_emergencia: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Dirección">
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Ciudad">
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) =>
                    setFormData({ ...formData, ciudad: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>

              <Campo label="Departamento">
                <input
                  type="text"
                  value={formData.departamento_residencia}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departamento_residencia: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>
            </div>
          </section>

          {/* SECCIÓN: INFORMACIÓN LABORAL */}
          <section className="bg-[#212121] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#FFC107] mb-4">
              💼 Información Laboral
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Cargo" required>
                <select
                  value={formData.cargo}
                  onChange={(e) =>
                    setFormData({ ...formData, cargo: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                >
                  <option value="">Seleccionar cargo...</option>
                  <option value="Mecánico Industrial">Mecánico Industrial</option>
                  <option value="Soldador">Soldador</option>
                  <option value="Técnico Hidráulico">Técnico Hidráulico</option>
                  <option value="Técnico Eléctrico">Técnico Eléctrico</option>
                  <option value="Técnico Neumático">Técnico Neumático</option>
                  <option value="Operador de Maquinaria">Operador de Maquinaria</option>
                  <option value="Supervisor de Mantenimiento">Supervisor de Mantenimiento</option>
                  <option value="Supervisor HSE">Supervisor HSE</option>
                  <option value="Ingeniero Mecánico">Ingeniero Mecánico</option>
                  <option value="Ingeniero Industrial">Ingeniero Industrial</option>
                  <option value="Auxiliar de Mantenimiento">Auxiliar de Mantenimiento</option>
                  <option value="Coordinador de Operaciones">Coordinador de Operaciones</option>
                  <option value="Jefe de Taller">Jefe de Taller</option>
                  <option value="Asistente Administrativo">Asistente Administrativo</option>
                  <option value="Contador">Contador</option>
                  <option value="Gerente">Gerente</option>
                </select>
              </Campo>

              <Campo label="Departamento" required>
                <select
                  value={formData.departamento}
                  onChange={(e) =>
                    setFormData({ ...formData, departamento: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                >
                  <option value="">Seleccionar...</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                  <option value="Operaciones">Operaciones</option>
                  <option value="Taller">Taller</option>
                  <option value="HSE">HSE (Seguridad y Salud)</option>
                  <option value="Administración">Administración</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Contabilidad">Contabilidad</option>
                  <option value="Gerencia">Gerencia</option>
                </select>
              </Campo>

              <Campo label="Fecha de Ingreso" required>
                <input
                  type="date"
                  value={formData.fecha_ingreso}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_ingreso: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                />
              </Campo>

              <Campo label="Tipo de Contrato">
                <select
                  value={formData.tipo_contrato}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo_contrato: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="indefinido">Término Indefinido</option>
                  <option value="fijo">Término Fijo</option>
                  <option value="obra_labor">Obra o Labor</option>
                  <option value="prestacion_servicios">Prestación de Servicios</option>
                  <option value="aprendizaje">Aprendizaje SENA</option>
                </select>
              </Campo>

              <Campo label="Salario (COP)">
                <input
                  type="number"
                  value={formData.salario}
                  onChange={(e) =>
                    setFormData({ ...formData, salario: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: 2500000"
                />
              </Campo>

              <Campo label="Estado" required>
                <select
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  required
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="vacaciones">En Vacaciones</option>
                  <option value="incapacidad">En Incapacidad</option>
                  <option value="retirado">Retirado</option>
                </select>
              </Campo>
            </div>
          </section>

          {/* SECCIÓN: SEGURIDAD SOCIAL */}
          <section className="bg-[#212121] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#FFC107] mb-4">
              🏥 Seguridad Social
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="EPS">
                <input
                  type="text"
                  value={formData.eps}
                  onChange={(e) =>
                    setFormData({ ...formData, eps: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: Sura, Sanitas, Compensar"
                />
              </Campo>

              <Campo label="ARL">
                <input
                  type="text"
                  value={formData.arl}
                  onChange={(e) =>
                    setFormData({ ...formData, arl: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: Sura, Positiva, Colmena"
                />
              </Campo>

              <Campo label="Fondo de Pensiones (AFP)">
                <input
                  type="text"
                  value={formData.afp}
                  onChange={(e) =>
                    setFormData({ ...formData, afp: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: Porvenir, Protección, Colpensiones"
                />
              </Campo>

              <Campo label="Caja de Compensación">
                <input
                  type="text"
                  value={formData.caja_compensacion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caja_compensacion: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: Compensar, Cafam, Colsubsidio"
                />
              </Campo>
            </div>
          </section>

          {/* SECCIÓN: INFORMACIÓN BANCARIA */}
          <section className="bg-[#212121] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#FFC107] mb-4">
              🏦 Información Bancaria
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Campo label="Banco">
                <input
                  type="text"
                  value={formData.banco}
                  onChange={(e) =>
                    setFormData({ ...formData, banco: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: Bancolombia, Davivienda"
                />
              </Campo>

              <Campo label="Tipo de Cuenta">
                <select
                  value={formData.tipo_cuenta}
                  onChange={(e) =>
                    setFormData({ ...formData, tipo_cuenta: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  <option value="ahorros">Ahorros</option>
                  <option value="corriente">Corriente</option>
                </select>
              </Campo>

              <Campo label="Número de Cuenta">
                <input
                  type="text"
                  value={formData.numero_cuenta}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_cuenta: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                />
              </Campo>
            </div>
          </section>

          {/* SECCIÓN: INFORMACIÓN ADICIONAL */}
          <section className="bg-[#212121] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#FFC107] mb-4">
              📚 Información Adicional
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Nivel Educativo">
                <select
                  value={formData.nivel_educativo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nivel_educativo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
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
              </Campo>

              <Campo label="Profesión">
                <input
                  type="text"
                  value={formData.profesion}
                  onChange={(e) =>
                    setFormData({ ...formData, profesion: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none"
                  placeholder="Ej: Ingeniero Mecánico"
                />
              </Campo>

              <div className="md:col-span-2">
                <Campo label="Observaciones">
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        observaciones: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:border-[#FFC107] focus:outline-none resize-none"
                    placeholder="Notas adicionales sobre el trabajador..."
                  />
                </Campo>
              </div>
            </div>
          </section>

          {/* BOTONES */}
          <div className="flex justify-end gap-4 pt-4">
            <Link
              href={`/trabajadores/${trabajadorId}`}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-2 bg-[#FFC107] text-[#1A1A1A] font-semibold rounded-lg hover:bg-[#FFD54F] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
