/**
 * Helpers para consultas de Nómina desde Supabase
 */
import { createClient } from '@/lib/supabase/client'

export async function fetchDashboardResumenNomina() {
  const supabase = createClient()

  const [periodosRes, nominasRes, trabajadoresRes] = await Promise.all([
    supabase.from('periodos_nomina').select('id').eq('estado', 'abierto'),
    supabase.from('nominas').select('total_neto, pagado').eq('activo', true),
    supabase.from('trabajadores').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'activo'),
  ])

  const nominas = nominasRes.data || []
  const pendientes = nominas.filter(n => !n.pagado)
  const totalNetoPendiente = pendientes.reduce((sum, n) => sum + Number(n.total_neto || 0), 0)

  return {
    periodos_activos: periodosRes.data?.length || 0,
    nominas_pendientes: pendientes.length,
    total_pendiente_pago: totalNetoPendiente,
    trabajadores_activos: trabajadoresRes.count || 0,
  }
}
