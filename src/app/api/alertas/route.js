import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )

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
