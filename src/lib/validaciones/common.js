import { z } from 'zod'

/** Placa colombiana: ABC-123 (carros) o ABC-12A (motos) */
export const placaSchema = z
  .string()
  .regex(/^[A-Za-z]{3}-[A-Za-z0-9]{3}$/, 'Placa colombiana inválida (ej: ABC-123)')
  .transform(v => v.toUpperCase())

export const emailSchema = z.string().email('Email inválido').optional().nullable()

/** Teléfono Colombia: 7 dígitos fijo, 10 dígitos móvil */
export const telefonoSchema = z
  .string()
  .regex(/^\d{7,10}$/, 'Teléfono inválido (7-10 dígitos)')
  .optional()
  .nullable()

/** Fecha formato YYYY-MM-DD */
export const fechaColombiaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)')
  .optional()
  .nullable()

/** String requerido con mínimo de 1 caracter */
export function requiredString(campo = 'Campo') {
  return z
    .string({ required_error: `${campo} es requerido` })
    .min(1, `${campo} es requerido`)
    .trim()
}

/** String opcional: vacío → null */
export const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .or(z.literal(''))

/** Número positivo */
export function numeroPositivo(campo = 'Valor') {
  return z.coerce.number().positive(`${campo} debe ser mayor a 0`).optional().nullable()
}

/** ID numérico (coerce desde string) */
export const idSchema = z.coerce.number().int().positive('ID inválido').optional().nullable()

/** ID requerido */
export function requiredId(campo = 'ID') {
  return z.coerce.number().int().positive(`${campo} es requerido`)
}

/** Monto contable (NUMERIC(15,2)) */
export const montoSchema = z.coerce.number().nonnegative('El valor no puede ser negativo').optional().nullable()

/** Monto requerido */
export function requiredMonto(campo = 'Valor') {
  return z.coerce.number().nonnegative(`${campo} no puede ser negativo`)
}

/** Boolean opcional con default */
export const booleanSchema = z.boolean().optional().nullable()

/**
 * Preprocesa un objeto: elimina campos vacíos y campos con prefijo _
 * antes de pasarlo al schema de Zod.
 * Útil para quitar _fotoBase64, _fotoNombre antes de validar.
 */
export function limpiarFormData(data) {
  const result = { ...data }
  // Eliminar campos auxiliares de UI (prefijo _)
  Object.keys(result).forEach(k => {
    if (k.startsWith('_')) delete result[k]
  })
  // Convertir strings vacíos a null
  Object.keys(result).forEach(k => {
    if (result[k] === '') result[k] = null
  })
  return result
}
