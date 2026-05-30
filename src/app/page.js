'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StatsCard from '@/components/ui/StatsCard'
import { Users, Wrench, MapPin, AlertTriangle, CheckCircle2, Clock, XCircle, History, UserPlus, FileUp, Truck, Car, Wind, Settings } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAlertas } from '@/hooks/useAlertas'

const COLORS_ESTADOS = {
  operativa: '#10B981',
  en_mantenimiento: '#F59E0B',
  en_reparacion: '#F97316',
  fuera_servicio: '#EF4444',
  dada_de_baja: '#6B7280',
}

const LABELS_ESTADOS = {
  operativa: 'Operativa',
  en_mantenimiento: 'En Mantenimiento',
  en_reparacion: 'En Reparación',
  fuera_servicio: 'Fuera de Servicio',
  dada_de_baja: 'Dada de Baja',
}

export default function Dashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    stats: { trabajadores: 0, maquinaria: 0, vehiculos: 0, ubicacion: 0 },
    maquinariaPorEstado: [],
    trabajadoresPorDepto: [],
    timeline: [],
  })
  const { documentos: alertasDocumentos, maquinaria: alertasMaquinaria, vehiculos: alertasVehiculos, filtroAire: alertasFiltroAire } = useAlertas()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const [
        { count: trabCount },
        maqRes,
        trabRes,
        vehiculosCountRes,
        historialRes,
        nuevosTrabRes,
        nuevaMaqRes,
        nuevosVehRes,
        docsTrabRes,
        docsVehRes,
        cambiosAceiteRes,
      ] = await Promise.all([
        supabase.from('trabajadores').select('*', { count: 'exact', head: true }),
        supabase.from('maquinaria').select('estado').eq('activo', true),
        supabase.from('trabajadores').select('departamento_area:departamentos(nombre)').not('departamento_id', 'is', null),
        supabase.from('vehiculos').select('*', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('historial_trabajadores').select('*, trabajador:trabajadores!trabajador_id(nombre,primer_apellido)').order('created_at', { ascending: false }).limit(20),
        supabase.from('trabajadores').select('id, nombre, primer_apellido, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('maquinaria').select('id, nombre, codigo_interno, created_at').eq('activo', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('vehiculos').select('id, nombre, placa, created_at').eq('activo', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('documentos_trabajadores').select('id, created_at, tipo_documento_id, tipos_documentos_trabajador!tipo_documento_id(nombre), trabajador:trabajadores!trabajador_id(nombre,primer_apellido)').order('created_at', { ascending: false }).limit(10),
        supabase.from('documentos_vehiculos').select('id, created_at, tipo_documento_id, tipo:tipos_documentos_vehiculo!tipo_documento_id(nombre), vehiculo:vehiculos!vehiculo_id(nombre,placa)').order('created_at', { ascending: false }).limit(10),
        supabase.from('registros_horometro').select('id, created_at, es_cambio_aceite, es_cambio_filtro_combustible, condicion_filtro_aire, operador_nombre, maquinaria_id, maquinaria:maquinaria!maquinaria_id(nombre, codigo_interno)').or('es_cambio_aceite.eq.true,es_cambio_filtro_combustible.eq.true,condicion_filtro_aire.not.is.null').order('created_at', { ascending: false }).limit(10),
      ])

      // Maquinaria por estado
      const estadosMap = {}
      ;(maqRes.data || []).forEach((m) => {
        estadosMap[m.estado] = (estadosMap[m.estado] || 0) + 1
      })
      const maquinariaPorEstado = Object.entries(estadosMap).map(([name, value]) => ({
        name: LABELS_ESTADOS[name] || name,
        value,
        color: COLORS_ESTADOS[name] || '#6B7280',
      }))

      // Empleados por departamento
      const deptoMap = {}
      ;(trabRes.data || []).forEach((t) => {
        const nombre = t.departamento_area?.nombre || 'Sin departamento'
        deptoMap[nombre] = (deptoMap[nombre] || 0) + 1
      })
      const trabajadoresPorDepto = Object.entries(deptoMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)

      // Construir timeline unificada
      const timeline = []

      ;(historialRes.data || []).forEach((h) => {
        const nombre = h.trabajador
          ? `${h.trabajador.nombre || ''} ${h.trabajador.primer_apellido || ''}`.trim()
          : `Trabajador #${h.trabajador_id}`
        timeline.push({
          id: `h-${h.id}`,
          fecha: h.created_at,
          tipo: h.tipo_evento === 'actualizacion' ? 'edit' : h.tipo_evento?.startsWith('documento') ? 'file' : 'edit',
          mensaje: h.titulo || h.descripcion || 'Actualización',
          entidad: 'Empleado',
          nombre,
          icon: h.tipo_evento?.startsWith('documento') ? FileUp : Settings,
        })
      })

      ;(nuevosTrabRes.data || []).forEach((t) => {
        timeline.push({
          id: `nt-${t.id}`,
          fecha: t.created_at,
          tipo: 'create',
          mensaje: 'Nuevo empleado registrado',
          entidad: 'Empleado',
          nombre: `${t.nombre || ''} ${t.primer_apellido || ''}`.trim(),
          icon: UserPlus,
        })
      })

      ;(nuevaMaqRes.data || []).forEach((m) => {
        timeline.push({
          id: `nm-${m.id}`,
          fecha: m.created_at,
          tipo: 'create',
          mensaje: `Nueva maquinaria: ${m.codigo_interno || ''}`,
          entidad: 'Maquinaria',
          nombre: m.nombre || '',
          icon: Truck,
        })
      })

      // Nuevos vehículos
      ;(nuevosVehRes.data || []).forEach((v) => {
        timeline.push({
          id: `nv-${v.id}`,
          fecha: v.created_at,
          tipo: 'create',
          mensaje: `Nuevo vehículo: ${v.placa || ''}`,
          entidad: 'Vehículo',
          nombre: v.nombre || '',
          icon: Car,
        })
      })

      // Documentos subidos - trabajadores
      ;(docsTrabRes.data || []).forEach((d) => {
        const nombreTrab = d.trabajador
          ? `${d.trabajador.nombre || ''} ${d.trabajador.primer_apellido || ''}`.trim()
          : 'Empleado'
        timeline.push({
          id: `dt-${d.id}`,
          fecha: d.created_at,
          tipo: 'file',
          mensaje: `Documento: ${d.tipos_documentos_trabajador?.nombre || 'Documento'}`,
          entidad: 'Empleado',
          nombre: nombreTrab,
          icon: FileUp,
        })
      })

      // Documentos subidos - vehículos
      ;(docsVehRes.data || []).forEach((d) => {
        timeline.push({
          id: `dv-${d.id}`,
          fecha: d.created_at,
          tipo: 'file',
          mensaje: `Documento: ${d.tipo?.nombre || 'Documento'}`,
          entidad: 'Vehículo',
          nombre: d.vehiculo?.nombre || d.vehiculo?.placa || 'Vehículo',
          icon: FileUp,
        })
      })

      // Cambios de aceite, filtros y condición de filtro de aire
      ;(cambiosAceiteRes.data || []).forEach((r) => {
        const maqNombre = r.maquinaria?.nombre || r.maquinaria?.codigo_interno || 'Maquinaria'
        let mensaje = ''
        let icon = null
        if (r.es_cambio_aceite) {
          mensaje = `Cambio de aceite realizado por ${r.operador_nombre || 'operador'}`
          icon = Truck
        } else if (r.es_cambio_filtro_combustible) {
          mensaje = `Cambio de filtros combustible por ${r.operador_nombre || 'operador'}`
          icon = Wrench
        } else if (r.condicion_filtro_aire) {
          mensaje = `Filtro de aire: ${r.condicion_filtro_aire === 'critica' ? 'Crítico' : r.condicion_filtro_aire === 'regular' ? 'Regular' : 'Buena'} (${r.operador_nombre || 'operador'})`
          icon = Wind
        }
        if (mensaje) {
          timeline.push({
            id: `rh-${r.id}`,
            fecha: r.created_at,
            tipo: 'edit',
            mensaje,
            entidad: 'Maquinaria',
            nombre: maqNombre,
            icon: icon || Settings,
          })
        }
      })

      timeline.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      const timelineLimit = timeline.slice(0, 20)

      setDashboardData({
        stats: {
          trabajadores: trabCount || 0,
          maquinaria: maqRes.data?.length || 0,
          vehiculos: vehiculosCountRes.count || 0,
          ubicacion: maqRes.data?.length || 0,
        },
        maquinariaPorEstado,
        trabajadoresPorDepto,
        timeline: timelineLimit,
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalMaquinaria = useMemo(
    () => dashboardData.maquinariaPorEstado.reduce((sum, item) => sum + item.value, 0),
    [dashboardData.maquinariaPorEstado]
  )

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    })


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bienvenido a la plataforma corporativa</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/trabajadores">
          <StatsCard title="Empleados" value={loading ? '...' : dashboardData.stats.trabajadores} icon={Users} color="blue" />
        </Link>
        <Link href="/maquinaria">
          <StatsCard title="Maquinaria" value={loading ? '...' : dashboardData.stats.maquinaria} icon={Wrench} color="green" />
        </Link>
        <Link href="/vehiculos">
          <StatsCard title="Vehículos" value={loading ? '...' : dashboardData.stats.vehiculos} icon={Car} color="blue" />
        </Link>
        <Link href="/ubicacion">
          <StatsCard title="Ubicación" value={loading ? '...' : dashboardData.stats.ubicacion} icon={MapPin} color="purple" />
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doughnut Chart - Maquinaria */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Maquinaria</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Cargando...</p>
            </div>
          ) : dashboardData.maquinariaPorEstado.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Sin datos</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={200} height={240}>
                <PieChart>
                  <Pie
                    data={dashboardData.maquinariaPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dashboardData.maquinariaPorEstado.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {dashboardData.maquinariaPorEstado.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{item.value}</span>
                      <span className="text-gray-400 text-xs w-10 text-right">
                        {totalMaquinaria > 0 ? Math.round((item.value / totalMaquinaria) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm font-semibold text-gray-900">
                  <span>Total</span>
                  <span>{totalMaquinaria}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart - Empleados por departamento */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Empleados por Departamento</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Cargando...</p>
            </div>
          ) : dashboardData.trabajadoresPorDepto.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Sin datos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboardData.trabajadoresPorDepto} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  formatter={(value) => [value, 'Empleados']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#1A1A1A" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <History size={18} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
        </div>
        {loading ? (
          <p className="text-gray-400">Cargando...</p>
        ) : dashboardData.timeline.length === 0 ? (
          <p className="text-gray-400">Sin actividad reciente</p>
        ) : (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-4 top-1 bottom-1 w-0.5 bg-gray-200" />
            <div className="space-y-0">
              {dashboardData.timeline.map((item) => {
                const Icon = item.icon
                const fecha = new Date(item.fecha)
                const diffMs = Date.now() - fecha.getTime()
                const diffMin = Math.floor(diffMs / 60000)
                const diffHoras = Math.floor(diffMs / 3600000)
                const diffDias = Math.floor(diffMs / 86400000)
                const timeAgo = diffMin < 1 ? 'Ahora' :
                  diffMin < 60 ? `Hace ${diffMin} min` :
                  diffHoras < 24 ? `Hace ${diffHoras} h` :
                  `Hace ${diffDias} d`

                return (
                  <div key={item.id} className="relative flex gap-4 py-3">
                    <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{item.nombre}</span>
                        {item.entidad === 'Maquinaria' ? (
                          <span className="text-gray-500"> — {item.mensaje}</span>
                        ) : (
                          <span className="text-gray-500"> — {item.mensaje}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Alertas Documentos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Alertas Documentos</h2>
            <Link href="/alertas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver todas
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-red-600" />
                  <span className="text-sm text-red-800">Vencidos</span>
                </div>
                <span className="text-lg font-bold text-red-700">{alertasDocumentos.filter((a) => a.estado_alerta === 'VENCIDO').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-600" />
                  <span className="text-sm text-orange-800">Críticos</span>
                </div>
                <span className="text-lg font-bold text-orange-700">{alertasDocumentos.filter((a) => a.estado_alerta === 'CRITICO').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-yellow-600" />
                  <span className="text-sm text-yellow-800">Próximos</span>
                </div>
                <span className="text-lg font-bold text-yellow-700">{alertasDocumentos.filter((a) => a.estado_alerta === 'PROXIMO').length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Alertas Maquinaria */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5" /> Mantenimiento
            </h2>
            <Link href="/alertas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Ver todas
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-red-600" />
                  <span className="text-sm text-red-800">Vencidos</span>
                </div>
                <span className="text-lg font-bold text-red-700">{alertasMaquinaria.filter((a) => a.estado_alerta === 'VENCIDO').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-600" />
                  <span className="text-sm text-orange-800">Críticos</span>
                </div>
                <span className="text-lg font-bold text-orange-700">{alertasMaquinaria.filter((a) => a.estado_alerta === 'CRITICO').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-yellow-600" />
                  <span className="text-sm text-yellow-800">Próximos</span>
                </div>
                <span className="text-lg font-bold text-yellow-700">{alertasMaquinaria.filter((a) => a.estado_alerta === 'PROXIMO').length}</span>
              </div>
              {alertasMaquinaria.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {alertasMaquinaria.filter(a => a.tipo_alerta === 'aceite_motor').length} de aceite motor · {alertasMaquinaria.filter(a => a.tipo_alerta === 'filtro_combustible').length} de filtros
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alertas Vehículos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Car className="w-5 h-5" /> Vehículos
            </h2>
            <Link href="/alertas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todas</Link>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2"><XCircle size={14} className="text-red-600" /><span className="text-sm text-red-800">Vencidos</span></div>
                <span className="text-lg font-bold text-red-700">{alertasVehiculos.filter((a) => a.estado_alerta === 'VENCIDO').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-orange-600" /><span className="text-sm text-orange-800">Críticos</span></div>
                <span className="text-lg font-bold text-orange-700">{alertasVehiculos.filter((a) => a.estado_alerta === 'CRITICO').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2"><Clock size={14} className="text-yellow-600" /><span className="text-sm text-yellow-800">Próximos</span></div>
                <span className="text-lg font-bold text-yellow-700">{alertasVehiculos.filter((a) => a.estado_alerta === 'PROXIMO').length}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">{alertasVehiculos.length} alertas activas</p>
              </div>
            </div>
          )}
        </div>

        {/* Alertas Filtro de Aire */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Wind size={18} /> Filtro de Aire
            </h2>
            <Link href="/alertas" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todas</Link>
          </div>
          {loading ? (
            <p className="text-gray-400">Cargando...</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-orange-600" /><span className="text-sm text-orange-800">Críticos</span></div>
                <span className="text-lg font-bold text-orange-700">{alertasFiltroAire.filter((a) => a.ultima_condicion_filtro_aire === 'critica').length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2"><Clock size={14} className="text-yellow-600" /><span className="text-sm text-yellow-800">Regulares</span></div>
                <span className="text-lg font-bold text-yellow-700">{alertasFiltroAire.filter((a) => a.ultima_condicion_filtro_aire === 'regular').length}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">{alertasFiltroAire.length} equipos con alerta</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
