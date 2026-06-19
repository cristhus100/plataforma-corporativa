import { describe, it, expect } from 'vitest'
import { maquinariaSchema } from '@/lib/validaciones/maquinaria'
import { trabajadorSchema } from '@/lib/validaciones/trabajador'
import { vehiculoSchema } from '@/lib/validaciones/vehiculo'
import { anuncioSchema } from '@/lib/validaciones/anuncio'
import { limpiarFormData } from '@/lib/validaciones/common'

// ─── Helper validate para tests ───────────────────────────────────

function validate(schema, data) {
  const result = schema.safeParse(data)
  return {
    success: result.success,
    error: result.success ? null : result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
  }
}

// ─── limpiarFormData ──────────────────────────────────────────────

describe('limpiarFormData()', () => {
  it('removes fields starting with _', () => {
    const result = limpiarFormData({ nombre: 'Test', _fotoBase64: 'data:...', _fotoNombre: 'foto.jpg' })
    expect(result).toEqual({ nombre: 'Test' })
  })

  it('converts empty strings to null', () => {
    const result = limpiarFormData({ nombre: 'Test', apellido: '', edad: '' })
    expect(result).toEqual({ nombre: 'Test', apellido: null, edad: null })
  })

  it('keeps valid values intact', () => {
    const result = limpiarFormData({ nombre: 'Juan', activo: true })
    expect(result).toEqual({ nombre: 'Juan', activo: true })
  })
})

// ─── maquinariaSchema ─────────────────────────────────────────────

describe('maquinariaSchema', () => {
  it('validates a complete maquinaria object', () => {
    const result = validate(maquinariaSchema, {
      codigo_interno: 'M-001',
      nombre: 'Excavadora CAT',
      tipo_maquinaria_id: 1,
      marca: 'CAT',
      modelo: '320',
      anio: 2022,
      estado: 'operativa',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing codigo_interno', () => {
    const result = validate(maquinariaSchema, { nombre: 'Excavadora', tipo_maquinaria_id: 1 })
    expect(result.success).toBe(false)
    expect(result.error).toContain('codigo_interno')
  })

  it('rejects missing nombre', () => {
    const result = validate(maquinariaSchema, { codigo_interno: 'M-001', tipo_maquinaria_id: 1 })
    expect(result.success).toBe(false)
    expect(result.error).toContain('nombre')
  })

  it('rejects missing tipo_maquinaria_id', () => {
    const result = validate(maquinariaSchema, { codigo_interno: 'M-001', nombre: 'Test' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid estado', () => {
    const result = validate(maquinariaSchema, {
      codigo_interno: 'M-001',
      nombre: 'Excavadora',
      tipo_maquinaria_id: 1,
      estado: 'inexistente',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative horometro', () => {
    const result = validate(maquinariaSchema, {
      codigo_interno: 'M-001',
      nombre: 'Excavadora',
      tipo_maquinaria_id: 1,
      horometro_actual: -5,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative kilometraje', () => {
    const result = validate(maquinariaSchema, {
      codigo_interno: 'M-001',
      nombre: 'Excavadora',
      tipo_maquinaria_id: 1,
      kilometraje_actual: -1,
    })
    expect(result.success).toBe(false)
  })

  it('passes through unknown fields (_foto*, etc)', () => {
    const result = maquinariaSchema.safeParse({
      codigo_interno: 'M-001',
      nombre: 'Excavadora',
      tipo_maquinaria_id: 1,
      _fotoBase64: 'data:image/jpeg;base64,...',
      _fotoNombre: 'foto.jpg',
    })
    expect(result.success).toBe(true)
    expect(result.data._fotoBase64).toBe('data:image/jpeg;base64,...')
  })
})

// ─── trabajadorSchema ─────────────────────────────────────────────

describe('trabajadorSchema', () => {
  it('validates required fields only', () => {
    const result = validate(trabajadorSchema, {
      cedula: '1234567890',
      primer_apellido: 'Gomez',
      nombre: 'Juan',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing cedula', () => {
    const result = validate(trabajadorSchema, { primer_apellido: 'Gomez', nombre: 'Juan' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('cedula')
  })

  it('rejects missing primer_apellido', () => {
    const result = validate(trabajadorSchema, { cedula: '123', nombre: 'Juan' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('primer_apellido')
  })

  it('rejects invalid RH', () => {
    const result = validate(trabajadorSchema, {
      cedula: '1234567890',
      primer_apellido: 'Gomez',
      nombre: 'Juan',
      rh: 'X-',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid RH values', () => {
    const result = validate(trabajadorSchema, {
      cedula: '1234567890',
      primer_apellido: 'Gomez',
      nombre: 'Juan',
      rh: 'O+',
    })
    expect(result.success).toBe(true)
  })
})

// ─── vehiculoSchema ───────────────────────────────────────────────

describe('vehiculoSchema', () => {
  it('validates a valid vehicle', () => {
    const result = validate(vehiculoSchema, {
      placa: 'ABC-123',
      nombre: 'Camioneta Toyota',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid placa format', () => {
    const result = validate(vehiculoSchema, {
      placa: '123-ABC',
      nombre: 'Camioneta',
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('placa')
  })

  it('rejects missing placa', () => {
    const result = validate(vehiculoSchema, { nombre: 'Camioneta' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('placa')
  })

  it('rejects missing nombre', () => {
    const result = validate(vehiculoSchema, { placa: 'XYZ-123' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('nombre')
  })

  it('rejects invalid año', () => {
    const result = validate(vehiculoSchema, {
      placa: 'XYZ-123',
      nombre: 'Test',
      anio: 1899,
    })
    expect(result.success).toBe(false)
  })
})

// ─── anuncioSchema ────────────────────────────────────────────────

describe('anuncioSchema', () => {
  it('validates with required fields only', () => {
    const result = validate(anuncioSchema, {
      titulo: 'Aviso importante',
      contenido: 'Mantenimiento programado para el...',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing titulo', () => {
    const result = validate(anuncioSchema, { contenido: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('titulo')
  })

  it('rejects missing contenido', () => {
    const result = validate(anuncioSchema, { titulo: 'Test' })
    expect(result.success).toBe(false)
    expect(result.error).toContain('contenido')
  })
})
