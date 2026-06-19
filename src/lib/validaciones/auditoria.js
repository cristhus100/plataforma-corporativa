import { z } from 'zod'

export const checklistAuditoriaSchema = z.object({
  frente_id: z.coerce.number().int().positive().optional(),
  respuestas: z.record(z.any()).optional(),
}).passthrough()
