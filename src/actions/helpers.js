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
