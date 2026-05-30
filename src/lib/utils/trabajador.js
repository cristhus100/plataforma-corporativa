// ============================================
// ESTADOS DE TRABAJADORES
// ============================================
export const ESTADOS_TRABAJADOR = {
  activo: { label: 'Activo', badge: 'border-green-200 bg-green-50 text-green-700', dot: 'bg-green-500' },
  inactivo: { label: 'Inactivo', badge: 'border-gray-200 bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  vacaciones: { label: 'Vacaciones', badge: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  incapacidad: { label: 'Incapacidad', badge: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  retirado: { label: 'Retirado', badge: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
}

export const getEstadoTrabajador = (trabajador) => {
  if (!trabajador) return ESTADOS_TRABAJADOR.inactivo
  const activo = trabajador.activo
  const estado = trabajador.estado || (activo ? 'activo' : 'inactivo')
  return ESTADOS_TRABAJADOR[estado] || ESTADOS_TRABAJADOR.inactivo
}

/**
 * Utilidades para manejo de datos de trabajadores
 */

export function getNombreCompleto(trabajador) {
  if (!trabajador) return 'Sin nombre';

  if (trabajador.nombre || trabajador.primer_apellido) {
    const partes = [
      trabajador.nombre,
      trabajador.primer_apellido,
      trabajador.segundo_apellido,
    ].filter(Boolean);
    if (partes.length > 0) return partes.join(' ');
  }

  if (trabajador.nombres || trabajador.apellidos) {
    const partes = [trabajador.nombres, trabajador.apellidos].filter(Boolean);
    if (partes.length > 0) return partes.join(' ');
  }

  return 'Sin nombre';
}

export function getIniciales(trabajador) {
  if (!trabajador) return '?';

  const nombre = trabajador.nombre || trabajador.nombres || '';
  const apellido = trabajador.primer_apellido || trabajador.apellidos || '';

  const inicial1 = nombre.trim().charAt(0).toUpperCase();
  const inicial2 = apellido.trim().charAt(0).toUpperCase();

  const iniciales = `${inicial1}${inicial2}`.trim();
  return iniciales || '?';
}

export function getPrimerNombre(trabajador) {
  if (!trabajador) return '';
  if (trabajador.nombre) return trabajador.nombre.trim().split(' ')[0];
  if (trabajador.nombres) return trabajador.nombres.trim().split(' ')[0];
  return '';
}

export function getPrimerApellido(trabajador) {
  if (!trabajador) return '';
  if (trabajador.primer_apellido) return trabajador.primer_apellido.trim();
  if (trabajador.apellidos) return trabajador.apellidos.trim().split(' ')[0];
  return '';
}

export function getNombreCorto(trabajador) {
  const nombre = getPrimerNombre(trabajador);
  const apellido = getPrimerApellido(trabajador);
  return [nombre, apellido].filter(Boolean).join(' ') || 'Sin nombre';
}
