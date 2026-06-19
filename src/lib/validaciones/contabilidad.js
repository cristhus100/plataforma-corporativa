import { z } from 'zod'
import { requiredString, optionalString, montoSchema, requiredId } from './common'

export const cuentaSchema = z.object({
  codigo: requiredString('Código de cuenta'),
  nombre: requiredString('Nombre de cuenta'),
  tipo: z.enum(['activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto', 'costo']),
  naturaleza: z.enum(['debito', 'credito']),
  nivel: z.coerce.number().int().min(1).max(9),
  codigo_padre: optionalString,
  activa: z.boolean().optional(),
  acepta_movimiento: z.boolean().optional(),
  descripcion: optionalString,
  pide_tercero: z.boolean().optional(),
  pide_centro_costo: z.boolean().optional(),
}).passthrough()

export const asientoContableSchema = z.object({
  cuenta_id: requiredId('Cuenta contable'),
  tercero_id: z.coerce.number().int().positive().optional().nullable(),
  descripcion: z.string().min(1, 'Descripción del asiento es requerida'),
  naturaleza: z.enum(['debito', 'credito']),
  valor: z.coerce.number().positive('El valor del asiento debe ser mayor a cero'),
}).passthrough()

export const comprobanteSchema = z.object({
  tipo_comprobante_id: requiredId('Tipo de comprobante'),
  fecha: z.string().optional(),
  concepto: requiredString('Concepto'),
  origen: z.string().optional(),
  lineas: z.string().min(1, 'Debe haber al menos una línea'),
}).passthrough()
