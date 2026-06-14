/**
 * Utilidades para el módulo de Nómina Colombiana
 * Incluye cálculos de seguridad social, prestaciones sociales,
 * horas extras, y liquidación de nómina.
 */

/**
 * Porcentajes de seguridad social colombianos 2026
 */
export const PORCENTAJES_SEGURIDAD_SOCIAL = {
  salud_trabajador: 0.04,        // 4%
  salud_empleador: 0.085,        // 8.5%
  pension_trabajador: 0.04,      // 4%
  pension_empleador: 0.12,       // 12%
  arl_empleador: 0.00522,        // 0.522% (riesgo medio)
  caja_compensacion: 0.04,       // 4% (Caja de Compensación Familiar)
  sena: 0.02,                    // 2% (SENA)
  icbf: 0.03,                    // 3% (ICBF)
};

// Salario Mínimo Mensual Legal Vigente 2026
export const SMLV = 1423500;

// Auxilio de Transporte 2026
export const AUXILIO_TRANSPORTE = 200000;

// Porcentajes de prestaciones sociales
export const PRESTACIONES = {
  prima: 1 / 12,                 // 8.33% (1/12 del salario por semestre)
  cesantias: 1 / 12,             // 8.33% (1/12 del salario anual)
  intereses_cesantias: 0.12,     // 12% anual sobre cesantías
  vacaciones: 1 / 24,            // 4.17% (15 días / 360 días)
};

// Topes máximos de cotización
export const TOPE_COTIZACION_SMLV = 25;  // Máximo 25 SMMLV para cotizar

/**
 * Calcular IBC (Ingreso Base de Cotización)
 * @param {number} salarioBase
 * @returns {number} IBC ajustado al mínimo y máximo legal
 */
export function calcularIBC(salarioBase) {
  const ibc = Math.max(SMLV, Number(salarioBase));
  return Math.min(ibc, SMLV * TOPE_COTIZACION_SMLV);
}

/**
 * Calcular seguridad social completa (trabajador + empleador)
 * @param {number} salarioBase - Salario base del trabajador
 * @param {number} nivelRiesgoARL - Nivel de riesgo ARL (1-5)
 * @returns {Object} Aportes de trabajador y empleador
 */
export function calcularSeguridadSocial(salarioBase, nivelRiesgoARL = 2) {
  const ibc = calcularIBC(salarioBase);

  // Tarifas ARL según nivel de riesgo (decreto 768/2022)
  const tarifasARL = {
    1: 0.00522,   // Riesgo mínimo
    2: 0.01044,   // Riesgo bajo (default para mantenimiento)
    3: 0.02436,   // Riesgo medio
    4: 0.04350,   // Riesgo alto
    5: 0.06960,   // Riesgo máximo
  };

  const arl_tarifa = tarifasARL[nivelRiesgoARL] || tarifasARL[2];

  return {
    // Aportes del trabajador
    trabajador: {
      salud: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.salud_trabajador * 100) / 100,
      pension: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.pension_trabajador * 100) / 100,
      arl: 0,  // ARL la paga 100% el empleador
    },
    // Aportes del empleador
    empleador: {
      salud: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.salud_empleador * 100) / 100,
      pension: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.pension_empleador * 100) / 100,
      arl: Math.round(ibc * arl_tarifa * 100) / 100,
      caja_compensacion: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.caja_compensacion * 100) / 100,
      sena: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.sena * 100) / 100,
      icbf: Math.round(ibc * PORCENTAJES_SEGURIDAD_SOCIAL.icbf * 100) / 100,
    },
    ibc,
    arl_tarifa_usada: arl_tarifa,
  };
}

/**
 * Calcular horas extras según normativa colombiana
 * @param {number} salarioBase - Salario base mensual
 * @param {number} horasOrdinarias - Horas ordinarias en el periodo (default 240 = 30 días × 8h)
 * @returns {Object} Valores por hora para cada tipo de recargo
 */
export function calcularHorasExtras(salarioBase, horasOrdinarias = 240) {
  const valorHoraOrdinaria = salarioBase / horasOrdinarias;

  return {
    valorHoraOrdinaria: Math.round(valorHoraOrdinaria * 100) / 100,
    // Recargos sobre el valor de la hora ordinaria
    recargo: {
      extra_diurna: Math.round(valorHoraOrdinaria * 1.25 * 100) / 100,       // 25%
      extra_nocturna: Math.round(valorHoraOrdinaria * 1.75 * 100) / 100,     // 75%
      extra_dominical: Math.round(valorHoraOrdinaria * 2.00 * 100) / 100,    // 100%
      recargo_nocturno: Math.round(valorHoraOrdinaria * 1.35 * 100) / 100,   // 35%
      recargo_dominical: Math.round(valorHoraOrdinaria * 1.75 * 100) / 100,  // 75%
    },
  };
}

/**
 * Calcular prestaciones sociales
 * @param {Date|string} fechaIngreso - Fecha de ingreso del trabajador
 * @param {Date|string} fechaCorte - Fecha de corte para el cálculo
 * @param {number} salarioBase - Salario base mensual
 * @param {number} auxilioTransporte - Auxilio de transporte (si aplica)
 * @returns {Object} Valores calculados de prestaciones
 */
export function calcularPrestaciones(fechaIngreso, fechaCorte, salarioBase, auxilioTransporte = 0) {
  const ingreso = new Date(fechaIngreso);
  const corte = new Date(fechaCorte);
  const diasTrabajados = Math.max(0, Math.floor((corte - ingreso) / (1000 * 60 * 60 * 24)));

  const basePrima = salarioBase + auxilioTransporte;
  const baseCesantias = salarioBase;

  const prima = (basePrima * diasTrabajados) / 360;
  const cesantias = (baseCesantias * diasTrabajados) / 360;
  const interesesCesantias = cesantias * PRESTACIONES.intereses_cesantias * (diasTrabajados / 360);
  const vacaciones = (salarioBase * diasTrabajados) / 720;

  return {
    dias_trabajados: diasTrabajados,
    prima: Math.round(prima * 100) / 100,
    cesantias: Math.round(cesantias * 100) / 100,
    intereses_cesantias: Math.round(interesesCesantias * 100) / 100,
    vacaciones: Math.round(vacaciones * 100) / 100,
    base_prima: basePrima,
    base_cesantias: baseCesantias,
  };
}

/**
 * Liquidar nómina completa para un trabajador en un período
 * @param {Object} trabajador - Datos del trabajador { salario, auxilio_transporte, fecha_ingreso }
 * @param {Object} periodo - Período de nómina { fecha_inicio, fecha_fin, dias_laborados }
 * @param {Object} novedades - Novedades del período { horas_extras_diurnas, horas_extras_nocturnas, bonificaciones, etc }
 * @returns {Object} Liquidación completa { devengos, deducciones, aportes, neto }
 */
export function liquidarNomina(trabajador, periodo, novedades = {}) {
  const salarioBase = Number(trabajador.salario) || SMLV;
  const diasLaborados = periodo.dias_laborados || 30;
  const auxilioTransporte = trabajador.auxilio_transporte
    ? Number(AUXILIO_TRANSPORTE)
    : 0;

  // Sueldo básico proporcional
  const sueldoBasico = Math.round((salarioBase / 30) * diasLaborados * 100) / 100;

  // Horas extras
  const horas = calcularHorasExtras(salarioBase);
  const horasExtrasDiurnas = Math.round(
    (Number(novedades.horas_extras_diurnas) || 0) * horas.recargo.extra_diurna * 100
  ) / 100;
  const horasExtrasNocturnas = Math.round(
    (Number(novedades.horas_extras_nocturnas) || 0) * horas.recargo.extra_nocturna * 100
  ) / 100;
  const horasExtrasDominicales = Math.round(
    (Number(novedades.horas_extras_dominicales) || 0) * horas.recargo.extra_dominical * 100
  ) / 100;
  const recargoNocturno = Math.round(
    (Number(novedades.horas_recargo_nocturno) || 0) * horas.recargo.recargo_nocturno * 100
  ) / 100;
  const recargoDominical = Math.round(
    (Number(novedades.horas_recargo_dominical) || 0) * horas.recargo.recargo_dominical * 100
  ) / 100;

  const comisiones = Number(novedades.comisiones) || 0;
  const bonificaciones = Number(novedades.bonificaciones) || 0;
  const otrosDevengos = Number(novedades.otros_devengos) || 0;

  // Total devengos
  const totalDevengos = Math.round((
    sueldoBasico + auxilioTransporte +
    horasExtrasDiurnas + horasExtrasNocturnas + horasExtrasDominicales +
    recargoNocturno + recargoDominical +
    comisiones + bonificaciones + otrosDevengos
  ) * 100) / 100;

  // Seguridad social
  const ss = calcularSeguridadSocial(salarioBase);

  // Fondo de solidaridad (salarios > 4 SMMLV)
  let fondo_solidaridad = 0;
  let fondo_subsistencia = 0;
  if (salarioBase > SMLV * 4) {
    fondo_solidaridad = Math.round(salarioBase * 0.01 * 100) / 100;  // 1% adicional
  }
  if (salarioBase > SMLV * 16) {
    fondo_subsistencia = Math.round(salarioBase * 0.005 * 100) / 100; // 0.5% adicional
  }

  // Deducciones
  const totalDeducciones = Math.round((
    ss.trabajador.salud + ss.trabajador.pension +
    fondo_solidaridad + fondo_subsistencia +
    (Number(novedades.embargos) || 0) +
    (Number(novedades.libranzas) || 0) +
    (Number(novedades.otras_deducciones) || 0)
  ) * 100) / 100;

  // Neto a pagar
  const neto = Math.round((totalDevengos - totalDeducciones) * 100) / 100;

  return {
    salario_base: salarioBase,
    dias_laborados: diasLaborados,
    devengos: {
      sueldo_basico: sueldoBasico,
      auxilio_transporte: auxilioTransporte,
      horas_extras_diurnas: horasExtrasDiurnas,
      horas_extras_nocturnas: horasExtrasNocturnas,
      horas_extras_dominicales: horasExtrasDominicales,
      horas_recargo_nocturno: recargoNocturno,
      horas_recargo_dominical: recargoDominical,
      comisiones,
      bonificaciones,
      otros_devengos: otrosDevengos,
      total: totalDevengos,
    },
    deducciones: {
      salud: ss.trabajador.salud,
      pension: ss.trabajador.pension,
      fondo_solidaridad,
      fondo_subsistencia,
      embargos: Number(novedades.embargos) || 0,
      libranzas: Number(novedades.libranzas) || 0,
      otras_deducciones: Number(novedades.otras_deducciones) || 0,
      total: totalDeducciones,
    },
    aportes_empleador: {
      salud: ss.empleador.salud,
      pension: ss.empleador.pension,
      arl: ss.empleador.arl,
      caja_compensacion: ss.empleador.caja_compensacion,
      sena: ss.empleador.sena,
      icbf: ss.empleador.icbf,
      total: Math.round((
        ss.empleador.salud + ss.empleador.pension + ss.empleador.arl +
        ss.empleador.caja_compensacion + ss.empleador.sena + ss.empleador.icbf
      ) * 100) / 100,
    },
    neto_pagar: neto,
    ibc: ss.ibc,
  };
}

/**
 * Formatear valor en pesos colombianos
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
 * Obtener nombre del tipo de contrato
 */
export function getTipoContratoLabel(tipo) {
  const labels = {
    indefinido: 'Término Indefinido',
    fijo: 'Término Fijo',
    obra_labor: 'Obra o Labor',
    prestacion_servicios: 'Prestación de Servicios',
    aprendizaje: 'Aprendizaje SENA',
  };
  return labels[tipo] || tipo || 'No definido';
}

/**
 * Generar código único de nómina
 */
export function generarCodigoNomina(ano, mes, numeroPeriodo, trabajadorId) {
  return `NOM-${ano}-${String(mes).padStart(2, '0')}-${numeroPeriodo}-${trabajadorId}`;
}

/**
 * Generar código de período de nómina
 */
export function generarCodigoPeriodo(ano, mes, numeroPeriodo) {
  return `P-${ano}-${String(mes).padStart(2, '0')}-${numeroPeriodo}`;
}
