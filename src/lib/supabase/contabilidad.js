/**
 * Helpers para consultas de Contabilidad desde Supabase
 */
import { createClient } from '@/lib/supabase/client'

export async function fetchDashboardResumenContable() {
  const supabase = createClient()

  const [cuentasRes, comprobantesRes] = await Promise.all([
    supabase.from('plan_cuentas').select('id', { count: 'exact', head: true }).eq('activa', true),
    supabase
      .from('comprobantes')
      .select('total_debito, total_credito, created_at')
      .eq('estado', 'activo')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const comprobantes = comprobantesRes.data || []
  const totalDebitos = comprobantes.reduce((sum, c) => sum + Number(c.total_debito || 0), 0)
  const totalCreditos = comprobantes.reduce((sum, c) => sum + Number(c.total_credito || 0), 0)

  return {
    cuentas_activas: cuentasRes.count || 0,
    comprobantes_mes: comprobantes.length,
    total_debitos_mes: totalDebitos,
    total_creditos_mes: totalCreditos,
  }
}
