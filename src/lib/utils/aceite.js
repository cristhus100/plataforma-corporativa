// ============================================
// ESTADOS DE ALERTA DE CAMBIO DE ACEITE
// ============================================
// ============================================
// ACEITE DE MOTOR (incluye filtro de aceite)
// Cambio cada 300 horas
// ============================================
export const UMBRALES_ACEITE = {
  PROXIMO: 200,
  CRITICO: 250,
  VENCIDO: 300,
};

export const ESTADOS_ALERTA_ACEITE = {
  VENCIDO: {
    label: 'Vencido',
    badge: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
    dot: 'bg-red-500',
  },
  CRITICO: {
    label: 'Crítico',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600',
    dot: 'bg-orange-500',
  },
  PROXIMO: {
    label: 'Próximo',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
    dot: 'bg-yellow-500',
  },
  VIGENTE: {
    label: 'Vigente',
    badge: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
    dot: 'bg-green-500',
  },
  SIN_DATO: {
    label: 'Sin registro',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    iconColor: 'text-gray-400',
    dot: 'bg-gray-400',
  },
};

export function calcularEstadoAceite(horometroActual, ultimoCambioHorometro) {
  if (horometroActual == null) return 'SIN_DATO';
  if (ultimoCambioHorometro == null) return 'SIN_DATO';
  const horas = Math.max(0, (horometroActual || 0) - ultimoCambioHorometro);
  if (horas >= UMBRALES_ACEITE.VENCIDO) return 'VENCIDO';
  if (horas >= UMBRALES_ACEITE.CRITICO) return 'CRITICO';
  if (horas >= UMBRALES_ACEITE.PROXIMO) return 'PROXIMO';
  return 'VIGENTE';
}

export function calcularHorasDesdeCambio(horometroActual, ultimoCambioHorometro) {
  if (ultimoCambioHorometro == null) return 0;
  return Math.max(0, (horometroActual || 0) - ultimoCambioHorometro);
}

export function getEstadoAceiteConfig(estado) {
  return ESTADOS_ALERTA_ACEITE[estado] || ESTADOS_ALERTA_ACEITE.SIN_DATO;
}

export function getEstadoAceiteBadge(estado) {
  const config = getEstadoAceiteConfig(estado);
  return config.badge;
}

export function getEstadoAceiteLabel(estado) {
  const config = getEstadoAceiteConfig(estado);
  return config.label;
}

export function getEstadoAceiteIconColor(estado) {
  const config = getEstadoAceiteConfig(estado);
  return config.iconColor;
}

export function getEstadoAceiteDot(estado) {
  const config = getEstadoAceiteConfig(estado);
  return config.dot;
}

// ============================================
// FILTROS DE COMBUSTIBLE
// Cambio cada 120 horas
// ============================================
export const UMBRALES_FILTRO_COMBUSTIBLE = {
  PROXIMO: 80,
  CRITICO: 100,
  VENCIDO: 120,
};

export function calcularEstadoFiltroCombustible(horometroActual, ultimoCambioHorometro) {
  if (horometroActual == null) return 'SIN_DATO';
  if (ultimoCambioHorometro == null) return 'SIN_DATO';
  const horas = Math.max(0, (horometroActual || 0) - ultimoCambioHorometro);
  if (horas >= UMBRALES_FILTRO_COMBUSTIBLE.VENCIDO) return 'VENCIDO';
  if (horas >= UMBRALES_FILTRO_COMBUSTIBLE.CRITICO) return 'CRITICO';
  if (horas >= UMBRALES_FILTRO_COMBUSTIBLE.PROXIMO) return 'PROXIMO';
  return 'VIGENTE';
}

export function calcularHorasDesdeCambioFiltro(horometroActual, ultimoCambioHorometro) {
  if (ultimoCambioHorometro == null) return 0;
  return Math.max(0, (horometroActual || 0) - ultimoCambioHorometro);
}

// ============================================
// FILTROS DE AIRE
// Alertas basadas en condición del operador
// buena -> VIGENTE, regular -> PROXIMO, critica -> CRITICO
// ============================================
export function calcularEstadoFiltroAire(condicion) {
  if (!condicion) return 'SIN_DATO';
  switch (condicion) {
    case 'critica': return 'CRITICO';
    case 'regular': return 'PROXIMO';
    case 'buena': return 'VIGENTE';
    default: return 'SIN_DATO';
  }
}
