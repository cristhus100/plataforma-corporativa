/**
 * AUDITORÍA - Helpers de consultas Supabase
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Obtiene todos los frentes de trabajo activos.
 * @returns {Promise<Array>}
 */
export async function getFrentesTrabajo() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('frentes_trabajo')
    .select(`
      *,
      responsable:trabajadores!responsable_id(id, nombre, primer_apellido, cedula)
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene un frente de trabajo por su ID.
 * @param {number} frenteId
 * @returns {Promise<object|null>}
 */
export async function getFrenteById(frenteId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('frentes_trabajo')
    .select(`
      *,
      responsable:trabajadores!responsable_id(id, nombre, primer_apellido, cedula, cargo:cargos(nombre))
    `)
    .eq('id', frenteId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obtiene todos los empleados de un frente con sus documentos.
 * @param {number} frenteId
 * @returns {Promise<Array>}
 */
export async function getEmpleadosConDocumentos(frenteId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('trabajadores')
    .select(`
      id,
      nombre,
      primer_apellido,
      segundo_apellido,
      cedula,
      cargo:cargos(id, nombre),
      departamento_area:departamentos(id, nombre),
      activo,
      estado,
      eps,
      arl,
      fondo_pension,
      caja_compensacion,
      documentos_trabajadores(
        id,
        numero_documento,
        fecha_emision,
        fecha_vencimiento,
        observaciones,
        tipo_documento_id,
        tipos_documentos_trabajador!tipo_documento_id (
          id,
          nombre,
          requiere_vencimiento
        )
      )
    `)
    .eq('frente_trabajo_id', frenteId)
    .order('primer_apellido', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene toda la maquinaria de un frente con sus documentos y mantenimientos.
 * @param {number} frenteId
 * @returns {Promise<Array>}
 */
export async function getMaquinariaCompleta(frenteId) {
  const supabase = createClient();

  // 1. Obtener maquinaria con documentos
  const { data: maquinaria, error: err1 } = await supabase
    .from('maquinaria')
    .select(`
      id,
      codigo_interno,
      nombre,
      marca,
      modelo,
      placa,
      numero_serie,
      estado,
      activo,
      horometro_actual,
      ultimo_cambio_aceite_horometro,
      ultimo_cambio_aceite_fecha,
      ultimo_cambio_filtro_combustible_horometro,
      ultimo_cambio_filtro_combustible_fecha,
      ultima_condicion_filtro_aire,
      tipo_maquinaria_id,
      tipos_maquinaria(id, nombre),
      documentos_maquinaria(
        id,
        numero_documento,
        fecha_emision,
        fecha_vencimiento,
        observaciones,
        tipo_documento_id,
        tipos_documentos_maquinaria!tipo_documento_id (
          id,
          nombre,
          requiere_vencimiento
        )
      )
    `)
    .eq('frente_trabajo_id', frenteId)
    .eq('activo', true)
    .order('codigo_interno', { ascending: true });

  if (err1) throw err1;

  // 2. Para cada máquina, obtener mantenimientos recientes
  const maquinariaConMant = await Promise.all(
    (maquinaria || []).map(async (maq) => {
      const { data: mantenimientos, error: err2 } = await supabase
        .from('mantenimientos')
        .select('id, tipo, fecha, descripcion')
        .eq('maquinaria_id', maq.id)
        .order('fecha', { ascending: false })
        .limit(5);

      if (err2) throw err2;
      return { ...maq, mantenimientos: mantenimientos || [] };
    })
  );

  return maquinariaConMant || [];
}

/**
 * Obtiene todos los datos necesarios para una auditoría de un frente.
 * @param {number} frenteId
 * @returns {Promise<{ frente: object, empleados: Array, maquinaria: Array }>}
 */
export async function getDatosAuditoria(frenteId) {
  const [frente, empleados, maquinaria] = await Promise.all([
    getFrenteById(frenteId),
    getEmpleadosConDocumentos(frenteId),
    getMaquinariaCompleta(frenteId),
  ]);

  return { frente, empleados, maquinaria };
}
