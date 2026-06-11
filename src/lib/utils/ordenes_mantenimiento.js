// ============================================
// ÓRDENES DE MANTENIMIENTO - Constantes y utilerías
// ============================================

export const TIPOS_MANTENIMIENTO = {
  preventivo: {
    label: 'Preventivo',
    color: 'blue',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    icon: '🔧',
  },
  correctivo: {
    label: 'Correctivo',
    color: 'orange',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
    icon: '⚠️',
  },
  predictivo: {
    label: 'Predictivo',
    color: 'purple',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
    icon: '📊',
  },
};

export const PRIORIDADES = {
  baja: {
    label: 'Baja',
    color: 'green',
    badge: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
  },
  media: {
    label: 'Media',
    color: 'yellow',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  alta: {
    label: 'Alta',
    color: 'orange',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  critica: {
    label: 'Crítica',
    color: 'red',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
};

export const ESTADOS_ORDEN = {
  pendiente: {
    label: 'Pendiente',
    color: 'yellow',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    icon: '⏳',
  },
  en_proceso: {
    label: 'En Proceso',
    color: 'blue',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    icon: '🔄',
  },
  completado: {
    label: 'Completado',
    color: 'green',
    badge: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    icon: '✅',
  },
  cancelado: {
    label: 'Cancelado',
    color: 'red',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    icon: '✕',
  },
};

// Helpers
export const getTipoLabel = (tipo) => TIPOS_MANTENIMIENTO[tipo]?.label || tipo;
export const getTipoBadge = (tipo) => TIPOS_MANTENIMIENTO[tipo]?.badge || 'bg-gray-100 text-gray-800 border-gray-200';
export const getTipoDot = (tipo) => TIPOS_MANTENIMIENTO[tipo]?.dot || 'bg-gray-500';
export const getTipoIcon = (tipo) => TIPOS_MANTENIMIENTO[tipo]?.icon || '•';

export const getPrioridadLabel = (p) => PRIORIDADES[p]?.label || p;
export const getPrioridadBadge = (p) => PRIORIDADES[p]?.badge || 'bg-gray-100 text-gray-800 border-gray-200';
export const getPrioridadDot = (p) => PRIORIDADES[p]?.dot || 'bg-gray-500';

export const getEstadoLabel = (e) => ESTADOS_ORDEN[e]?.label || e;
export const getEstadoBadge = (e) => ESTADOS_ORDEN[e]?.badge || 'bg-gray-100 text-gray-800 border-gray-200';
export const getEstadoDot = (e) => ESTADOS_ORDEN[e]?.dot || 'bg-gray-500';
export const getEstadoIcon = (e) => ESTADOS_ORDEN[e]?.icon || '•';

// Formatear moneda COP
export const formatearMoneda = (valor) => {
  if (!valor && valor !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
};

// Formatear fecha
export const formatearFecha = (fecha) => {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Diferencia en días desde hoy
export const diasDesdeHoy = (fecha) => {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
};

// Estado del calendario según fecha programada
export const getEstadoProgramacion = (fechaProgramada, estado) => {
  if (estado === 'completado') return { label: 'Completado', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' };
  if (estado === 'cancelado') return { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };

  const dias = diasDesdeHoy(fechaProgramada);
  if (dias === null) return { label: 'Sin fecha', color: 'text-gray-500', bg: 'bg-gray-50', dot: 'bg-gray-400' };
  if (dias < 0) return { label: `Atrasada ${Math.abs(dias)} días`, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
  if (dias === 0) return { label: 'Programada hoy', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' };
  if (dias <= 3) return { label: `En ${dias} días`, color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500' };
  return { label: `En ${dias} días`, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' };
};
