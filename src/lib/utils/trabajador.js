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
