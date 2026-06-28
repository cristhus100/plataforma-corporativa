import { z } from 'zod'
import { requiredString, requiredId } from './common'

/**
 * Schema Zod para Órdenes de Mantenimiento
 * Tipos: preventivo, correctivo, predictivo
 * Prioridades: baja, media, alta, critica
 * Estados: pendiente, en_proceso, completado, cancelado
 */
export const ordenMantenimientoSchema = z.object({
  titulo: requiredString('Título'),
  descripcion: z.string().optional().nullable(),

  maquinaria_id: z.coerce.number().int().positive().optional().nullable(),
  vehiculo_id: z.coerce.number().int().positive().optional().nullable(),

  tipo: z.enum(['preventivo', 'correctivo', 'predictivo']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  estado: z.enum(['pendiente', 'en_proceso', 'completado', 'cancelado']).optional(),

  frente_trabajo_id: z.coerce.number().int().positive().optional().nullable(),
  responsable_id: z.coerce.number().int().positive().optional().nullable(),

  fecha_programada: z.string().min(1, 'Fecha programada es requerida'),
  fecha_inicio: z.string().optional().nullable(),
  fecha_fin: z.string().optional().nullable(),

  horometro_actual: z.coerce.number().nonnegative().optional().nullable(),
  costo_estimado: z.coerce.number().nonnegative().optional().nullable(),
  costo_real: z.coerce.number().nonnegative().optional().nullable(),

  observaciones: z.string().optional().nullable(),
  activo: z.boolean().optional(),
}).passthrough()

/**
 * Schema para cambio de estado (más permisivo, solo requiere estado)
 */
export const cambioEstadoOrdenSchema = z.object({
  estado: z.enum(['pendiente', 'en_proceso', 'completado', 'cancelado']),
  fecha_fin: z.string().optional().nullable(),
}).passthrough()
