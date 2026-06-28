import { describe, it, expect } from 'vitest'
import {
  TIPOS_MANTENIMIENTO,
  PRIORIDADES,
  ESTADOS_ORDEN,
  getTipoLabel,
  getTipoBadge,
  getTipoDot,
  getTipoIcon,
  getPrioridadLabel,
  getPrioridadBadge,
  getPrioridadDot,
  getEstadoLabel,
  getEstadoBadge,
  getEstadoDot,
  getEstadoIcon,
  formatearMoneda,
  formatearFecha,
  diasDesdeHoy,
  getEstadoProgramacion,
} from '@/lib/utils/ordenes_mantenimiento'

describe('TIPOS_MANTENIMIENTO', () => {
  it('tiene 3 tipos definidos', () => {
    expect(Object.keys(TIPOS_MANTENIMIENTO).sort()).toEqual(['correctivo', 'predictivo', 'preventivo'])
  })

  it('cada tipo tiene label, color, badge, dot, icon', () => {
    Object.values(TIPOS_MANTENIMIENTO).forEach((t) => {
      expect(t).toHaveProperty('label')
      expect(t).toHaveProperty('color')
      expect(t).toHaveProperty('badge')
      expect(t).toHaveProperty('dot')
      expect(t).toHaveProperty('icon')
    })
  })
})

describe('PRIORIDADES', () => {
  it('tiene 4 prioridades definidas', () => {
    expect(Object.keys(PRIORIDADES).sort()).toEqual(['alta', 'baja', 'critica', 'media'])
  })

  it('cada prioridad tiene label, color, badge, dot', () => {
    Object.values(PRIORIDADES).forEach((p) => {
      expect(p).toHaveProperty('label')
      expect(p).toHaveProperty('color')
      expect(p).toHaveProperty('badge')
      expect(p).toHaveProperty('dot')
    })
  })
})

describe('ESTADOS_ORDEN', () => {
  it('tiene 4 estados definidos', () => {
    expect(Object.keys(ESTADOS_ORDEN).sort()).toEqual(['cancelado', 'completado', 'en_proceso', 'pendiente'])
  })

  it('cada estado tiene label, color, badge, dot, icon', () => {
    Object.values(ESTADOS_ORDEN).forEach((e) => {
      expect(e).toHaveProperty('label')
      expect(e).toHaveProperty('color')
      expect(e).toHaveProperty('badge')
      expect(e).toHaveProperty('dot')
      expect(e).toHaveProperty('icon')
    })
  })
})

describe('getTipoLabel()', () => {
  it('retorna label correcto', () => {
    expect(getTipoLabel('preventivo')).toBe('Preventivo')
    expect(getTipoLabel('correctivo')).toBe('Correctivo')
    expect(getTipoLabel('predictivo')).toBe('Predictivo')
  })

  it('retorna el tipo como fallback', () => {
    expect(getTipoLabel('inexistente')).toBe('inexistente')
  })
})

describe('getTipoBadge()', () => {
  it('retorna clase badge correcta', () => {
    expect(getTipoBadge('preventivo')).toContain('bg-blue')
    expect(getTipoBadge('correctivo')).toContain('bg-orange')
  })

  it('retorna badge gris como fallback', () => {
    expect(getTipoBadge('xyz')).toContain('bg-gray')
  })
})

describe('getTipoDot()', () => {
  it('retorna dot correcto', () => {
    expect(getTipoDot('preventivo')).toBe('bg-blue-500')
    expect(getTipoDot('correctivo')).toBe('bg-orange-500')
  })
})

describe('getTipoIcon()', () => {
  it('retorna icono correcto', () => {
    expect(getTipoIcon('preventivo')).toBe('🔧')
    expect(getTipoIcon('correctivo')).toBe('⚠️')
    expect(getTipoIcon('predictivo')).toBe('📊')
  })
})

describe('getPrioridadLabel()', () => {
  it('retorna label correcto', () => {
    expect(getPrioridadLabel('baja')).toBe('Baja')
    expect(getPrioridadLabel('critica')).toBe('Crítica')
  })

  it('retorna la prioridad como fallback', () => {
    expect(getPrioridadLabel('unknown')).toBe('unknown')
  })
})

describe('getPrioridadBadge()', () => {
  it('retorna clase badge correcta', () => {
    expect(getPrioridadBadge('baja')).toContain('bg-green')
    expect(getPrioridadBadge('critica')).toContain('bg-red')
  })

  it('retorna badge gris como fallback', () => {
    expect(getPrioridadBadge('xyz')).toContain('bg-gray')
  })
})

describe('getPrioridadDot()', () => {
  it('retorna dot correcto', () => {
    expect(getPrioridadDot('baja')).toBe('bg-green-500')
    expect(getPrioridadDot('critica')).toBe('bg-red-500')
  })
})

describe('getEstadoLabel()', () => {
  it('retorna label correcto', () => {
    expect(getEstadoLabel('pendiente')).toBe('Pendiente')
    expect(getEstadoLabel('en_proceso')).toBe('En Proceso')
    expect(getEstadoLabel('completado')).toBe('Completado')
    expect(getEstadoLabel('cancelado')).toBe('Cancelado')
  })
})

describe('getEstadoBadge()', () => {
  it('retorna clase badge correcta', () => {
    expect(getEstadoBadge('pendiente')).toContain('bg-yellow')
    expect(getEstadoBadge('completado')).toContain('bg-green')
  })
})

describe('getEstadoDot()', () => {
  it('retorna dot correcto', () => {
    expect(getEstadoDot('pendiente')).toBe('bg-yellow-500')
    expect(getEstadoDot('completado')).toBe('bg-green-500')
  })
})

describe('getEstadoIcon()', () => {
  it('retorna icono correcto', () => {
    expect(getEstadoIcon('pendiente')).toBe('⏳')
    expect(getEstadoIcon('completado')).toBe('✅')
    expect(getEstadoIcon('cancelado')).toBe('✕')
  })
})

describe('formatearMoneda()', () => {
  it('formatea 0', () => {
    const resultado = formatearMoneda(0)
    expect(resultado).toContain('$')
    expect(resultado).toContain('0')
  })

  it('formatea valores con separadores', () => {
    const resultado = formatearMoneda(1500000)
    expect(resultado).toContain('$')
    expect(resultado).toContain('1')
  })

  it('retorna $0 para null', () => {
    expect(formatearMoneda(null)).toBe('$0')
  })
})

describe('formatearFecha()', () => {
  it('formatea fecha ISO a DD/MM/YYYY', () => {
    const resultado = formatearFecha('2025-06-15')
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it('retorna — para null', () => {
    expect(formatearFecha(null)).toBe('—')
  })

  it('retorna — para undefined', () => {
    expect(formatearFecha(undefined)).toBe('—')
  })
})

describe('diasDesdeHoy()', () => {
  it('retorna null si no hay fecha', () => {
    expect(diasDesdeHoy(null)).toBeNull()
  })

  it('retorna número positivo para fecha futura', () => {
    const futura = new Date()
    futura.setDate(futura.getDate() + 10)
    const resultado = diasDesdeHoy(futura.toISOString())
    expect(resultado).toBeGreaterThan(0)
  })

  it('retorna número negativo para fecha pasada', () => {
    const pasada = new Date()
    pasada.setDate(pasada.getDate() - 5)
    const resultado = diasDesdeHoy(pasada.toISOString())
    expect(resultado).toBeLessThan(0)
  })
})

describe('getEstadoProgramacion()', () => {
  it('retorna Completado para estado completado', () => {
    const ep = getEstadoProgramacion('2025-01-01', 'completado')
    expect(ep.label).toBe('Completado')
    expect(ep.color).toContain('green')
  })

  it('retorna Cancelado para estado cancelado', () => {
    const ep = getEstadoProgramacion('2025-01-01', 'cancelado')
    expect(ep.label).toBe('Cancelado')
    expect(ep.color).toContain('red')
  })

  it('retorna Sin fecha si no hay fecha', () => {
    const ep = getEstadoProgramacion(null, 'pendiente')
    expect(ep.label).toBe('Sin fecha')
  })

  it('retorna atrasada si la fecha ya pasó', () => {
    const pasada = new Date()
    pasada.setDate(pasada.getDate() - 10)
    const ep = getEstadoProgramacion(pasada.toISOString(), 'pendiente')
    expect(ep.label).toContain('Atrasada')
  })

  it('retorna Programada hoy para fecha actual', () => {
    const ep = getEstadoProgramacion(new Date().toISOString(), 'pendiente')
    expect(ep.label).toBe('Programada hoy')
  })
})
