import { z } from 'zod'
import { requiredId } from './common'

export const asignacionTurnoSchema = z.object({
  trabajador_id: requiredId('Trabajador'),
  tipo_turno_id: requiredId('Tipo de turno'),
  frente_trabajo_id: z.coerce.number().int().positive().optional().nullable(),
  fecha_inicio: z.string().min(1, 'Fecha de inicio es requerida'),
  fecha_fin: z.string().optional().nullable(),
  estado: z.enum(['activo', 'inactivo']).optional(),
  observaciones: z.string().optional().nullable(),
}).passthrough()

export const asistenciaTurnoSchema = z.object({
  fecha: z.string().min(1, 'Fecha es requerida'),
  trabajador_id: requiredId('Trabajador'),
  tipo_turno_id: requiredId('Tipo de turno'),
  estado: z.enum(['presente', 'ausente', 'permiso', 'vacaciones', 'incapacidad', 'otro']),
}).passthrough()

export const asistenciaMasivaSchema = z.array(asistenciaTurnoSchema).min(1, 'Debe haber al menos un registro')
