import { z } from 'zod'
import { requiredString, optionalString, placaSchema } from './common'

export const vehiculoSchema = z.object({
  placa: placaSchema,
  nombre: requiredString('Nombre'),
  marca: optionalString,
  modelo: optionalString,
  anio: z.coerce.number().int().min(1900).max(2099).optional().nullable(),
  color: optionalString,
  tipo: z.enum(['particular', 'camioneta', 'camion', 'moto', 'otro']).optional(),
  numero_motor: optionalString,
  numero_chasis: optionalString,
  estado: z.enum(['operativo', 'en_mantenimiento', 'fuera_servicio']).optional(),
  kilometraje_actual: z.coerce.number().nonnegative().optional().nullable(),
  activo: z.boolean().optional(),
}).passthrough()
