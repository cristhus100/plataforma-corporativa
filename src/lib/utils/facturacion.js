/**
 * Utilidades para el módulo de Facturación / Cartera
 */

// Tarifas de retención (valores de referencia 2026)
export const TARIFAS_RETENCION = {
  fuente_servicios: 0.04,       // 4% retención en la fuente sobre servicios
  fuente_compras: 0.025,        // 2.5% sobre compras
  ica_mantenimiento: 0.004,     // 0.4% ICA sobre mantenimiento (ej. Bogotá)
  iva: 0.19,                    // 19% IVA estándar
  iva_retencion: 0.15,          // 15% de retención de IVA
};

/**
 * Calcular valores de una factura a partir de sus items
 * @param {Array} items - Array de { cantidad, valor_unitario, descuento_item, porcentaje_iva }
 * @param {Object} opciones - { iva_porcentaje, aplicar_retencion_fuente, aplicar_retencion_ica }
 * @returns {Object} { subtotal, descuento, base_iva, iva, retencion_fuente, retencion_ica, total }
 */
export function calcularValoresFactura(items, opciones = {}) {
  const {
    iva_porcentaje = 19,
    aplicar_retencion_fuente = false,
    aplicar_retencion_ica = false,
  } = opciones;

  const iva_tarifa = iva_porcentaje / 100;

  let subtotal = 0;
  let descuento = 0;
  let base_iva = 0;
  let iva = 0;

  items.forEach(item => {
    const cantidad = Number(item.cantidad) || 1;
    const valorUnitario = Number(item.valor_unitario) || 0;
    const descuentoItem = Number(item.descuento_item) || 0;
    const porcentajeIva = Number(item.porcentaje_iva) || iva_tarifa;

    const bruto = cantidad * valorUnitario;
    subtotal += bruto;
    descuento += descuentoItem;

    const baseConIva = bruto - descuentoItem;
    base_iva += baseConIva;
    iva += baseConIva * (porcentajeIva / 100);
  });

  // Retenciones
  const retencion_fuente = aplicar_retencion_fuente
    ? subtotal * TARIFAS_RETENCION.fuente_servicios
    : 0;

  const retencion_ica = aplicar_retencion_ica
    ? subtotal * TARIFAS_RETENCION.ica_mantenimiento
    : 0;

  const retencion_iva = 0; // Se calcula cuando aplica

  const total = subtotal - descuento + iva - retencion_fuente - retencion_ica - retencion_iva;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    descuento: Math.round(descuento * 100) / 100,
    base_iva: Math.round(base_iva * 100) / 100,
    iva: Math.round(iva * 100) / 100,
    retencion_fuente: Math.round(retencion_fuente * 100) / 100,
    retencion_ica: Math.round(retencion_ica * 100) / 100,
    retencion_iva: Math.round(retencion_iva * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Clasificar facturas por antigüedad para análisis de cartera
 * @param {Array} facturas - Facturas con { total, saldo_pendiente, fecha_vencimiento, estado }
 * @param {Date} fechaCorte - Fecha de referencia
 * @returns {Object} Rangos de días con totales
 */
export function getCarteraAging(facturas, fechaCorte = new Date()) {
  const corte = new Date(fechaCorte);
  const rangos = [
    { label: '0-30 días', min: 0, max: 30, facturas: [], total: 0 },
    { label: '31-60 días', min: 31, max: 60, facturas: [], total: 0 },
    { label: '61-90 días', min: 61, max: 90, facturas: [], total: 0 },
    { label: 'Más de 90 días', min: 91, max: Infinity, facturas: [], total: 0 },
  ];

  const pendientes = facturas.filter(
    f => f.estado === 'pendiente' || f.estado === 'parcial'
  );

  pendientes.forEach(factura => {
    const vencimiento = new Date(factura.fecha_vencimiento);
    const diffDays = Math.max(0, Math.floor((corte - vencimiento) / (1000 * 60 * 60 * 24)));
    const saldo = Number(factura.saldo_pendiente) || Number(factura.total) || 0;

    for (const rango of rangos) {
      if (diffDays >= rango.min && diffDays <= rango.max) {
        rango.facturas.push(factura);
        rango.total += saldo;
        break;
      }
    }
  });

  const total_pendiente = rangos.reduce((sum, r) => sum + r.total, 0);

  return {
    rangos: rangos.map(r => ({
      ...r,
      total: Math.round(r.total * 100) / 100,
      porcentaje: total_pendiente > 0
        ? Math.round((r.total / total_pendiente) * 100)
        : 0,
    })),
    total_pendiente: Math.round(total_pendiente * 100) / 100,
  };
}

/**
 * Formatear valor monetario en pesos colombianos
 */
export function formatCOP(valor) {
  const num = Number(valor) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Generar número de factura consecutivo
 */
export function generarNumeroFactura(prefijo, consecutivo) {
  const padded = String(consecutivo).padStart(6, '0');
  return `${prefijo}-${padded}`;
}

/**
 * Obtener etiqueta de estado de factura
 */
export function getEstadoFacturaLabel(estado) {
  const labels = {
    pendiente: 'Pendiente',
    pagada: 'Pagada',
    vencida: 'Vencida',
    anulada: 'Anulada',
    parcial: 'Parcial',
  };
  return labels[estado] || estado;
}

/**
 * Obtener color de estado de factura (Tailwind)
 */
export function getEstadoFacturaColor(estado) {
  const colors = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    pagada: 'bg-green-100 text-green-800',
    vencida: 'bg-red-100 text-red-800',
    anulada: 'bg-gray-100 text-gray-500',
    parcial: 'bg-blue-100 text-blue-800',
  };
  return colors[estado] || 'bg-gray-100 text-gray-600';
}
