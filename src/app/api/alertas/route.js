import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: alertas, error } = await supabase
    .from('vw_alertas_documentos')
    .select('*')
    .neq('estado_alerta', 'VIGENTE')
    .order('dias_para_vencer', { ascending: true })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    total: alertas?.length || 0,
    vencidos: alertas?.filter((a) => a.estado_alerta === 'VENCIDO').length || 0,
    criticos: alertas?.filter((a) => a.estado_alerta === 'CRITICO').length || 0,
    proximos: alertas?.filter((a) => a.estado_alerta === 'PROXIMO').length || 0,
    alertas: alertas || [],
    generado: new Date().toISOString(),
    mensaje: 'Configura un servicio de email (Resend, SendGrid) para recibir notificaciones.',
  })
}
