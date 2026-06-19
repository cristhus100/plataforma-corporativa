import { z } from 'zod'
import { requiredString } from './common'

export const frenteSchema = z.object({
  codigo: requiredString('Código'),
  nombre: requiredString('Nombre'),
  ubicacion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  departamento: z.string().optional().nullable(),
  activo: z.boolean().optional(),
}).passthrough()
