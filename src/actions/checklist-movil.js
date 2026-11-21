/**
 * SERVER ACTIONS — Checklist y tanqueos desde código QR (cabina).
 *
 * Operaciones públicas (sin sesión de usuario) que escriben en BD
 * usando el rol de servicio (service role), que bypassa RLS.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { validate } from './helpers'
import { createServiceClient } from '@/lib/supabase/service'
import { CHECKLIST_ITEMS } from '@/lib/utils/checklist'

const estadoSchema = z.enum(['bien', 'regular', 'mal'])

// Esquema de los 15 ítems del checklist (exactamente las claves de la tabla)
const itemsSchema = z.object(
  Object.fromEntries(CHECKLIST_ITEMS.map((i) => [i.key, estadoSchema]))
)

const checklistSchema = z.object({
  maquinariaId: z.number().int().positive(),
  operador_nombre: z.string().trim().min(2, 'Ingresa el nombre del operador (mínimo 2 caracteres)'),
  items: itemsSchema,
  observaciones: z.string().trim().max(500).optional().nullable(),
})

const tanqueoSchema = z.object({
  maquinariaId: z.number().int().positive(),
  operador_nombre: z.string().trim().min(2, 'Ingresa el nombre del operador'),
  operador_cedula: z.string().trim().optional().nullable(),
  turno: z.enum(['A', 'B', 'C']).optional(),
  galones: z.number().positive('Ingresa una cantidad válida de galones'),
})

const hoyStr = () => new Date().toISOString().split('T')[0]

/**
 * Carga los datos de la máquina para la página QR móvil.
 * Incluye si ya existe checklist registrado hoy.
 */
export async function obtenerMaquinariaMovil(maquinariaId) {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('maquinaria')
      .select('id, nombre, codigo_interno, horometro_actual, kilometraje, estado')
      .eq('id', maquinariaId)
      .single()

    if (error || !data) {
      return { success: false, error: error?.message || 'Equipo no encontrado' }
    }

    const hoy = hoyStr()
    const { data: checklistHoy } = await supabase
      .from('checklist_diario_maquinaria')
      .select('operador_nombre, total_fallas, fecha')
      .eq('maquinaria_id', maquinariaId)
      .eq('fecha', hoy)
      .limit(1)
      .maybeSingle()

    return {
      success: true,
      maquinaria: {
        ...data,
        checklist_hoy: checklistHoy ?? null,
      },
    }
  } catch (err) {
    console.error('[checklist-movil] obtenerMaquinariaMovil:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

/**
 * Guarda un checklist diario desde la página móvil por QR.
 */
export async function guardarChecklistMovil(datos) {
  try {
    const validacion = await validate(checklistSchema, datos)
    if (!validacion.success) return { success: false, error: validacion.error }

    const { maquinariaId, operador_nombre, items, observaciones } = validacion.data
    const supabase = createServiceClient()

    const hoy = hoyStr()

    const { data: maquina } = await supabase
      .from('maquinaria')
      .select('horometro_actual, kilometraje')
      .eq('id', maquinariaId)
      .single()

    const insertData = {
      maquinaria_id: maquinariaId,
      operador_nombre,
      fecha: hoy,
      horometro: maquina?.horometro_actual ?? null,
      kilometraje: maquina?.kilometraje ?? null,
      ...items,
      total_fallas: Object.values(items).filter((v) => v === 'mal').length,
      observaciones: observaciones || null,
    }

    const { error } = await supabase.from('checklist_diario_maquinaria').insert([insertData])

    if (error) return { success: false, error: error.message }

    const { error: errMaq } = await supabase
      .from('maquinaria')
      .update({ ultimo_checklist_diario: hoy })
      .eq('id', maquinariaId)

    if (errMaq) return { success: false, error: errMaq.message }

    revalidatePath(`/maquinaria/${maquinariaId}`)
    revalidatePath('/maquinaria')

    return { success: true }
  } catch (err) {
    console.error('[checklist-movil] guardarChecklistMovil:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}

/**
 * Registra un tanqueo desde la página móvil por QR (guarda en registros_horometro).
 */
export async function guardarTanqueoMovil(datos) {
  try {
    const validacion = await validate(tanqueoSchema, datos)
    if (!validacion.success) return { success: false, error: validacion.error }

    const { maquinariaId, operador_nombre, operador_cedula, turno, galones } = validacion.data
    const supabase = createServiceClient()

    const hoy = hoyStr()

    const { data: maquina } = await supabase
      .from('maquinaria')
      .select('horometro_actual')
      .eq('id', maquinariaId)
      .single()

    if (!maquina) return { success: false, error: 'Equipo no encontrado' }

    const horometro = maquina.horometro_actual ?? 0

    const insertData = {
      maquinaria_id: maquinariaId,
      operador_nombre: operador_nombre.trim(),
      operador_cedula: operador_cedula || '',
      turno: turno || 'A',
      fecha: hoy,
      horometro_inicial: horometro,
      horometro_final: horometro,
      tanqueo_galones: galones,
    }

    const { error } = await supabase.from('registros_horometro').insert([insertData])

    if (error) return { success: false, error: error.message }

    revalidatePath(`/maquinaria/${maquinariaId}`)
    revalidatePath('/maquinaria')

    return { success: true, galones, horometro }
  } catch (err) {
    console.error('[checklist-movil] guardarTanqueoMovil:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado' }
  }
}
