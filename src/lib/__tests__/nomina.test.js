import { describe, it, expect } from 'vitest'
import {
  SMLV,
  AUXILIO_TRANSPORTE,
  PORCENTAJES_SEGURIDAD_SOCIAL,
  calcularIBC,
  calcularSeguridadSocial,
  calcularHorasExtras,
  calcularPrestaciones,
  getTipoContratoLabel,
  formatCOP,
  generarCodigoNomina,
  generarCodigoPeriodo,
} from '@/lib/utils/nomina'

describe('Constantes', () => {
  it('SMLV es 1.423.500', () => {
    expect(SMLV).toBe(1423500)
  })

  it('AUXILIO_TRANSPORTE es 200.000', () => {
    expect(AUXILIO_TRANSPORTE).toBe(200000)
  })

  it('PORCENTAJES_SEGURIDAD_SOCIAL tiene todos los valores', () => {
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.salud_trabajador).toBe(0.04)
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.salud_empleador).toBe(0.085)
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.pension_trabajador).toBe(0.04)
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.pension_empleador).toBe(0.12)
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.caja_compensacion).toBe(0.04)
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.sena).toBe(0.02)
    expect(PORCENTAJES_SEGURIDAD_SOCIAL.icbf).toBe(0.03)
  })
})

describe('calcularIBC()', () => {
  it('retorna SMLV si el salario es menor', () => {
    expect(calcularIBC(500000)).toBe(SMLV)
  })

  it('retorna el salario si es mayor a SMLV', () => {
    expect(calcularIBC(2000000)).toBe(2000000)
  })

  it('aplica tope máximo de 25 SMLV', () => {
    expect(calcularIBC(SMLV * 30)).toBe(SMLV * 25)
  })
})

describe('calcularSeguridadSocial()', () => {
  it('calcula aportes correctamente para salario base', () => {
    const ss = calcularSeguridadSocial(SMLV)
    expect(ss.trabajador.salud).toBe(SMLV * 0.04)
    expect(ss.trabajador.pension).toBe(SMLV * 0.04)
    expect(ss.trabajador.arl).toBe(0)
    expect(ss.empleador.salud).toBeGreaterThan(0)
    expect(ss.empleador.pension).toBeGreaterThan(0)
    expect(ss.empleador.arl).toBeGreaterThan(0)
    expect(ss.ibc).toBe(SMLV)
  })

  it('usa nivel de riesgo ARL por defecto 2', () => {
    const ss = calcularSeguridadSocial(SMLV)
    expect(ss.arl_tarifa_usada).toBe(0.01044)
  })

  it('aplica nivel de riesgo ARL personalizado', () => {
    const ss = calcularSeguridadSocial(SMLV, 5)
    expect(ss.arl_tarifa_usada).toBe(0.06960)
  })
})

describe('calcularHorasExtras()', () => {
  it('calcula valor hora ordinaria', () => {
    const horas = calcularHorasExtras(SMLV)
    expect(horas.valorHoraOrdinaria).toBeGreaterThan(0)
  })

  it('tiene todos los tipos de recargo', () => {
    const horas = calcularHorasExtras(SMLV)
    expect(horas.recargo).toHaveProperty('extra_diurna')
    expect(horas.recargo).toHaveProperty('extra_nocturna')
    expect(horas.recargo).toHaveProperty('extra_dominical')
    expect(horas.recargo).toHaveProperty('recargo_nocturno')
    expect(horas.recargo).toHaveProperty('recargo_dominical')
  })
})

describe('calcularPrestaciones()', () => {
  it('calcula prestaciones para un año completo', () => {
    const ingreso = '2025-01-01'
    const corte = '2025-12-31'
    const prestaciones = calcularPrestaciones(ingreso, corte, SMLV, AUXILIO_TRANSPORTE)
    expect(prestaciones.dias_trabajados).toBe(364)
    expect(prestaciones.prima).toBeGreaterThan(0)
    expect(prestaciones.cesantias).toBeGreaterThan(0)
    expect(prestaciones.vacaciones).toBeGreaterThan(0)
  })

  it('retorna 0 para fechas iguales (sin días trabajados)', () => {
    const prestaciones = calcularPrestaciones('2025-01-01', '2025-01-01', SMLV)
    expect(prestaciones.dias_trabajados).toBe(0)
    Object.values(prestaciones).forEach((val) => {
      if (typeof val === 'number') {
        expect(val).toBeGreaterThanOrEqual(0)
      }
    })
  })
})

describe('getTipoContratoLabel()', () => {
  it('retorna label correcto para cada tipo', () => {
    expect(getTipoContratoLabel('indefinido')).toBe('Término Indefinido')
    expect(getTipoContratoLabel('fijo')).toBe('Término Fijo')
    expect(getTipoContratoLabel('obra_labor')).toBe('Obra o Labor')
    expect(getTipoContratoLabel('prestacion_servicios')).toBe('Prestación de Servicios')
    expect(getTipoContratoLabel('aprendizaje')).toBe('Aprendizaje SENA')
  })

  it('retorna el valor mismo como fallback', () => {
    expect(getTipoContratoLabel('unknown')).toBe('unknown')
  })

  it('retorna "No definido" para null', () => {
    expect(getTipoContratoLabel(null)).toBe('No definido')
  })
})

describe('formatCOP()', () => {
  it('formatea 0 como $0', () => {
    const resultado = formatCOP(0)
    expect(resultado).toContain('$')
    expect(resultado).toContain('0')
  })

  it('formatea valores con separadores', () => {
    const resultado = formatCOP(1500000)
    expect(resultado).toContain('$')
    expect(resultado).toContain('1')
  })

  it('retorna $0 para null', () => {
    const resultado = formatCOP(null)
    expect(resultado).toContain('$')
    expect(resultado).toContain('0')
  })
})

describe('generarCodigoNomina()', () => {
  it('genera código con formato esperado', () => {
    const codigo = generarCodigoNomina(2026, 6, 1, 15)
    expect(codigo).toBe('NOM-2026-06-1-15')
  })

  it('padding de mes a 2 dígitos', () => {
    expect(generarCodigoNomina(2026, 1, 2, 5)).toContain('-01-')
  })
})

describe('generarCodigoPeriodo()', () => {
  it('genera código de período con formato esperado', () => {
    const codigo = generarCodigoPeriodo(2026, 6, 1)
    expect(codigo).toBe('P-2026-06-1')
  })
})
