'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Verifica que el usuario actual esté autenticado y tenga rol de admin.
 * @returns {{ supabase, user }}
 */
export async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.rol !== 'admin') throw new Error('Se requiere rol de administrador')
  return { supabase, user }
}

/**
 * Formatea un error para devolverlo como respuesta de Server Action.
 */
export async function formatearError(err) {
  console.error('[ServerAction]', err)
  if (err instanceof Error) return { error: err.message }
  return { error: 'Error inesperado del servidor' }
}

/**
 * Valida datos contra un esquema Zod y retorna resultado estructurado.
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {{ success: true, data: T } | { success: false, error: string }}
 */
export async function validate(schema, data) {
  const result = schema.safeParse(data)
  if (result.success) return { success: true, data: result.data }

  const messages = result.error.issues.map(
    issue => `${issue.path.join('.')}: ${issue.message}`
  )
  return {
    success: false,
    error: `Validación fallida: ${messages.join('; ')}`,
  }
}
