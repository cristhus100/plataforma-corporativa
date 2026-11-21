import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con rol de servicio (service role).
 * BYPASSA las políticas RLS — debe usarse EXCLUSIVAMENTE en el servidor
 * para flujos públicos que no requieren sesión de usuario
 * (ej: formularios por código QR desde la cabina).
 *
 * NUNCA debe importarse desde el cliente ('use client') ni exponerse al bundle.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
