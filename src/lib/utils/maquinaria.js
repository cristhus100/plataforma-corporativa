// ============================================
// ESTADOS DE MAQUINARIA
// ============================================
export const ESTADOS_MAQUINARIA = {
  operativa: { 
    label: 'Operativa', 
    color: 'green',
    badge: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    icon: '✓'
  },
  en_mantenimiento: { 
    label: 'En Mantenimiento', 
    color: 'yellow',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    icon: '🔧'
  },
  en_reparacion: { 
    label: 'En Reparación', 
    color: 'orange',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
    icon: '⚠️'
  },
  fuera_servicio: { 
    label: 'Fuera de Servicio', 
    color: 'red',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    icon: '✕'
  },
  dada_de_baja: { 
    label: 'Dada de Baja', 
    color: 'gray',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
    icon: '🚫'
  },
};

// Funciones existentes (mantenidas)
export const getEstadoLabel = (estado) => 
  ESTADOS_MAQUINARIA[estado]?.label || estado;

export const getEstadoColor = (estado) => 
  ESTADOS_MAQUINARIA[estado]?.color || 'gray';

// Nuevas funciones
export const getEstadoConfig = (estado) => 
  ESTADOS_MAQUINARIA[estado] || ESTADOS_MAQUINARIA.operativa;

export const getEstadoBadge = (estado) => 
  ESTADOS_MAQUINARIA[estado]?.badge || 'bg-gray-100 text-gray-800 border-gray-200';

export const getEstadoDot = (estado) => 
  ESTADOS_MAQUINARIA[estado]?.dot || 'bg-gray-500';

export const getEstadoIcon = (estado) => 
  ESTADOS_MAQUINARIA[estado]?.icon || '•';

// ============================================
// FORMATEO COLOMBIANO
// ============================================

// Formatear fecha al formato Colombia (DD/MM/YYYY)
export const formatearFecha = (fecha) => {
  if (!fecha) return 'N/A';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Formatear fecha larga (15 de enero de 2025)
export const formatearFechaLarga = (fecha) => {
  if (!fecha) return 'N/A';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// Formatear moneda colombiana (COP)
export const formatearMoneda = (valor) => {
  if (!valor && valor !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(valor);
};

// Formatear número con separadores de miles
export const formatearNumero = (numero) => {
  if (!numero && numero !== 0) return '0';
  return new Intl.NumberFormat('es-CO').format(numero);
};

// ============================================
// ALERTAS Y VENCIMIENTOS
// ============================================

// Calcular días hasta una fecha (negativo si ya venció)
export const diasHastaVencimiento = (fecha) => {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fecha);
  vencimiento.setHours(0, 0, 0, 0);
  const diff = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));
  return diff;
};

// Obtener estado de alerta según días restantes
export const getEstadoAlerta = (dias) => {
  if (dias === null || dias === undefined) {
    return { 
      label: 'Sin fecha', 
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      nivel: 'sin_fecha'
    };
  }
  if (dias < 0) {
    return { 
      label: `Vencido hace ${Math.abs(dias)} días`, 
      color: 'bg-red-100 text-red-800 border-red-200',
      nivel: 'vencido'
    };
  }
  if (dias === 0) {
    return { 
      label: 'Vence hoy', 
      color: 'bg-red-100 text-red-800 border-red-200',
      nivel: 'critico'
    };
  }
  if (dias <= 7) {
    return { 
      label: `Vence en ${dias} días`, 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      nivel: 'critico'
    };
  }
  if (dias <= 30) {
    return { 
      label: `Vence en ${dias} días`, 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      nivel: 'proximo'
    };
  }
  return { 
    label: `Vigente (${dias} días)`, 
    color: 'bg-green-100 text-green-800 border-green-200',
    nivel: 'vigente'
  };
};

// ============================================
// UTILIDADES VARIAS
// ============================================

// Calcular antigüedad en años desde una fecha
export const calcularAntiguedad = (fecha) => {
  if (!fecha) return null;
  const hoy = new Date();
  const inicio = new Date(fecha);
  const años = hoy.getFullYear() - inicio.getFullYear();
  const meses = hoy.getMonth() - inicio.getMonth();
  
  if (meses < 0 || (meses === 0 && hoy.getDate() < inicio.getDate())) {
    return años - 1;
  }
  return años;
};

// Obtener URL pública de Supabase Storage
export const getStorageUrl = (bucket, path) => {
  if (!path) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
};
