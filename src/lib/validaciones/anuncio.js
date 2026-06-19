import { z } from 'zod'
import { requiredString } from './common'

export const anuncioSchema = z.object({
  titulo: requiredString('Título'),
  contenido: requiredString('Contenido'),
  tipo: z.string().min(1, 'Tipo es requerido').optional(),
  prioridad: z.enum(['alta', 'media', 'baja', 'urgente']).optional(),
  activo: z.boolean().optional(),
}).passthrough()
