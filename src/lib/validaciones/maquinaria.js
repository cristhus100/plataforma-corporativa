import { z } from 'zod'
import {
  requiredString,
  optionalString,
  requiredId,
  montoSchema,
  fechaColombiaSchema,
} from './common'

export const maquinariaSchema = z.object({
  codigo_interno: requiredString('Código interno'),
  nombre: requiredString('Nombre'),
  tipo_maquinaria_id: requiredId('Tipo de maquinaria'),
  marca: optionalString,
  modelo: optionalString,
  anio: z.coerce.number().int().min(1900).max(2099).optional().nullable(),
  numero_serie: optionalString,
  numero_motor: optionalString,
  numero_chasis: optionalString,
  placa: optionalString,
  estado: z
    .enum(['operativa', 'en_mantenimiento', 'en_reparacion', 'fuera_servicio', 'dada_de_baja'])
    .optional(),
  ubicacion_actual: optionalString,
  frente_trabajo_id: z.coerce.number().int().positive().optional().nullable(),
  horometro_actual: z.coerce.number().nonnegative().optional().nullable(),
  kilometraje_actual: z.coerce.number().nonnegative().optional().nullable(),
  fecha_adquisicion: fechaColombiaSchema,
  valor_adquisicion: montoSchema,
  proveedor: optionalString,
  observaciones: optionalString,
  activo: z.boolean().optional(),
}).passthrough()
