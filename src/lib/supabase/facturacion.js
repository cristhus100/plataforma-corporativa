/**
 * Helpers para consultas de Facturación / Cartera desde Supabase
 */
import { createClient } from '@/lib/supabase/client'

export async function fetchDashboardResumen() {
  const supabase = createClient()

  const [facturasRes, tercerosRes] = await Promise.all([
    supabase.from('facturas').select('total, estado'),
    supabase.from('terceros').select('id', { count: 'exact', head: true }).eq('activo', true),
  ])

  const facturas = facturasRes.data || []
  const totalFacturado = facturas
    .filter(f => f.estado !== 'anulada')
    .reduce((sum, f) => sum + Number(f.total || 0), 0)
  const pendientes = facturas.filter(f => f.estado === 'pendiente' || f.estado === 'parcial')
  const totalPendiente = pendientes.reduce((sum, f) => sum + Number(f.total || 0), 0)
  const vencidas = facturas.filter(f => f.estado === 'vencida')

  return {
    total_facturado: totalFacturado,
    facturas_pendientes: pendientes.length,
    total_pendiente: totalPendiente,
    facturas_vencidas: vencidas.length,
    clientes_activos: tercerosRes.count || 0,
  }
}
