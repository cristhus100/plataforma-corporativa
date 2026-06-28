import { describe, it, expect } from 'vitest'
import {
  RANGOS_CUMPLIMIENTO,
  CATEGORIAS_AUDITORIA,
  CATEGORIAS_ORDER,
  getRangoCumplimiento,
  calcularCumplimientoEmpleado,
  calcularCumplimientoMaquinaria,
  calcularCumplimientoGlobal,
} from '@/lib/utils/auditoria'

describe('RANGOS_CUMPLIMIENTO', () => {
  it('tiene 4 rangos definidos', () => {
    expect(RANGOS_CUMPLIMIENTO).toHaveLength(4)
  })

  it('cada rango tiene min, color, bgColor, label, desc', () => {
    RANGOS_CUMPLIMIENTO.forEach((r) => {
      expect(r).toHaveProperty('min')
      expect(r).toHaveProperty('color')
      expect(r).toHaveProperty('bgColor')
      expect(r).toHaveProperty('label')
      expect(r).toHaveProperty('desc')
    })
  })

  it('el primer rango es Sobresaliente (min 80)', () => {
    expect(RANGOS_CUMPLIMIENTO[0].min).toBe(80)
    expect(RANGOS_CUMPLIMIENTO[0].label).toBe('Sobresaliente')
  })

  it('el último rango es Crítico (min 0)', () => {
    expect(RANGOS_CUMPLIMIENTO[3].label).toBe('Crítico')
  })
})

describe('getRangoCumplimiento()', () => {
  it('retorna Sobresaliente para >= 80', () => {
    expect(getRangoCumplimiento(80).label).toBe('Sobresaliente')
    expect(getRangoCumplimiento(95).label).toBe('Sobresaliente')
  })

  it('retorna "En observación" para 60-79', () => {
    expect(getRangoCumplimiento(60).label).toBe('En observación')
    expect(getRangoCumplimiento(75).label).toBe('En observación')
  })

  it('retorna Deficiente para 40-59', () => {
    expect(getRangoCumplimiento(40).label).toBe('Deficiente')
    expect(getRangoCumplimiento(59).label).toBe('Deficiente')
  })

  it('retorna Crítico para < 40', () => {
    expect(getRangoCumplimiento(0).label).toBe('Crítico')
    expect(getRangoCumplimiento(39).label).toBe('Crítico')
  })
})

describe('CATEGORIAS_AUDITORIA', () => {
  it('tiene 6 categorías', () => {
    expect(Object.keys(CATEGORIAS_AUDITORIA)).toHaveLength(6)
  })

  it('cada categoría tiene id, label, icon, peso, items', () => {
    Object.values(CATEGORIAS_AUDITORIA).forEach((cat) => {
      expect(cat).toHaveProperty('id')
      expect(cat).toHaveProperty('label')
      expect(cat).toHaveProperty('icon')
      expect(cat).toHaveProperty('peso')
      expect(cat).toHaveProperty('items')
      expect(Array.isArray(cat.items)).toBe(true)
    })
  })

  it('la suma de todos los pesos es 100', () => {
    const total = Object.values(CATEGORIAS_AUDITORIA).reduce((sum, cat) => sum + cat.peso, 0)
    expect(total).toBe(100)
  })

  it('CATEGORIAS_ORDER tiene 6 categorías en orden', () => {
    expect(CATEGORIAS_ORDER).toHaveLength(6)
  })
})

describe('calcularCumplimientoEmpleado()', () => {
  it('retorna 0 y maxPosible > 0 para trabajador sin documentos', () => {
    const trabajador = { documentos_trabajadores: [] }
    const resultado = calcularCumplimientoEmpleado(trabajador)
    expect(resultado.puntaje).toBe(0)
    expect(resultado.maxPosible).toBeGreaterThan(0)
    expect(resultado.promedio).toBe(0)
    expect(resultado.detalle).toBeInstanceOf(Array)
  })

  it('asigna puntos máximos cuando todos los docs están vigentes', () => {
    const hoy = new Date()
    const futuro = new Date(hoy.getTime() + 365 * 86400000).toISOString()
    const trabajador = {
      documentos_trabajadores: [
        { id: 1, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Cédula' }, requiere_vencimiento: false },
        { id: 2, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Certificación bancaria' }, requiere_vencimiento: false },
        { id: 3, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Certificados' }, requiere_vencimiento: false },
        { id: 4, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Aportes en la empresa' }, requiere_vencimiento: false },
        { id: 5, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'ARL' } },
        { id: 6, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'EPS' } },
        { id: 7, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Pensión/AFP' } },
        { id: 8, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Caja de Compensación' } },
        { id: 9, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Certificado curso de seguridad' } },
        { id: 10, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Autorización prueba de alcoholemia' } },
        { id: 11, fecha_vencimiento: futuro, tipos_documentos_trabajador: { nombre: 'Exámenes médicos' } },
      ],
    }
    const resultado = calcularCumplimientoEmpleado(trabajador)
    expect(resultado.puntaje).toBe(resultado.maxPosible)
    expect(resultado.promedio).toBe(100)
  })

  it('penaliza documentos vencidos', () => {
    const pasado = new Date()
    pasado.setDate(pasado.getDate() - 10)
    const futuro = new Date()
    futuro.setDate(futuro.getDate() + 365)

    const trabajador = {
      documentos_trabajadores: [
        { id: 1, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Cédula' }, requiere_vencimiento: false },
        { id: 2, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Certificación bancaria' }, requiere_vencimiento: false },
        { id: 3, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Certificados' }, requiere_vencimiento: false },
        { id: 4, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Aportes en la empresa' }, requiere_vencimiento: false },
        { id: 5, fecha_vencimiento: pasado.toISOString(), tipos_documentos_trabajador: { nombre: 'ARL' } },
        { id: 6, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'EPS' } },
        { id: 7, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Pensión/AFP' } },
        { id: 8, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Caja de Compensación' } },
        { id: 9, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Certificado curso de seguridad' } },
        { id: 10, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Autorización prueba de alcoholemia' } },
        { id: 11, fecha_vencimiento: futuro.toISOString(), tipos_documentos_trabajador: { nombre: 'Exámenes médicos' } },
      ],
    }
    const resultado = calcularCumplimientoEmpleado(trabajador)
    expect(resultado.promedio).toBeLessThan(100)
    expect(resultado.promedio).toBeGreaterThan(0)
  })
})

describe('calcularCumplimientoMaquinaria()', () => {
  it('retorna 0 para máquina sin datos', () => {
    const maquina = { documentos_maquinaria: [], mantenimientos: [] }
    const resultado = calcularCumplimientoMaquinaria(maquina)
    expect(resultado.puntaje).toBe(0)
    expect(resultado.maxPosible).toBeGreaterThan(0)
    expect(resultado.promedio).toBe(0)
  })

  it('asigna puntos máximos con todos los datos completos', () => {
    const hoy = new Date()
    const futuro = new Date(hoy.getTime() + 365 * 86400000).toISOString()
    const maquina = {
      horometro_actual: 500,
      ultimo_cambio_aceite_horometro: 300,  // 500-300=200h ≤ 200 → vigente
      ultimo_cambio_filtro_combustible_horometro: 420,  // 500-420=80h ≤ 80 → vigente
      ultimo_checklist_diario: hoy.toISOString(),
      documentos_maquinaria: [
        { id: 1, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'SOAT' } },
        { id: 2, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'Técnico-Mecánica' } },
        { id: 3, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'Seguro Contractual' } },
        { id: 4, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'Seguro Extracontractual' } },
        { id: 5, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'Poliza de Maquinaria' } },
        { id: 6, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'Inspección Anual' } },
        { id: 7, tipos_documentos_maquinaria: { nombre: 'Manual de Operación' }, requiere_vencimiento: false },
        { id: 8, fecha_vencimiento: futuro, tipos_documentos_maquinaria: { nombre: 'Certificado de Operador' } },
      ],
      mantenimientos: [
        { id: 1, fecha: new Date(hoy.getTime() - 10 * 86400000).toISOString() },
        { id: 2, fecha: new Date(hoy.getTime() - 5 * 86400000).toISOString() },
      ],
    }
    const resultado = calcularCumplimientoMaquinaria(maquina)
    expect(resultado.puntaje).toBe(resultado.maxPosible)
    expect(resultado.promedio).toBe(100)
  })
})

describe('calcularCumplimientoGlobal()', () => {
  it('retorna 0 para arrays vacíos', () => {
    const resultado = calcularCumplimientoGlobal([], [])
    expect(resultado.porcentaje).toBe(0)
    expect(resultado.puntaje).toBe(0)
    expect(resultado.maxPosible).toBeGreaterThan(0)
  })

  it('calcula cumplimiento ponderado entre empleados y maquinaria', () => {
    const hoy = new Date()
    const futuro = new Date(hoy.getTime() + 365 * 86400000).toISOString()

    const empleados = [
      {
        _cumplimiento: {
          puntaje: 10,
          maxPosible: 10,
          promedio: 100,
          detalle: [
            { categoria: 'empleados_documentacion', tipo: 'Cédula', peso: 2.5, estado: 'vigente', puntos: 2.5 },
            { categoria: 'empleados_seguridad_social', tipo: 'ARL', peso: 8, estado: 'vigente', puntos: 8 },
            { categoria: 'empleados_capacitacion', tipo: 'Exámenes médicos', peso: 5, estado: 'vigente', puntos: 5 },
          ],
        },
      },
    ]
    const maquinaria = [
      {
        _cumplimiento: {
          puntaje: 16,
          maxPosible: 16,
          promedio: 100,
          detalle: [
            { categoria: 'maquinaria_documentacion', tipo: 'SOAT', peso: 6, estado: 'vigente', puntos: 6 },
            { categoria: 'maquinaria_mantenimiento', tipo: 'Aceite', peso: 5, estado: 'vigente', puntos: 5 },
            { categoria: 'maquinaria_operacion', tipo: 'Manual de Operación', peso: 3, estado: 'vigente', puntos: 3 },
          ],
        },
      },
    ]
    const resultado = calcularCumplimientoGlobal(empleados, maquinaria)
    expect(resultado.categorias).toHaveProperty('empleados_documentacion')
    expect(resultado.categorias).toHaveProperty('maquinaria_documentacion')
    expect(resultado.porcentaje).toBeGreaterThan(0)
  })
})
