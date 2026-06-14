/**
 * AUDITORÍA - Constantes, pesos y lógica de cumplimiento
 *
 * Sistema de evaluación ponderada para auditorías de frentes de trabajo
 * basado en estándares de normativa colombiana (SST, ARL, documentación legal).
 */

// ─── RANGOS DE CUMPLIMIENTO ─────────────────────────────────
export const RANGOS_CUMPLIMIENTO = [
  { min: 80, color: '#22c55e', bgColor: 'bg-green-50 border-green-500', label: 'Sobresaliente', desc: 'Cumple con los estándares de auditoría' },
  { min: 60, color: '#eab308', bgColor: 'bg-yellow-50 border-yellow-500', label: 'En observación', desc: 'Requiere mejoras para cumplir completamente' },
  { min: 40, color: '#f97316', bgColor: 'bg-orange-50 border-orange-500', label: 'Deficiente', desc: 'Acción correctiva urgente necesaria' },
  { min: 0,  color: '#ef4444', bgColor: 'bg-red-50 border-red-500', label: 'Crítico', desc: 'No pasaría una auditoría formal' },
];

export function getRangoCumplimiento(porcentaje) {
  return RANGOS_CUMPLIMIENTO.find(r => porcentaje >= r.min) || RANGOS_CUMPLIMIENTO[RANGOS_CUMPLIMIENTO.length - 1];
}

// ─── PESOS POR CATEGORÍA ────────────────────────────────────
// El total suma 100%. Estructura: categoría → subcategoría → items

export const CATEGORIAS_AUDITORIA = {
  empleados_documentacion: {
    id: 'empleados_documentacion',
    label: 'Empleados • Documentación Personal',
    icon: 'UserCheck',
    peso: 10, // 10% del total
    items: [
      { tipo: 'Cédula', peso: 2.5, requiereVencimiento: false },
      { tipo: 'Certificación bancaria', peso: 2.5, requiereVencimiento: false },
      { tipo: 'Certificados', peso: 2.5, requiereVencimiento: false },
      { tipo: 'Aportes en la empresa', peso: 2.5, requiereVencimiento: false },
    ],
  },
  empleados_seguridad_social: {
    id: 'empleados_seguridad_social',
    label: 'Empleados • Seguridad Social',
    icon: 'ShieldCheck',
    peso: 25, // 25% del total
    items: [
      { tipo: 'ARL', peso: 8, requiereVencimiento: true },
      { tipo: 'EPS', peso: 7, requiereVencimiento: true },
      { tipo: 'Pensión/AFP', peso: 5, requiereVencimiento: true },
      { tipo: 'Caja de Compensación', peso: 5, requiereVencimiento: true },
    ],
  },
  empleados_capacitacion: {
    id: 'empleados_capacitacion',
    label: 'Empleados • Capacitación y Salud',
    icon: 'GraduationCap',
    peso: 15, // 15% del total
    items: [
      { tipo: 'Certificado curso de seguridad', peso: 5, requiereVencimiento: true },
      { tipo: 'Autorización prueba de alcoholemia', peso: 5, requiereVencimiento: true },
      { tipo: 'Exámenes médicos', peso: 5, requiereVencimiento: true },
    ],
  },
  maquinaria_documentacion: {
    id: 'maquinaria_documentacion',
    label: 'Maquinaria • Documentación Legal',
    icon: 'FileText',
    peso: 25, // 25% del total
    items: [
      { tipo: 'SOAT', peso: 6, requiereVencimiento: true },
      { tipo: 'Técnico-Mecánica', peso: 6, requiereVencimiento: true },
      { tipo: 'Seguro Contractual', peso: 5, requiereVencimiento: true },
      { tipo: 'Seguro Extracontractual', peso: 5, requiereVencimiento: true },
      { tipo: 'Poliza de Maquinaria', peso: 3, requiereVencimiento: true },
    ],
  },
  maquinaria_mantenimiento: {
    id: 'maquinaria_mantenimiento',
    label: 'Maquinaria • Mantenimiento',
    icon: 'Wrench',
    peso: 15, // 15% del total
    items: [
      { tipo: 'Aceite', peso: 5, mide: 'estado_aceite' },
      { tipo: 'Filtros', peso: 5, mide: 'estado_filtros' },
      { tipo: 'Mantenimientos al día', peso: 3, mide: 'mantenimientos_recientes' },
      { tipo: 'Inspección Anual', peso: 2, requiereVencimiento: true },
    ],
  },
  maquinaria_operacion: {
    id: 'maquinaria_operacion',
    label: 'Maquinaria • Operación',
    icon: 'Settings',
    peso: 10, // 10% del total
    items: [
      { tipo: 'Manual de Operación', peso: 3, requiereVencimiento: false },
      { tipo: 'Certificado de Operador', peso: 4, requiereVencimiento: true },
      { tipo: 'Checklist diario', peso: 3, mide: 'checklist_diario' },
    ],
  },
};

// Para iterar ordenadamente
export const CATEGORIAS_ORDER = [
  CATEGORIAS_AUDITORIA.empleados_documentacion,
  CATEGORIAS_AUDITORIA.empleados_seguridad_social,
  CATEGORIAS_AUDITORIA.empleados_capacitacion,
  CATEGORIAS_AUDITORIA.maquinaria_documentacion,
  CATEGORIAS_AUDITORIA.maquinaria_mantenimiento,
  CATEGORIAS_AUDITORIA.maquinaria_operacion,
];

// ─── MAPEO: nombre de tipo_documento → categoría ────────────
// Para enlazar los registros de documentos_trabajadores/documentos_maquinaria
// con las categorías de auditoría
export const MAPEO_TIPO_DOCUMENTO_A_CATEGORIA = {
  // Empleados
  'Cédula':                                    { cat: 'empleados_documentacion', item: 'Cédula' },
  'Certificación bancaria':                     { cat: 'empleados_documentacion', item: 'Certificación bancaria' },
  'Certificados':                               { cat: 'empleados_documentacion', item: 'Certificados' },
  'Aportes en la empresa':                      { cat: 'empleados_documentacion', item: 'Aportes en la empresa' },
  'ARL':                                        { cat: 'empleados_seguridad_social', item: 'ARL' },
  'EPS':                                        { cat: 'empleados_seguridad_social', item: 'EPS' },
  'Pensión/AFP':                                { cat: 'empleados_seguridad_social', item: 'Pensión/AFP' },
  'Caja de Compensación':                       { cat: 'empleados_seguridad_social', item: 'Caja de Compensación' },
  'Certificado curso de seguridad':            { cat: 'empleados_capacitacion', item: 'Certificado curso de seguridad' },
  'Autorización prueba de alcoholemia':        { cat: 'empleados_capacitacion', item: 'Autorización prueba de alcoholemia' },
  'Exámenes médicos':                           { cat: 'empleados_capacitacion', item: 'Exámenes médicos' },
  // Maquinaria
  'SOAT':                                       { cat: 'maquinaria_documentacion', item: 'SOAT' },
  'Técnico-Mecánica':                           { cat: 'maquinaria_documentacion', item: 'Técnico-Mecánica' },
  'Seguro Contractual':                         { cat: 'maquinaria_documentacion', item: 'Seguro Contractual' },
  'Seguro Extracontractual':                    { cat: 'maquinaria_documentacion', item: 'Seguro Extracontractual' },
  'Poliza de Maquinaria':                       { cat: 'maquinaria_documentacion', item: 'Poliza de Maquinaria' },
  'Manual de Operación':                        { cat: 'maquinaria_operacion', item: 'Manual de Operación' },
  'Certificado de Operador':                   { cat: 'maquinaria_operacion', item: 'Certificado de Operador' },
  'Inspección Anual':                           { cat: 'maquinaria_mantenimiento', item: 'Inspección Anual' },
};

// ─── FUNCIONES DE SCORING ────────────────────────────────────

/**
 * Evalúa el estado de un documento.
 * @param {object} doc - Registro de documento (con fecha_vencimiento, tipo_documento?.requiere_vencimiento)
 * @returns {{ estado: string, puntos: number }} 'vigente' | 'proximo' | 'vencido' | 'ausente'
 */
function evaluarDocumento(doc) {
  if (!doc) return { estado: 'ausente', puntos: 0 };

  const requiereVenc = doc.tipos_documento?.requiere_vencimiento ?? doc.tipos_documentos_maquinaria?.requiere_vencimiento ?? doc.requiere_vencimiento ?? true;

  if (!requiereVenc) {
    return { estado: doc.id ? 'vigente' : 'ausente', puntos: doc.id ? 1 : 0 };
  }

  if (!doc.fecha_vencimiento) {
    // Tiene documento pero sin fecha de vencimiento → asumimos vigente si existe
    return { estado: doc.id ? 'vigente' : 'ausente', puntos: doc.id ? 1 : 0 };
  }

  const hoy = new Date();
  const vence = new Date(doc.fecha_vencimiento);
  const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));

  if (dias < 0) return { estado: 'vencido', puntos: 0 };
  if (dias <= 30) return { estado: 'proximo', puntos: 0.5 };
  return { estado: 'vigente', puntos: 1 };
}

/**
 * Evalúa el estado de aceite basado en horometro
 */
function evaluarEstadoAceite(maquina) {
  if (!maquina.horometro_actual || !maquina.ultimo_cambio_aceite_horometro) {
    return { estado: 'sin_dato', puntos: 0 };
  }
  const horas = maquina.horometro_actual - maquina.ultimo_cambio_aceite_horometro;
  if (horas > 300) return { estado: 'vencido', puntos: 0 };
  if (horas > 250) return { estado: 'critico', puntos: 0.25 };
  if (horas > 200) return { estado: 'proximo', puntos: 0.5 };
  return { estado: 'vigente', puntos: 1 };
}

/**
 * Evalúa el estado de filtros basado en horometro
 */
function evaluarEstadoFiltros(maquina) {
  if (!maquina.horometro_actual || !maquina.ultimo_cambio_filtro_combustible_horometro) {
    return { estado: 'sin_dato', puntos: 0 };
  }
  const horas = maquina.horometro_actual - maquina.ultimo_cambio_filtro_combustible_horometro;
  if (horas > 120) return { estado: 'vencido', puntos: 0 };
  if (horas > 100) return { estado: 'critico', puntos: 0.25 };
  if (horas > 80) return { estado: 'proximo', puntos: 0.5 };
  return { estado: 'vigente', puntos: 1 };
}

/**
 * Evalúa si el checklist diario está al día (últimos 7 días)
 */
function evaluarChecklistDiario(maquina) {
  if (!maquina.ultimo_checklist_diario) return { estado: 'sin_dato', puntos: 0 };
  const hoy = new Date();
  const hace7 = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
  const ultimo = new Date(maquina.ultimo_checklist_diario);
  if (ultimo >= hace7) return { estado: 'vigente', puntos: 1 };
  return { estado: 'vencido', puntos: 0 };
}

/**
 * Evalúa si hay mantenimientos recientes (últimos 90 días)
 */
function evaluarMantenimientosRecientes(maquina) {
  if (!maquina.mantenimientos || maquina.mantenimientos.length === 0) return { estado: 'sin_dato', puntos: 0 };
  const hoy = new Date();
  const hace90 = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recientes = maquina.mantenimientos.filter(m => new Date(m.fecha) >= hace90);
  if (recientes.length >= 2) return { estado: 'vigente', puntos: 1 };
  if (recientes.length === 1) return { estado: 'proximo', puntos: 0.5 };
  return { estado: 'vencido', puntos: 0 };
}

// ─── CÁLCULO COMPLETO ───────────────────────────────────────

/**
 * Calcula el puntaje de cumplimiento para un empleado.
 * @param {object} trabajador - Registro del trabajador con sus documentos (relación documentos_trabajadores)
 * @returns {{ puntaje: number, maxPosible: number, detalle: Array<{tipo, estado, puntos, peso}> }}
 */
export function calcularCumplimientoEmpleado(trabajador) {
  const documentos = trabajador.documentos_trabajadores || [];
  const detalle = [];
  let puntaje = 0;
  let maxPosible = 0;

  // Solo evaluamos categorías de empleados
  const catsEmpleados = ['empleados_documentacion', 'empleados_seguridad_social', 'empleados_capacitacion'];

  for (const catId of catsEmpleados) {
    const cat = CATEGORIAS_AUDITORIA[catId];
    for (const item of cat.items) {
      maxPosible += item.peso;
      const doc = documentos.find(d => {
        const nombreTipo = d.tipos_documentos_trabajador?.nombre || d.tipo_nombre || '';
        return nombreTipo.toLowerCase() === item.tipo.toLowerCase();
      });
      const evalDoc = evaluarDocumento(doc);
      puntaje += item.peso * evalDoc.puntos;
      detalle.push({
        categoria: catId,
        tipo: item.tipo,
        peso: item.peso,
        estado: evalDoc.estado,
        puntos: item.peso * evalDoc.puntos,
        documento: doc || null,
      });
    }
  }

  return {
    puntaje,
    maxPosible,
    promedio: maxPosible > 0 ? Math.round((puntaje / maxPosible) * 100) : 0,
    detalle,
  };
}

/**
 * Calcula el puntaje de cumplimiento para una máquina.
 * @param {object} maquina - Registro de maquinaria con documentos_maquinaria y mantenimientos
 * @returns {{ puntaje: number, maxPosible: number, detalle: Array }}
 */
export function calcularCumplimientoMaquinaria(maquina) {
  const documentos = maquina.documentos_maquinaria || [];
  const detalle = [];
  let puntaje = 0;
  let maxPosible = 0;

  const catsMaquinaria = ['maquinaria_documentacion', 'maquinaria_mantenimiento', 'maquinaria_operacion'];

  for (const catId of catsMaquinaria) {
    const cat = CATEGORIAS_AUDITORIA[catId];
    for (const item of cat.items) {
      maxPosible += item.peso;

      // Items especiales que no vienen de documentos
      if (item.mide === 'estado_aceite') {
        const evalAceite = evaluarEstadoAceite(maquina);
        puntaje += item.peso * evalAceite.puntos;
        detalle.push({ categoria: catId, tipo: item.tipo, peso: item.peso, estado: evalAceite.estado, puntos: item.peso * evalAceite.puntos });
        continue;
      }
      if (item.mide === 'estado_filtros') {
        const evalFiltros = evaluarEstadoFiltros(maquina);
        puntaje += item.peso * evalFiltros.puntos;
        detalle.push({ categoria: catId, tipo: item.tipo, peso: item.peso, estado: evalFiltros.estado, puntos: item.peso * evalFiltros.puntos });
        continue;
      }
      if (item.mide === 'mantenimientos_recientes') {
        const evalMant = evaluarMantenimientosRecientes(maquina);
        puntaje += item.peso * evalMant.puntos;
        detalle.push({ categoria: catId, tipo: item.tipo, peso: item.peso, estado: evalMant.estado, puntos: item.peso * evalMant.puntos });
        continue;
      }
      if (item.mide === 'checklist_diario') {
        const evalChecklist = evaluarChecklistDiario(maquina);
        puntaje += item.peso * evalChecklist.puntos;
        detalle.push({ categoria: catId, tipo: item.tipo, peso: item.peso, estado: evalChecklist.estado, puntos: item.peso * evalChecklist.puntos });
        continue;
      }

      // Items que vienen de documentos
      const doc = documentos.find(d => {
        const nombreTipo = d.tipos_documentos_maquinaria?.nombre || d.tipo_nombre || '';
        return nombreTipo.toLowerCase() === item.tipo.toLowerCase();
      });
      const evalDoc = evaluarDocumento(doc);
      puntaje += item.peso * evalDoc.puntos;
      detalle.push({
        categoria: catId,
        tipo: item.tipo,
        peso: item.peso,
        estado: evalDoc.estado,
        puntos: item.peso * evalDoc.puntos,
        documento: doc || null,
      });
    }
  }

  return {
    puntaje,
    maxPosible,
    promedio: maxPosible > 0 ? Math.round((puntaje / maxPosible) * 100) : 0,
    detalle,
  };
}

/**
 * Calcula el cumplimiento GLOBAL de un frente de trabajo.
 * @param {Array} empleados - Empleados del frente con sus resultados de calcularCumplimientoEmpleado
 * @param {Array} maquinaria - Máquinas del frente con sus resultados de calcularCumplimientoMaquinaria
 * @returns {{ puntaje: number, maxPosible: number, porcentaje: number, categorias: object }}
 */
export function calcularCumplimientoGlobal(empleados, maquinaria) {
  let puntajeTotal = 0;
  let maxPosibleTotal = 0;

  const categoriasResumen = {};

  // Inicializar categorías
  for (const cat of CATEGORIAS_ORDER) {
    categoriasResumen[cat.id] = {
      label: cat.label,
      peso: cat.peso,
      puntaje: 0,
      maxPosible: 0,
      items: cat.items,
    };
  }

  // Sumar empleados (promedio de todos los empleados)
  if (empleados.length > 0) {
    for (const emp of empleados) {
      const resultado = emp._cumplimiento;
      for (const det of resultado.detalle) {
        const catKey = det.categoria;
        if (categoriasResumen[catKey]) {
          categoriasResumen[catKey].puntaje += det.puntos;
          categoriasResumen[catKey].maxPosible += det.peso;
        }
      }
    }
    // Promediar entre empleados
    for (const catKey of ['empleados_documentacion', 'empleados_seguridad_social', 'empleados_capacitacion']) {
      const cat = categoriasResumen[catKey];
      if (empleados.length > 0 && cat.maxPosible > 0) {
        cat.puntaje = cat.puntaje / empleados.length;
        cat.maxPosible = cat.maxPosible / empleados.length;
      }
    }
  }

  // Sumar maquinaria (promedio)
  if (maquinaria.length > 0) {
    for (const maq of maquinaria) {
      const resultado = maq._cumplimiento;
      for (const det of resultado.detalle) {
        const catKey = det.categoria;
        if (categoriasResumen[catKey]) {
          categoriasResumen[catKey].puntaje += det.puntos;
          categoriasResumen[catKey].maxPosible += det.peso;
        }
      }
    }
    for (const catKey of ['maquinaria_documentacion', 'maquinaria_mantenimiento', 'maquinaria_operacion']) {
      const cat = categoriasResumen[catKey];
      if (maquinaria.length > 0 && cat.maxPosible > 0) {
        cat.puntaje = cat.puntaje / maquinaria.length;
        cat.maxPosible = cat.maxPosible / maquinaria.length;
      }
    }
  }

  // Calcular total ponderado
  for (const cat of CATEGORIAS_ORDER) {
    const c = categoriasResumen[cat.id];
    const catPorcentaje = c.maxPosible > 0 ? c.puntaje / c.maxPosible : 0;
    const pesoContribucion = cat.peso; // 10, 25, 15, etc.
    puntajeTotal += catPorcentaje * pesoContribucion;
    maxPosibleTotal += pesoContribucion;
  }

  return {
    puntaje: Math.round(puntajeTotal * 100) / 100,
    maxPosible: maxPosibleTotal,
    porcentaje: maxPosibleTotal > 0 ? Math.round((puntajeTotal / maxPosibleTotal) * 100) : 0,
    categorias: categoriasResumen,
  };
}
