import { z } from 'zod'
import {
  requiredString,
  optionalString,
  montoSchema,
  fechaColombiaSchema,
  telefonoSchema,
  emailSchema,
} from './common'

export const trabajadorSchema = z.object({
  tipo_documento: z.enum(['CC', 'CE', 'NIT', 'Pasaporte']).optional(),
  cedula: requiredString('Cédula'),
  primer_apellido: requiredString('Primer apellido'),
  segundo_apellido: optionalString,
  nombre: requiredString('Nombre'),
  fecha_nacimiento: fechaColombiaSchema,
  lugar_nacimiento: optionalString,
  genero: z.enum(['M', 'F', 'Otro']).optional().nullable(),
  estado_civil: z
    .enum(['Soltero', 'Casado', 'Union Libre', 'Divorciado', 'Viudo'])
    .optional()
    .nullable(),
  rh: z
    .string()
    .regex(/^(A|B|AB|O)[+-]$/, 'RH inválido (ej: O+, A-)')
    .optional()
    .nullable(),
  telefono: telefonoSchema,
  email: emailSchema,
  direccion: optionalString,
  ciudad: optionalString,
  departamento: optionalString,
  cargo_id: z.coerce.number().int().positive().optional().nullable(),
  departamento_id: z.coerce.number().int().positive().optional().nullable(),
  frente_trabajo_id: z.coerce.number().int().positive().optional().nullable(),
  fecha_ingreso: fechaColombiaSchema,
  tipo_contrato: z
    .enum(['indefinido', 'fijo', 'obra_labor', 'prestacion_servicios', 'aprendizaje'])
    .optional()
    .nullable(),
  salario: montoSchema,
  eps: optionalString,
  arl: optionalString,
  fondo_pension: optionalString,
  caja_compensacion: optionalString,
  contacto_emergencia_nombre: optionalString,
  contacto_emergencia_telefono: telefonoSchema,
  contacto_emergencia_parentesco: optionalString,
  activo: z.boolean().optional(),
  estado: z.string().optional().nullable(),
}).passthrough()
