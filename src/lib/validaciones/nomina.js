import { z } from 'zod'
import { requiredString, optionalString, montoSchema, requiredId } from './common'

export const periodoNominaSchema = z.object({
  tipo: z.enum(['quincenal', 'mensual', 'semanal']).optional(),
  ano: z.coerce.number().int().min(2020).max(2099),
  mes: z.coerce.number().int().min(1).max(12),
  numero_periodo: z.coerce.number().int().min(1).max(3),
  fecha_inicio: z.string().min(1, 'Fecha de inicio es requerida'),
  fecha_fin: z.string().min(1, 'Fecha de fin es requerida'),
  fecha_pago: z.string().optional().nullable(),
  observaciones: optionalString,
}).passthrough()

export const novedadNominaSchema = z.object({
  trabajador_id: requiredId('Trabajador'),
  tipo_novedad_id: requiredId('Tipo de novedad'),
  periodo_nomina_id: z.coerce.number().int().positive().optional().nullable(),
  fecha_inicio: z.string().min(1, 'Fecha de inicio es requerida'),
  fecha_fin: z.string().optional().nullable(),
  dias: z.coerce.number().int().nonnegative().optional().nullable(),
  valor: montoSchema,
  descripcion: optionalString,
}).passthrough()

export const pagoNominaSchema = z.object({
  fecha_pago: z.string().optional(),
  medio_pago: z.enum(['transferencia', 'efectivo', 'cheque', 'nomina_electronica']),
  numero_comprobante: optionalString,
}).passthrough()

export const prestacionSchema = z.object({
  trabajador_id: requiredId('Trabajador'),
  tipo_liquidacion: z.enum(['cesantias', 'intereses_cesantias', 'prima', 'vacaciones']),
  periodo_inicio: z.string().min(1, 'Período inicio es requerido'),
  periodo_fin: z.string().min(1, 'Período fin es requerido'),
  salario_base: z.coerce.number().nonnegative(),
  auxilio_transporte_base: z.coerce.number().nonnegative().optional(),
  dias_trabajados: z.coerce.number().int().positive('Días trabajados debe ser mayor a 0'),
  valor_calculado: z.coerce.number().nonnegative(),
  valor_pagado: z.coerce.number().nonnegative().optional(),
  fecha_pago: z.string().optional().nullable(),
  observaciones: optionalString,
}).passthrough()
