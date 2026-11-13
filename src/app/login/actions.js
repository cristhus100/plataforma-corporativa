'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')

  // Redirigir a la ruta original si venía de un redirect del middleware.
  // Validar que sea una ruta relativa del mismo origen para evitar Open Redirect.
  const redirectTo = formData.get('redirect')
  const safeRedirect =
    typeof redirectTo === 'string' &&
    redirectTo.startsWith('/') &&
    !redirectTo.startsWith('//') &&
    !redirectTo.match(/^[a-zA-Z]+:/)
      ? redirectTo
      : '/'
  redirect(safeRedirect)
}

export async function signup(formData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return { error: error.message }
  }

  return { success: 'Revisa tu correo para confirmar la cuenta. Si ya está confirmado, inicia sesión.' }
}

export async function resetPassword(formData) {
  const supabase = await createClient()

  const email = formData.get('email')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Revisa tu correo. Te hemos enviado un enlace para restablecer tu contraseña.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
