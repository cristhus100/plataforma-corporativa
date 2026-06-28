import { describe, it, expect } from 'vitest'
import {
  ESTADOS_MAQUINARIA,
  getEstadoLabel,
  getEstadoColor,
  getEstadoConfig,
  getEstadoBadge,
  getEstadoDot,
  getEstadoIcon,
  formatearFecha,
  formatearFechaLarga,
  formatearMoneda,
  formatearNumero,
  diasHastaVencimiento,
  getEstadoAlerta,
  calcularAntiguedad,
} from '@/lib/utils/maquinaria'

describe('ESTADOS_MAQUINARIA', () => {
  it('tiene 5 estados definidos', () => {
    const estados = Object.keys(ESTADOS_MAQUINARIA)
    expect(estados.sort()).toEqual([
      'dada_de_baja',
      'en_mantenimiento',
      'en_reparacion',
      'fuera_servicio',
      'operativa',
    ])
  })

  it('cada estado tiene label, color, badge, dot, icon', () => {
    Object.values(ESTADOS_MAQUINARIA).forEach((config) => {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(config).toHaveProperty('badge')
      expect(config).toHaveProperty('dot')
      expect(config).toHaveProperty('icon')
    })
  })
})

describe('getEstadoLabel()', () => {
  it('retorna label correcto para cada estado', () => {
    expect(getEstadoLabel('operativa')).toBe('Operativa')
    expect(getEstadoLabel('en_mantenimiento')).toBe('En Mantenimiento')
    expect(getEstadoLabel('fuera_servicio')).toBe('Fuera de Servicio')
    expect(getEstadoLabel('dada_de_baja')).toBe('Dada de Baja')
  })

  it('retorna el estado mismo como fallback si no existe', () => {
    expect(getEstadoLabel('inexistente')).toBe('inexistente')
  })
})

describe('getEstadoColor()', () => {
  it('retorna color correcto', () => {
    expect(getEstadoColor('operativa')).toBe('green')
    expect(getEstadoColor('en_reparacion')).toBe('orange')
    expect(getEstadoColor('fuera_servicio')).toBe('red')
    expect(getEstadoColor('dada_de_baja')).toBe('gray')
  })

  it('retorna gray como fallback', () => {
    expect(getEstadoColor('inexistente')).toBe('gray')
  })
})

describe('getEstadoConfig()', () => {
  it('retorna config completa para estado conocido', () => {
    const config = getEstadoConfig('operativa')
    expect(config.label).toBe('Operativa')
    expect(config.color).toBe('green')
  })

  it('retorna config operativa como fallback', () => {
    const config = getEstadoConfig('no_existe')
    expect(config.label).toBe('Operativa')
  })
})

describe('getEstadoBadge()', () => {
  it('retorna clases badge correctas', () => {
    expect(getEstadoBadge('operativa')).toContain('bg-green')
    expect(getEstadoBadge('en_mantenimiento')).toContain('bg-yellow')
  })

  it('retorna badge gris como fallback', () => {
    expect(getEstadoBadge('xyz')).toContain('bg-gray')
  })
})

describe('getEstadoDot()', () => {
  it('retorna dot correcto', () => {
    expect(getEstadoDot('operativa')).toBe('bg-green-500')
    expect(getEstadoDot('dada_de_baja')).toBe('bg-gray-500')
  })
})

describe('getEstadoIcon()', () => {
  it('retorna icono correcto', () => {
    expect(getEstadoIcon('operativa')).toBe('✓')
    expect(getEstadoIcon('dada_de_baja')).toBe('🚫')
  })
})

describe('formatearFecha()', () => {
  it('formatea fecha ISO a DD/MM/YYYY', () => {
    const resultado = formatearFecha('2025-01-15')
    // Uses locale 'es-CO', may differ by timezone — verify it's a date string
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(resultado).toContain('01')
    expect(resultado).toContain('2025')
  })

  it('retorna N/A para null', () => {
    expect(formatearFecha(null)).toBe('N/A')
  })

  it('retorna N/A para undefined', () => {
    expect(formatearFecha(undefined)).toBe('N/A')
  })
})

describe('formatearFechaLarga()', () => {
  it('formatea fecha a formato largo', () => {
    const resultado = formatearFechaLarga('2025-01-15')
    expect(resultado).toContain('enero')
    expect(resultado).toContain('2025')
  })

  it('retorna N/A para null', () => {
    expect(formatearFechaLarga(null)).toBe('N/A')
  })
})

describe('formatearMoneda()', () => {
  it('formatea 0 correctamente', () => {
    const resultado = formatearMoneda(0)
    expect(resultado).toContain('$')
    expect(resultado).toContain('0')
  })

  it('formatea valores con separadores de miles', () => {
    const resultado = formatearMoneda(1500000)
    expect(resultado).toContain('$')
    expect(resultado).toContain('1')
  })

  it('retorna $0 para null', () => {
    expect(formatearMoneda(null)).toBe('$0')
  })
})

describe('formatearNumero()', () => {
  it('formatea número con separadores', () => {
    expect(formatearNumero(1500)).toBe('1.500')
  })

  it('retorna 0 para null', () => {
    expect(formatearNumero(null)).toBe('0')
  })
})

describe('diasHastaVencimiento()', () => {
  it('retorna null si no hay fecha', () => {
    expect(diasHastaVencimiento(null)).toBeNull()
  })

  it('retorna número positivo para fecha futura', () => {
    const futura = new Date()
    futura.setDate(futura.getDate() + 10)
    const resultado = diasHastaVencimiento(futura.toISOString())
    expect(resultado).toBeGreaterThan(0)
  })
})

describe('getEstadoAlerta()', () => {
  it('retorna sin_fecha para null', () => {
    const alerta = getEstadoAlerta(null)
    expect(alerta.nivel).toBe('sin_fecha')
    expect(alerta.label).toBe('Sin fecha')
  })

  it('retorna vencido para días negativos', () => {
    const alerta = getEstadoAlerta(-5)
    expect(alerta.nivel).toBe('vencido')
    expect(alerta.label).toContain('Vencido')
  })

  it('retorna critico para 0 días', () => {
    const alerta = getEstadoAlerta(0)
    expect(alerta.nivel).toBe('critico')
    expect(alerta.label).toContain('hoy')
  })

  it('retorna critico para <=7 días', () => {
    const alerta = getEstadoAlerta(3)
    expect(alerta.nivel).toBe('critico')
    expect(alerta.label).toContain('días')
  })

  it('retorna proximo para <=30 días', () => {
    const alerta = getEstadoAlerta(15)
    expect(alerta.nivel).toBe('proximo')
  })

  it('retorna vigente para >30 días', () => {
    const alerta = getEstadoAlerta(90)
    expect(alerta.nivel).toBe('vigente')
  })
})

describe('calcularAntiguedad()', () => {
  it('retorna null si no hay fecha', () => {
    expect(calcularAntiguedad(null)).toBeNull()
  })

  it('calcula años correctamente', () => {
    const fecha = new Date()
    fecha.setFullYear(fecha.getFullYear() - 3)
    expect(calcularAntiguedad(fecha.toISOString())).toBe(3)
  })
})
