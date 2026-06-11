/**
 * TURNOS - Utilidades de frontend
 */

// ============================================
// CONSTANTES DE TURNOS
// ============================================
export const TURNOS = {
  A: { codigo: 'A', nombre: 'Turno A', horaInicio: '07:00', horaFin: '15:00', color: '#3B82F6', bgColor: '#EFF6FF' },
  B: { codigo: 'B', nombre: 'Turno B', horaInicio: '15:00', horaFin: '23:00', color: '#F59E0B', bgColor: '#FFFBEB' },
  C: { codigo: 'C', nombre: 'Turno C', horaInicio: '23:00', horaFin: '07:00', color: '#8B5CF6', bgColor: '#F5F3FF' },
};

export const getTurnoInfo = (codigo) => {
  return TURNOS[codigo] || null;
};

export const getTurnoInfoById = (tiposTurno, id) => {
  return tiposTurno.find(t => t.id === id) || null;
};

// ============================================
// ESTADOS DE ASIGNACIÓN
// ============================================
export const ESTADOS_ASIGNACION = {
  activo: { label: 'Activo', badge: 'border-green-200 bg-green-50 text-green-700', dot: 'bg-green-500' },
  inactivo: { label: 'Inactivo', badge: 'border-gray-200 bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  suspendido: { label: 'Suspendido', badge: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
};

// ============================================
// ESTADOS DE ASISTENCIA
// ============================================
export const ESTADOS_ASISTENCIA = {
  pendiente: { label: 'Pendiente', badge: 'border-gray-200 bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  presente: { label: 'Presente', badge: 'border-green-200 bg-green-50 text-green-700', dot: 'bg-green-500' },
  ausente: { label: 'Ausente', badge: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  permiso: { label: 'Permiso', badge: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  incapacidad: { label: 'Incapacidad', badge: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  vacaciones: { label: 'Vacaciones', badge: 'border-purple-200 bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  festivo: { label: 'Festivo', badge: 'border-teal-200 bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  suspension: { label: 'Suspensión', badge: 'border-red-300 bg-red-100 text-red-800', dot: 'bg-red-600' },
};

// ============================================
// HELPERS DE FECHAS
// ============================================

/**
 * Obtiene la semana actual (lunes a domingo)
 * @param {Date} [date] - Fecha de referencia
 * @returns {{ inicio: string, fin: string }} YYYY-MM-DD
 */
export function getSemanaActual(date = new Date()) {
  const dia = date.getDay(); // 0=domingo, 1=lunes...
  const diff = dia === 0 ? 6 : dia - 1; // Ajustar para que lunes sea el día 0
  const lunes = new Date(date);
  lunes.setDate(date.getDate() - diff);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  return {
    inicio: formatDate(lunes),
    fin: formatDate(domingo),
  };
}

/**
 * Formatea una fecha a YYYY-MM-DD
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Formatea una fecha a formato legible en español
 * @param {Date|string} date
 * @param {boolean} [includeYear=true]
 * @returns {string}
 */
export function formatDateEs(date, includeYear = true) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const opciones = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  };
  return d.toLocaleDateString('es-CO', opciones);
}

/**
 * Formatea hora TIME a string legible
 * @param {string} time - '07:00' o '07:00:00'
 * @returns {string}
 */
export function formatTime(time) {
  if (!time) return '--:--';
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Obtiene los días de una semana (lunes a domingo) como objetos Date
 * @param {string} fechaInicio - YYYY-MM-DD (lunes)
 * @returns {Array<{ date: Date, dateStr: string, label: string, isToday: boolean }>}
 */
export function getDiasSemana(fechaInicio) {
  const inicio = new Date(fechaInicio + 'T12:00:00');
  const hoy = formatDate(new Date());
  const dias = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(inicio);
    date.setDate(inicio.getDate() + i);
    const dateStr = formatDate(date);
    const label = date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    dias.push({
      date,
      dateStr,
      label,
      isToday: dateStr === hoy,
    });
  }

  return dias;
}

/**
 * Navega una semana hacia adelante o atrás
 * @param {string} fechaActual - YYYY-MM-DD
 * @param {number} direccion - 1 (adelante) o -1 (atrás)
 * @returns {string} nueva fecha inicio de semana (lunes)
 */
export function navegarSemana(fechaActual, direccion) {
  const d = new Date(fechaActual + 'T12:00:00');
  d.setDate(d.getDate() + (direccion * 7));
  const dia = d.getDay();
  const diff = dia === 0 ? 6 : dia - 1;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - diff);
  return formatDate(lunes);
}

/**
 * Verifica si dos rangos de fechas se solapan
 */
export function fechasSeSolapan(inicio1, fin1, inicio2, fin2) {
  const i1 = new Date(inicio1);
  const f1 = fin1 ? new Date(fin1) : new Date('9999-12-31');
  const i2 = new Date(inicio2);
  const f2 = fin2 ? new Date(fin2) : new Date('9999-12-31');
  return i1 <= f2 && i2 <= f1;
}

/**
 * Obtiene el nombre completo de un trabajador
 */
export function getNombreCompleto(trabajador) {
  if (!trabajador) return 'Sin nombre';
  const partes = [
    trabajador.nombre,
    trabajador.primer_apellido,
    trabajador.segundo_apellido,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Sin nombre';
}
