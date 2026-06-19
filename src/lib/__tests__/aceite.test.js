import { describe, it, expect } from 'vitest'
import {
  UMBRALES_ACEITE,
  UMBRALES_FILTRO_COMBUSTIBLE,
  calcularEstadoAceite,
  calcularEstadoFiltroCombustible,
  calcularEstadoFiltroAire,
  calcularHorasDesdeCambio,
  getEstadoAceiteConfig,
  getEstadoAceiteLabel,
} from '@/lib/utils/aceite'

describe('UMBRALES_ACEITE', () => {
  it('tiene umbrales definidos', () => {
    expect(UMBRALES_ACEITE.PROXIMO).toBe(200)
    expect(UMBRALES_ACEITE.CRITICO).toBe(250)
    expect(UMBRALES_ACEITE.VENCIDO).toBe(300)
  })
})

describe('UMBRALES_FILTRO_COMBUSTIBLE', () => {
  it('tiene umbrales definidos', () => {
    expect(UMBRALES_FILTRO_COMBUSTIBLE.PROXIMO).toBe(80)
    expect(UMBRALES_FILTRO_COMBUSTIBLE.CRITICO).toBe(100)
    expect(UMBRALES_FILTRO_COMBUSTIBLE.VENCIDO).toBe(120)
  })
})

describe('calcularEstadoAceite()', () => {
  it('retorna VIGENTE cuando las horas son menores al umbral próximo', () => {
    expect(calcularEstadoAceite(150, 0)).toBe('VIGENTE')
    expect(calcularEstadoAceite(199, 0)).toBe('VIGENTE')
  })

  it('retorna PROXIMO entre 200 y 249 horas', () => {
    expect(calcularEstadoAceite(200, 0)).toBe('PROXIMO')
    expect(calcularEstadoAceite(230, 0)).toBe('PROXIMO')
    expect(calcularEstadoAceite(249, 0)).toBe('PROXIMO')
  })

  it('retorna CRITICO entre 250 y 299 horas', () => {
    expect(calcularEstadoAceite(250, 0)).toBe('CRITICO')
    expect(calcularEstadoAceite(275, 0)).toBe('CRITICO')
    expect(calcularEstadoAceite(299, 0)).toBe('CRITICO')
  })

  it('retorna VENCIDO a partir de 300 horas', () => {
    expect(calcularEstadoAceite(300, 0)).toBe('VENCIDO')
    expect(calcularEstadoAceite(350, 0)).toBe('VENCIDO')
    expect(calcularEstadoAceite(500, 0)).toBe('VENCIDO')
  })

  it('retorna SIN_DATO si horometroActual es null', () => {
    expect(calcularEstadoAceite(null, 100)).toBe('SIN_DATO')
  })

  it('retorna SIN_DATO si ultimoCambio es null', () => {
    expect(calcularEstadoAceite(300, null)).toBe('SIN_DATO')
  })

  it('calcula correctamente con ultimo cambio distinto de 0', () => {
    expect(calcularEstadoAceite(500, 400)).toBe('VIGENTE')
    expect(calcularEstadoAceite(600, 400)).toBe('PROXIMO')
    expect(calcularEstadoAceite(700, 400)).toBe('CRITICO')
    expect(calcularEstadoAceite(800, 400)).toBe('VENCIDO')
  })
})

describe('calcularEstadoFiltroCombustible()', () => {
  it('retorna VIGENTE cuando las horas son menores a 80', () => {
    expect(calcularEstadoFiltroCombustible(50, 0)).toBe('VIGENTE')
    expect(calcularEstadoFiltroCombustible(79, 0)).toBe('VIGENTE')
  })

  it('retorna PROXIMO entre 80 y 99 horas', () => {
    expect(calcularEstadoFiltroCombustible(80, 0)).toBe('PROXIMO')
    expect(calcularEstadoFiltroCombustible(90, 0)).toBe('PROXIMO')
  })

  it('retorna CRITICO entre 100 y 119 horas', () => {
    expect(calcularEstadoFiltroCombustible(100, 0)).toBe('CRITICO')
    expect(calcularEstadoFiltroCombustible(110, 0)).toBe('CRITICO')
  })

  it('retorna VENCIDO a partir de 120 horas', () => {
    expect(calcularEstadoFiltroCombustible(120, 0)).toBe('VENCIDO')
    expect(calcularEstadoFiltroCombustible(150, 0)).toBe('VENCIDO')
  })
})

describe('calcularEstadoFiltroAire()', () => {
  it('retorna CRITICO para condicion critica', () => {
    expect(calcularEstadoFiltroAire('critica')).toBe('CRITICO')
  })

  it('retorna PROXIMO para condicion regular', () => {
    expect(calcularEstadoFiltroAire('regular')).toBe('PROXIMO')
  })

  it('retorna VIGENTE para condicion buena', () => {
    expect(calcularEstadoFiltroAire('buena')).toBe('VIGENTE')
  })

  it('retorna SIN_DATO si no hay condicion', () => {
    expect(calcularEstadoFiltroAire(null)).toBe('SIN_DATO')
    expect(calcularEstadoFiltroAire(undefined)).toBe('SIN_DATO')
    expect(calcularEstadoFiltroAire('')).toBe('SIN_DATO')
  })
})

describe('calcularHorasDesdeCambio()', () => {
  it('calcula diferencia positiva', () => {
    expect(calcularHorasDesdeCambio(500, 200)).toBe(300)
  })

  it('retorna 0 si ultimoCambio es null', () => {
    expect(calcularHorasDesdeCambio(500, null)).toBe(0)
  })

  it('retorna 0 si horometro es menor (evita negativos)', () => {
    expect(calcularHorasDesdeCambio(100, 200)).toBe(0)
  })
})

describe('getEstadoAceiteConfig()', () => {
  it('retorna config para VENCIDO', () => {
    const config = getEstadoAceiteConfig('VENCIDO')
    expect(config.label).toBe('Vencido')
    expect(config.dot).toBe('bg-red-500')
  })

  it('retorna config SIN_DATO para estado desconocido', () => {
    const config = getEstadoAceiteConfig('INEXISTENTE')
    expect(config.label).toBe('Sin registro')
  })
})

describe('getEstadoAceiteLabel()', () => {
  it('retorna label correcto para cada estado', () => {
    expect(getEstadoAceiteLabel('VENCIDO')).toBe('Vencido')
    expect(getEstadoAceiteLabel('CRITICO')).toBe('Crítico')
    expect(getEstadoAceiteLabel('PROXIMO')).toBe('Próximo')
    expect(getEstadoAceiteLabel('VIGENTE')).toBe('Vigente')
    expect(getEstadoAceiteLabel('SIN_DATO')).toBe('Sin registro')
  })
})
