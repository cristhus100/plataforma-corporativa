/**
 * Utilidades para el módulo de Contabilidad / PUC
 */


/**
 * Construir árbol jerárquico del PUC
 * @param {Array} cuentas - Lista plana de cuentas con { codigo, nombre, tipo, nivel, codigo_padre, activa, acepta_movimiento }
 * @returns {Array} Árbol anidado
 */
export function buildPucTree(cuentas) {
  const map = {};
  const roots = [];

  cuentas.forEach(c => {
    map[c.codigo] = { ...c, children: [] };
  });

  cuentas.forEach(c => {
    if (c.codigo_padre && map[c.codigo_padre]) {
      map[c.codigo_padre].children.push(map[c.codigo]);
    } else if (!c.codigo_padre) {
      roots.push(map[c.codigo]);
    }
  });

  return roots;
}

/**
 * Calcular saldo de una cuenta en un conjunto de asientos
 * @param {Array} asientos - Asientos filtrados para esa cuenta
 * @param {string} naturaleza - 'debito' | 'credito'
 * @returns {number} Saldo neto
 */
export function calcularSaldoCuenta(asientos, naturaleza) {
  const debe = asientos
    .filter(a => a.naturaleza === 'debito')
    .reduce((sum, a) => sum + Number(a.valor), 0);

  const haber = asientos
    .filter(a => a.naturaleza === 'credito')
    .reduce((sum, a) => sum + Number(a.valor), 0);

  if (naturaleza === 'debito') {
    return debe - haber;
  }
  return haber - debe;
}

/**
 * Obtener el tipo de cuenta a partir de su código
 */
export function getTipoCuentaLabel(tipo) {
  const labels = {
    activo: 'Activo',
    pasivo: 'Pasivo',
    patrimonio: 'Patrimonio',
    ingreso: 'Ingreso',
    gasto: 'Gasto',
    costo: 'Costo',
    cuenta_orden: 'Cuenta de Orden',
  };
  return labels[tipo] || tipo;
}

export function getNaturalezaLabel(nat) {
  return nat === 'debito' ? 'Débito' : 'Crédito';
}

export function getNaturalezaColor(nat) {
  return nat === 'debito'
    ? 'text-blue-600'
    : 'text-green-600';
}

/**
 * Formatear valor contable
 */
export function formatValorContable(valor) {
  const num = Number(valor) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Generar número de comprobante consecutivo
 */
export function generarNumeroComprobante(prefijo, consecutivo) {
  const padded = String(consecutivo).padStart(4, '0');
  return `${prefijo}-${padded}`;
}
