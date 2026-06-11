/**
 * TURNOS - Helpers de consultas Supabase
 */

import { createClient } from '@/lib/supabase/client';

const SANTA_ROSA_CODIGO = 'FT-SR';

/**
 * Obtiene el ID del frente Santa Rosa (lo busca o lo crea si no existe)
 * @returns {Promise<number>}
 */
export async function getSantaRosaFrenteId() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('frentes_trabajo')
    .select('id')
    .eq('codigo', SANTA_ROSA_CODIGO)
    .maybeSingle();

  if (error) throw error;

  if (data) return data.id;

  // Si no existe, lo creamos
  const { data: created, error: createError } = await supabase
    .from('frentes_trabajo')
    .insert({
      codigo: SANTA_ROSA_CODIGO,
      nombre: 'Santa Rosa',
      ubicacion: 'Vereda Santa Rosa',
      ciudad: 'Santa Rosa de Osos',
      departamento: 'Antioquia',
      activo: true,
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}

/**
 * Obtiene los 3 tipos de turno (A, B, C)
 * @returns {Promise<Array>}
 */
export async function getTiposTurno() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tipos_turno')
    .select('*')
    .eq('activo', true)
    .order('codigo', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene todos los empleados activos (sin filtrar por frente)
 * @returns {Promise<Array>}
 */
export async function getEmpleadosActivos() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('trabajadores')
    .select('id, nombre, primer_apellido, segundo_apellido, cedula, cargo:cargos(id, nombre), estado, activo, frente_trabajo_id')
    .eq('estado', 'activo')
    .eq('activo', true)
    .order('primer_apellido', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene empleados asignados al frente Santa Rosa
 * @returns {Promise<Array>}
 */
export async function getEmpleadosSantaRosa() {
  const supabase = createClient();
  const frenteId = await getSantaRosaFrenteId();

  const { data, error } = await supabase
    .from('trabajadores')
    .select('id, nombre, primer_apellido, segundo_apellido, cedula, cargo:cargos(id, nombre), estado, activo')
    .eq('frente_trabajo_id', frenteId)
    .eq('activo', true)
    .order('primer_apellido', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene todas las asignaciones de turno activas
 * @param {object} options - Opciones de filtro
 * @param {number} [options.frenteId] - Filtrar por frente
 * @param {string} [options.estado] - Filtrar por estado
 * @param {string} [options.fecha] - Filtrar asignaciones vigentes en una fecha
 * @returns {Promise<Array>}
 */
export async function getAsignacionesTurno(options = {}) {
  const supabase = createClient();
  const { frenteId, estado, fecha } = options;

  let query = supabase
    .from('asignaciones_turno')
    .select(`
      *,
      trabajador:trabajadores!trabajador_id(id, nombre, primer_apellido, segundo_apellido, cedula, cargo:cargos(id, nombre)),
      tipo_turno:tipos_turno!tipo_turno_id(*),
      frente:frentes_trabajo!frente_trabajo_id(id, codigo, nombre)
    `)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (frenteId) query = query.eq('frente_trabajo_id', frenteId);
  if (estado) query = query.eq('estado', estado);

  // Si se pasa una fecha, filtrar asignaciones vigentes en esa fecha
  if (fecha) {
    query = query.lte('fecha_inicio', fecha).or(`fecha_fin.is.null,fecha_fin.gte.${fecha}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Obtiene una asignación de turno por ID
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function getAsignacionTurnoById(id) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('asignaciones_turno')
    .select(`
      *,
      trabajador:trabajadores!trabajador_id(*, cargo:cargos(id, nombre)),
      tipo_turno:tipos_turno!tipo_turno_id(*),
      frente:frentes_trabajo!frente_trabajo_id(id, codigo, nombre)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Crea una o varias asignaciones de turno
 * @param {Array|object} asignaciones - Una o varias asignaciones
 * @returns {Promise<Array>}
 */
export async function crearAsignacionesTurno(asignaciones) {
  const supabase = createClient();
  const data = Array.isArray(asignaciones) ? asignaciones : [asignaciones];

  const { data: result, error } = await supabase
    .from('asignaciones_turno')
    .insert(data)
    .select();

  if (error) throw error;
  return result || [];
}

/**
 * Actualiza una asignación de turno
 * @param {number} id
 * @param {object} cambios
 * @returns {Promise<object>}
 */
export async function actualizarAsignacionTurno(id, cambios) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('asignaciones_turno')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Elimina (desactiva) una asignación de turno
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function eliminarAsignacionTurno(id) {
  const supabase = createClient();
  const { error } = await supabase
    .from('asignaciones_turno')
    .update({ activo: false, estado: 'inactivo' })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Verifica si un empleado ya tiene una asignación activa que se solape con un rango de fechas
 * @param {number} trabajadorId
 * @param {string} fechaInicio
 * @param {string|null} fechaFin
 * @param {number} [excluirId] - ID de asignación a excluir (para edición)
 * @returns {Promise<boolean>}
 */
export async function tieneAsignacionSolapada(trabajadorId, fechaInicio, fechaFin, excluirId) {
  const supabase = createClient();

  let query = supabase
    .from('asignaciones_turno')
    .select('id, fecha_inicio, fecha_fin')
    .eq('trabajador_id', trabajadorId)
    .eq('activo', true)
    .eq('estado', 'activo')
    .lte('fecha_inicio', fechaFin || '9999-12-31')
    .or(`fecha_fin.is.null,fecha_fin.gte.${fechaInicio}`);

  if (excluirId) {
    query = query.neq('id', excluirId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).length > 0;
}

// ============================================================
// ASISTENCIA
// ============================================================

/**
 * Obtiene los registros de asistencia para una fecha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {object} [options]
 * @param {number} [options.frenteId] - Filtrar por frente
 * @param {number} [options.tipoTurnoId] - Filtrar por tipo de turno
 * @returns {Promise<Array>}
 */
export async function getAsistenciaPorFecha(fecha, options = {}) {
  const supabase = createClient();
  const { frenteId, tipoTurnoId } = options;

  let query = supabase
    .from('registro_asistencia_turno')
    .select(`
      *,
      trabajador:trabajadores!trabajador_id(id, nombre, primer_apellido, segundo_apellido, cedula),
      tipo_turno:tipos_turno!tipo_turno_id(*),
      asignacion:asignaciones_turno!asignacion_turno_id(
        id,
        tipo_turno:tipos_turno!tipo_turno_id(*)
      ),
      registrador:trabajadores!marcado_por(id, nombre, primer_apellido),
      reemplazo:trabajadores!reemplazado_por(id, nombre, primer_apellido)
    `)
    .eq('fecha', fecha);

  if (frenteId) query = query.eq('frente_trabajo_id', frenteId);
  if (tipoTurnoId) query = query.eq('tipo_turno_id', tipoTurnoId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Registra o actualiza asistencia de un empleado en una fecha
 * @param {object} registro
 * @returns {Promise<object>}
 */
export async function registrarAsistencia(registro) {
  const supabase = createClient();

  // Upsert: si ya existe un registro para ese trabajador+fecha+turno, lo actualiza
  const { data, error } = await supabase
    .from('registro_asistencia_turno')
    .upsert({
      trabajador_id: registro.trabajador_id,
      fecha: registro.fecha,
      tipo_turno_id: registro.tipo_turno_id,
      asignacion_turno_id: registro.asignacion_turno_id,
      frente_trabajo_id: registro.frente_trabajo_id,
      estado_asistencia: registro.estado_asistencia,
      hora_llegada: registro.hora_llegada || null,
      hora_salida: registro.hora_salida || null,
      novedad: registro.novedad || null,
      requiere_reemplazo: registro.requiere_reemplazo || false,
      reemplazado_por: registro.reemplazado_por || null,
      marcado_por: registro.marcado_por || null,
      marcado_en: new Date().toISOString(),
    }, {
      onConflict: 'trabajador_id, fecha, tipo_turno_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra asistencia masiva para varios empleados en una fecha
 * @param {Array} registros
 * @returns {Promise<Array>}
 */
export async function registrarAsistenciaMasiva(registros) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('registro_asistencia_turno')
    .upsert(
      registros.map(r => ({
        ...r,
        marcado_en: new Date().toISOString(),
      })),
      {
        onConflict: 'trabajador_id, fecha, tipo_turno_id',
      }
    )
    .select();

  if (error) throw error;
  return data || [];
}

/**
 * Obtiene el resumen de asistencia para un rango de fechas
 * @param {string} fechaInicio - YYYY-MM-DD
 * @param {string} fechaFin - YYYY-MM-DD
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function getResumenAsistencia(fechaInicio, fechaFin, options = {}) {
  const supabase = createClient();
  const { frenteId } = options;

  let query = supabase
    .from('registro_asistencia_turno')
    .select('fecha, estado_asistencia, tipo_turno_id, trabajador_id')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin);

  if (frenteId) query = query.eq('frente_trabajo_id', frenteId);

  const { data, error } = await query;
  if (error) throw error;

  const registros = data || [];

  return {
    total: registros.length,
    presentes: registros.filter(r => r.estado_asistencia === 'presente').length,
    ausentes: registros.filter(r => r.estado_asistencia === 'ausente').length,
    permisos: registros.filter(r => r.estado_asistencia === 'permiso').length,
    incapacidades: registros.filter(r => r.estado_asistencia === 'incapacidad').length,
    vacaciones: registros.filter(r => r.estado_asistencia === 'vacaciones').length,
    pendientes: registros.filter(r => r.estado_asistencia === 'pendiente').length,
    registros,
  };
}
