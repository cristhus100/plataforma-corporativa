// ============================================
// ESTADOS DE VEHÍCULOS
// ============================================
export const ESTADOS_VEHICULO = {
  operativo: {
    label: 'Operativo',
    badge: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    icon: '✓',
  },
  en_mantenimiento: {
    label: 'En Mantenimiento',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    icon: '🔧',
  },
  fuera_servicio: {
    label: 'Fuera de Servicio',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    icon: '✕',
  },
}

// Lista plana para usar en selects (nuevo/editar)
export const ESTADOS_VEHICULO_LIST = Object.entries(ESTADOS_VEHICULO).map(
  ([value, config]) => ({ value, label: config.label })
)

// Helpers
export const getEstadoLabel = (estado) =>
  ESTADOS_VEHICULO[estado]?.label || estado

export const getEstadoBadge = (estado) =>
  ESTADOS_VEHICULO[estado]?.badge || 'bg-gray-100 text-gray-800 border-gray-200'

export const getEstadoIcon = (estado) =>
  ESTADOS_VEHICULO[estado]?.icon || '•'

export const getEstadoDot = (estado) =>
  ESTADOS_VEHICULO[estado]?.dot || 'bg-gray-500'

// ============================================
// TIPOS DE VEHÍCULOS
// ============================================
export const TIPOS_VEHICULO = [
  { value: 'particular', label: 'Particular' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'camion', label: 'Camión' },
  { value: 'moto', label: 'Moto' },
  { value: 'otro', label: 'Otro' },
]

// ============================================
// FORMATEO
// ============================================
export const formatearFecha = (f) =>
  f
    ? new Date(f).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A'

export const formatearMoneda = (n) =>
  n ? '$' + Number(n).toLocaleString('es-CO') : 'N/A'
