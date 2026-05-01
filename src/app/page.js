'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import StatsCard from '@/components/ui/StatsCard'
import { Users, FileText, Package, Megaphone } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({
    trabajadores: 0,
    cotizaciones: 0,
    productos: 0,
    comunicados: 0,
  })
  const [recentQuotes, setRecentQuotes] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const [trabajadores, cotizaciones, productos, comunicados] = await Promise.all([
        supabase.from('trabajadores').select('*', { count: 'exact', head: true }),
        supabase.from('cotizaciones').select('*', { count: 'exact', head: true }),
        supabase.from('productos').select('*', { count: 'exact', head: true }),
        supabase.from('comunicados').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        trabajadores: trabajadores.count || 0,
        cotizaciones: cotizaciones.count || 0,
        productos: productos.count || 0,
        comunicados: comunicados.count || 0,
      })

      const { data: quotes } = await supabase
        .from('cotizaciones')
        .select('*, clientes(nombre)')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentQuotes(quotes || [])

      const { data: news } = await supabase
        .from('comunicados')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)

      setAnnouncements(news || [])
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0)

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bienvenido a la plataforma corporativa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Trabajadores"
          value={loading ? '...' : stats.trabajadores}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Cotizaciones"
          value={loading ? '...' : stats.cotizaciones}
          icon={FileText}
          color="green"
        />
        <StatsCard
          title="Productos"
          value={loading ? '...' : stats.productos}
          icon={Package}
          color="purple"
        />
        <StatsCard
          title="Comunicados"
          value={loading ? '...' : stats.comunicados}
          icon={Megaphone}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cotizaciones Recientes
          </h2>
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : recentQuotes.length === 0 ? (
            <p className="text-gray-500">No hay cotizaciones registradas</p>
          ) : (
            <div className="space-y-3">
              {recentQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex justify-between items-center border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {quote.clientes?.nombre || 'Sin cliente'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(quote.created_at)}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(quote.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Comunicados
          </h2>
          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-500">No hay comunicados</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="border-b pb-2 last:border-0"
                >
                  <p className="font-medium text-gray-900">{item.titulo}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
