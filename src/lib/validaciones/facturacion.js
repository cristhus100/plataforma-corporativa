import { z } from 'zod'
import { requiredString, optionalString, montoSchema, requiredId } from './common'

export const terceroSchema = z.object({
  tipo_documento: z.enum(['NIT', 'CC', 'CE', 'Pasaporte']).optional(),
  numero_documento: requiredString('Número de documento'),
  digito_verificacion: z.coerce.number().int().min(0).max(9).optional().nullable(),
  nombre_completo: requiredString('Nombre completo'),
  nombre_comercial: optionalString,
  direccion: optionalString,
  ciudad: optionalString,
  departamento: optionalString,
  telefono: optionalString,
  email: z.string().email().optional().nullable(),
  regimen_iva: z.enum(['comun', 'simplificado', 'exento']).optional(),
  regimen_tributario: z.enum(['ordinario', 'especial']).optional(),
  autorretenedor: z.boolean().optional(),
  tipo_tercero: z.enum(['cliente', 'proveedor', 'ambos']).optional(),
  plazo_credito_dias: z.coerce.number().int().nonnegative().optional(),
  cupo_credito: montoSchema,
  notas: optionalString,
  activo: z.boolean().optional(),
}).passthrough()

export const itemFacturaSchema = z.object({
  codigo_item: optionalString,
  descripcion: requiredString('Descripción del ítem'),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  unidad: z.string().optional(),
  valor_unitario: z.coerce.number().nonnegative('El valor unitario no puede ser negativo'),
  descuento_item: z.coerce.number().nonnegative().optional(),
  porcentaje_iva: z.coerce.number().min(0).max(100).optional(),
}).passthrough()

export const facturaSchema = z.object({
  tipo_documento_id: requiredId('Tipo de documento'),
  tercero_id: requiredId('Tercero'),
  fecha_emision: z.string().min(1, 'Fecha de emisión es requerida'),
  fecha_vencimiento: z.string().min(1, 'Fecha de vencimiento es requerida').optional().nullable(),
  items: z.string().min(1, 'La factura debe tener al menos un ítem'),
  notas: optionalString,
  orden_servicio: optionalString,
}).passthrough()

export const reciboCajaSchema = z.object({
  factura_id: requiredId('Factura'),
  valor_pagado: z.coerce.number().positive('El valor del pago debe ser mayor a cero'),
  valor_aplicado: z.coerce.number().nonnegative().optional(),
  fecha_pago: z.string().optional(),
  forma_pago: z.enum(['efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'otro']).optional(),
  numero_comprobante_transaccion: optionalString,
  banco_origen: optionalString,
  notas: optionalString,
}).passthrough()

export const notaCreditoSchema = z.object({
  factura_id: requiredId('Factura'),
  tipo_documento_id: requiredId('Tipo de documento'),
  motivo: requiredString('Motivo'),
  subtotal: z.coerce.number().nonnegative().optional(),
  iva: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative().optional(),
}).passthrough()

export const notaDebitoSchema = z.object({
  factura_id: requiredId('Factura'),
  tipo_documento_id: requiredId('Tipo de documento'),
  motivo: requiredString('Motivo'),
  subtotal: z.coerce.number().nonnegative().optional(),
  iva: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative().optional(),
}).passthrough()
