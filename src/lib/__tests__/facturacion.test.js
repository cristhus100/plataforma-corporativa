import { describe, it, expect } from 'vitest'
import {
  TARIFAS_RETENCION,
  calcularValoresFactura,
  getCarteraAging,
  formatCOP,
  generarNumeroFactura,
  getEstadoFacturaLabel,
  getEstadoFacturaColor,
} from '@/lib/utils/facturacion'

describe('TARIFAS_RETENCION', () => {
  it('tiene las tarifas definidas', () => {
    expect(TARIFAS_RETENCION.fuente_servicios).toBe(0.04)
    expect(TARIFAS_RETENCION.fuente_compras).toBe(0.025)
    expect(TARIFAS_RETENCION.ica_mantenimiento).toBe(0.004)
    expect(TARIFAS_RETENCION.iva).toBe(0.19)
    expect(TARIFAS_RETENCION.iva_retencion).toBe(0.15)
  })
})

describe('formatCOP()', () => {
  it('formatea 0', () => {
    const resultado = formatCOP(0)
    expect(resultado).toContain('$')
    expect(resultado).toContain('0')
  })

  it('formatea 1000 correctamente', () => {
    const resultado = formatCOP(1000)
    expect(resultado).toContain('$')
    expect(resultado).toContain('1')
  })

  it('formatea 1_000_000 correctamente', () => {
    const resultado = formatCOP(1000000)
    expect(resultado).toContain('$')
    expect(resultado).toContain('1')
  })

  it('retorna $0 para null', () => {
    const resultado = formatCOP(null)
    expect(resultado).toContain('$')
    expect(resultado).toContain('0')
  })
})

describe('getEstadoFacturaLabel()', () => {
  it('retorna label correcto para cada estado', () => {
    expect(getEstadoFacturaLabel('pendiente')).toBe('Pendiente')
    expect(getEstadoFacturaLabel('pagada')).toBe('Pagada')
    expect(getEstadoFacturaLabel('vencida')).toBe('Vencida')
    expect(getEstadoFacturaLabel('anulada')).toBe('Anulada')
    expect(getEstadoFacturaLabel('parcial')).toBe('Parcial')
  })

  it('retorna el estado como fallback si no existe', () => {
    expect(getEstadoFacturaLabel('inexistente')).toBe('inexistente')
  })
})

describe('getEstadoFacturaColor()', () => {
  it('retorna clase de color correcta para cada estado', () => {
    expect(getEstadoFacturaColor('pendiente')).toContain('bg-yellow')
    expect(getEstadoFacturaColor('pagada')).toContain('bg-green')
    expect(getEstadoFacturaColor('vencida')).toContain('bg-red')
    expect(getEstadoFacturaColor('anulada')).toContain('bg-gray')
    expect(getEstadoFacturaColor('parcial')).toContain('bg-blue')
  })

  it('retorna gris como fallback', () => {
    expect(getEstadoFacturaColor('unknown')).toContain('bg-gray')
  })
})

describe('generarNumeroFactura()', () => {
  it('genera número con padding de 6 dígitos', () => {
    expect(generarNumeroFactura('FE', 1)).toBe('FE-000001')
    expect(generarNumeroFactura('FE', 999)).toBe('FE-000999')
    expect(generarNumeroFactura('NC', 100000)).toBe('NC-100000')
  })
})

describe('calcularValoresFactura()', () => {
  it('calcula valores básicos sin retenciones', () => {
    const items = [
      { cantidad: 2, valor_unitario: 100000 },
      { cantidad: 1, valor_unitario: 50000 },
    ]
    const resultado = calcularValoresFactura(items)
    expect(resultado.subtotal).toBe(250000)
    expect(resultado.iva).toBeGreaterThan(0)
    expect(resultado.retencion_fuente).toBe(0)
    expect(resultado.retencion_ica).toBe(0)
  })

  it('aplica retención en la fuente y ICA', () => {
    const items = [
      { cantidad: 1, valor_unitario: 1000000 },
    ]
    const resultado = calcularValoresFactura(items, {
      aplicar_retencion_fuente: true,
      aplicar_retencion_ica: true,
    })
    expect(resultado.subtotal).toBe(1000000)
    expect(resultado.retencion_fuente).toBe(1000000 * 0.04)
    expect(resultado.retencion_ica).toBe(1000000 * 0.004)
    expect(resultado.total).toBeLessThan(resultado.subtotal)
  })

  it('aplica descuento a items', () => {
    const items = [
      { cantidad: 1, valor_unitario: 500000, descuento_item: 50000 },
    ]
    const resultado = calcularValoresFactura(items)
    expect(resultado.subtotal).toBe(500000)
    expect(resultado.descuento).toBe(50000)
  })
})

describe('getCarteraAging()', () => {
  it('clasifica facturas en los 4 buckets', () => {
    const hoy = new Date()
    const facturas = [
      { total: 100000, saldo_pendiente: 100000, fecha_vencimiento: new Date(hoy.getTime() - 15 * 86400000).toISOString(), estado: 'pendiente' },
      { total: 200000, saldo_pendiente: 200000, fecha_vencimiento: new Date(hoy.getTime() - 45 * 86400000).toISOString(), estado: 'pendiente' },
      { total: 300000, saldo_pendiente: 300000, fecha_vencimiento: new Date(hoy.getTime() - 75 * 86400000).toISOString(), estado: 'pendiente' },
      { total: 400000, saldo_pendiente: 400000, fecha_vencimiento: new Date(hoy.getTime() - 120 * 86400000).toISOString(), estado: 'pendiente' },
    ]
    const resultado = getCarteraAging(facturas, hoy)
    expect(resultado.rangos).toHaveLength(4)
    expect(resultado.total_pendiente).toBeGreaterThan(0)
    resultado.rangos.forEach((r) => {
      expect(r).toHaveProperty('label')
      expect(r).toHaveProperty('total')
      expect(r).toHaveProperty('porcentaje')
    })
  })

  it('ignora facturas pagadas o anuladas', () => {
    const facturas = [
      { total: 100000, saldo_pendiente: 0, fecha_vencimiento: '2024-01-01', estado: 'pagada' },
      { total: 200000, saldo_pendiente: 0, fecha_vencimiento: '2024-01-01', estado: 'anulada' },
    ]
    const resultado = getCarteraAging(facturas)
    expect(resultado.total_pendiente).toBe(0)
  })
})
