/**
 * Helpers para consultas de Nómina desde Supabase
 */
import { createClient } from '@/lib/supabase/client'

export async function fetchDashboardResumenNomina() {
  const supabase = createClient()

  const [periodosRes, nominasRes, trabajadoresRes] = await Promise.all([
    supabase.from('periodos_nomina').select('id').eq('estado', 'abierto'),
    supabase.from('nominas').select(
      'sueldo_basico, auxilio_transporte, horas_extras_diurnas, horas_extras_nocturnas, ' +
      'horas_extras_dominicales, horas_recargo_nocturno, horas_recargo_dominical, ' +
      'comisiones, bonificaciones, otros_devengos, ' +
      'deduccion_salud, deduccion_pension, deduccion_arl, deduccion_fondo_solidaridad, ' +
      'deduccion_fondo_subsistencia, embargos, libranzas, otras_deducciones, ' +
      'pagado'
    ).eq('activo', true),
    supabase.from('trabajadores').select('id', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'activo'),
  ])

  const nominas = (nominasRes.data || []).map(n => {
    const devengos = [
      n.sueldo_basico, n.auxilio_transporte, n.horas_extras_diurnas, n.horas_extras_nocturnas,
      n.horas_extras_dominicales, n.horas_recargo_nocturno, n.horas_recargo_dominical,
      n.comisiones, n.bonificaciones, n.otros_devengos,
    ].reduce((s, v) => s + Number(v || 0), 0)
    const deducciones = [
      n.deduccion_salud, n.deduccion_pension, n.deduccion_arl, n.deduccion_fondo_solidaridad,
      n.deduccion_fondo_subsistencia, n.embargos, n.libranzas, n.otras_deducciones,
    ].reduce((s, v) => s + Number(v || 0), 0)
    return { ...n, total_neto: Math.round((devengos - deducciones) * 100) / 100 }
  })
  const pendientes = nominas.filter(n => !n.pagado)
  const totalNetoPendiente = pendientes.reduce((sum, n) => sum + Number(n.total_neto || 0), 0)

  return {
    periodos_activos: periodosRes.data?.length || 0,
    nominas_pendientes: pendientes.length,
    total_pendiente_pago: totalNetoPendiente,
    trabajadores_activos: trabajadoresRes.count || 0,
  }
}
