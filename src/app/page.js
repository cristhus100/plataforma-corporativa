'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getDatosAuditoria } from '@/lib/supabase/auditoria'
import { calcularCumplimientoEmpleado, calcularCumplimientoMaquinaria, calcularCumplimientoGlobal } from '@/lib/utils/auditoria'
import StatsCard from '@/components/ui/StatsCard'
import { Users, Wrench, MapPin, AlertTriangle, CheckCircle2, Clock, XCircle, History, UserPlus, FileUp, Truck, Car, Wind, Settings, ClipboardList, ClipboardCheck, Calendar, ArrowRight, Receipt, Calculator, DollarSign, Landmark } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

const CUMPLIMIENTO_CONFIG = {
  excelente: { color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', label: 'Sobresaliente' },
  bueno: { color: '#eab308', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'En observación' },
  deficiente: { color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Deficiente' },
  critico: { color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'Crítico' },
}

function getRangoCumplimiento(pct) {
  if (pct === null || pct === undefined) return { ...CUMPLIMIENTO_CONFIG.critico, pct: 0 }
  if (pct >= 80) return { ...CUMPLIMIENTO_CONFIG.excelente, pct }
  if (pct >= 60) return { ...CUMPLIMIENTO_CONFIG.bueno, pct }
  if (pct >= 40) return { ...CUMPLIMIENTO_CONFIG.deficiente, pct }
  return { ...CUMPLIMIENTO_CONFIG.critico, pct }
}

function MiniProgressRing({ pct, size = 48, strokeWidth = 4 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - ((pct || 0) / 100) * circumference
  const config = getRangoCumplimiento(pct)

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={config.color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

export default function Dashboard() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    stats: { trabajadores: 0, maquinaria: 0, vehiculos: 0, ubicacion: 0 },
    maquinariaPorEstado: [],
    trabajadoresPorDepto: [],
    timeline: [],
    alertasDocumentos: [],
    alertasMaquinaria: [],
    alertasVehiculos: [],
    alertasFiltroAire: [],
    proximasOrdenes: [],
    cumplimientoFrentes: [],
  })

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
        ordenesRes,
        frentesRes,
        facturasFinRes,
        planCuentasRes,
        nominasFinRes,
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
        supabase.from('ordenes_mantenimiento').select('id, codigo, titulo, tipo, prioridad, estado, fecha_programada, maquinaria:maquinaria!maquinaria_id(codigo_interno, nombre)').in('estado', ['pendiente', 'en_proceso']).order('fecha_programada', { ascending: true }).limit(8),
        supabase.from('frentes_trabajo').select('id, codigo, nombre').eq('activo', true).limit(10),
        supabase.from('facturas').select('total, estado').eq('activo', true),
        supabase.from('plan_cuentas').select('id', { count: 'exact', head: true }).eq('activa', true),
        supabase.from('nominas').select('id').eq('pagado', false).eq('activo', true),
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
          id: `nt-${t.id}`, fecha: t.created_at, tipo: 'create',
          mensaje: 'Nuevo empleado registrado', entidad: 'Empleado',
          nombre: `${t.nombre || ''} ${t.primer_apellido || ''}`.trim(), icon: UserPlus,
        })
      })

      ;(nuevaMaqRes.data || []).forEach((m) => {
        timeline.push({
          id: `nm-${m.id}`, fecha: m.created_at, tipo: 'create',
          mensaje: `Nueva maquinaria: ${m.codigo_interno || ''}`, entidad: 'Maquinaria',
          nombre: m.nombre || '', icon: Truck,
        })
      })

      ;(nuevosVehRes.data || []).forEach((v) => {
        timeline.push({
          id: `nv-${v.id}`, fecha: v.created_at, tipo: 'create',
          mensaje: `Nuevo vehículo: ${v.placa || ''}`, entidad: 'Vehículo',
          nombre: v.nombre || '', icon: Car,
        })
      })

      ;(docsTrabRes.data || []).forEach((d) => {
        const nombreTrab = d.trabajador
          ? `${d.trabajador.nombre || ''} ${d.trabajador.primer_apellido || ''}`.trim()
          : 'Empleado'
        timeline.push({
          id: `dt-${d.id}`, fecha: d.created_at, tipo: 'file',
          mensaje: `Documento: ${d.tipos_documentos_trabajador?.nombre || 'Documento'}`, entidad: 'Empleado',
          nombre: nombreTrab, icon: FileUp,
        })
      })

      ;(docsVehRes.data || []).forEach((d) => {
        timeline.push({
          id: `dv-${d.id}`, fecha: d.created_at, tipo: 'file',
          mensaje: `Documento: ${d.tipo?.nombre || 'Documento'}`, entidad: 'Vehículo',
          nombre: d.vehiculo?.nombre || d.vehiculo?.placa || 'Vehículo', icon: FileUp,
        })
      })

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
            id: `rh-${r.id}`, fecha: r.created_at, tipo: 'edit',
            mensaje, entidad: 'Maquinaria', nombre: maqNombre, icon: icon || Settings,
          })
        }
      })

      timeline.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      const timelineLimit = timeline.slice(0, 15)

      // Calcular cumplimiento REAL por frente usando pipeline de auditoría
      const cumplimientoFrentes = []
      const frentes = (frentesRes.data || []).filter(f =>
        ['FT-SR', 'FT-SANTA-ROSA', 'SANTA ROSA'].includes(f.codigo?.toUpperCase()) ||
        f.nombre?.toLowerCase().includes('santa rosa')
      )
      if (frentes.length === 0) {
        // Fallback: mostrar todos los activos
        frentes.push(...(frentesRes.data || []))
      }

      // Procesar TODOS los frentes en PARALELO (Promise.all en lugar de for secuencial)
      const resultadosFrentes = await Promise.all(frentes.map(async (frente) => {
        try {
          const datosAuditoria = await getDatosAuditoria(frente.id)
          if (datosAuditoria) {
            const { empleados, maquinaria } = datosAuditoria
            empleados.forEach(emp => { emp._cumplimiento = calcularCumplimientoEmpleado(emp) })
            maquinaria.forEach(maq => { maq._cumplimiento = calcularCumplimientoMaquinaria(maq) })
            const global = calcularCumplimientoGlobal(empleados, maquinaria)
            return { ...frente, pct: global.porcentaje, categorias: global.categorias }
          }
        } catch (err) {
          console.error(`Error en auditoría para frente ${frente.codigo}:`, err)
        }
        return { ...frente, pct: 0, categorias: {} }
      }))

      cumplimientoFrentes.push(...resultadosFrentes)
      cumplimientoFrentes.sort((a, b) => a.pct - b.pct)
      // Solo mostrar frentes con datos reales o que sean Santa Rosa
      const frentesValidos = cumplimientoFrentes.filter(f =>
        f.pct > 0 ||
        ['FT-SR', 'FT-SANTA-ROSA'].includes(f.codigo?.toUpperCase()) ||
        f.nombre?.toLowerCase().includes('santa rosa')
      )

      // Financieros
      const facturasFin = facturasFinRes.data || []
      const carteraVencida = facturasFin
        .filter(f => f.estado === 'vencida')
        .reduce((sum, f) => sum + Number(f.total || 0), 0)
      const facturacionTotal = facturasFin
        .filter(f => f.estado !== 'anulada')
        .reduce((sum, f) => sum + Number(f.total || 0), 0)

      setDashboardData({
        stats: {
          trabajadores: trabCount || 0,
          maquinaria: maqRes.data?.length || 0,
          vehiculos: vehiculosCountRes.count || 0,
          ubicacion: (maqRes.data || []).filter(m => m.estado === 'operativa').length,
          facturacion: Math.round(facturacionTotal / 1000000),
          cuentas: planCuentasRes.count || 0,
          nominaPendientes: nominasFinRes.data?.length || 0,
          carteraVencida: Math.round(carteraVencida / 1000000),
        },
        maquinariaPorEstado,
        trabajadoresPorDepto,
        timeline: timelineLimit,
        proximasOrdenes: ordenesRes.data || [],
        cumplimientoFrentes: frentesValidos,
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Panel de control — Serviequipos Mantenimiento Ltda.</p>
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
        <Link href="/mantenimiento/ordenes">
          <StatsCard title="Órdenes Mtto." value={loading ? '...' : dashboardData.proximasOrdenes.length} icon={ClipboardList} color="purple" />
        </Link>
      </div>

      {/* Financial Stats Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <Link href="/facturacion">
    <StatsCard title="Facturación" value={loading ? '...' : `$${dashboardData.stats.facturacion || 0}`} icon={Receipt} color="orange" />
  </Link>
  <Link href="/contabilidad">
    <StatsCard title="Contabilidad" value={loading ? '...' : `${dashboardData.stats.cuentas || 0} cuentas`} icon={Calculator} color="green" />
  </Link>
  <Link href="/nomina">
    <StatsCard title="Nómina" value={loading ? '...' : `${dashboardData.stats.nominaPendientes || 0} pendientes`} icon={DollarSign} color="purple" />
  </Link>
  <Link href="/facturacion/cartera">
    <StatsCard title="Cartera Vencida" value={loading ? '...' : `$${dashboardData.stats.carteraVencida || 0}`} icon={Landmark} color="red" />
  </Link>
</div>

{/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut Chart - Maquinaria */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Maquinaria</h2>
          {loading ? (
            <div className="flex items-center justify-center h-64"><p className="text-gray-400">Cargando...</p></div>
          ) : dashboardData.maquinariaPorEstado.length === 0 ? (
            <div className="flex items-center justify-center h-64"><p className="text-gray-400">Sin datos</p></div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={220}>
                <PieChart>
                  <Pie
                    data={dashboardData.maquinariaPorEstado}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                  >
                    {dashboardData.maquinariaPorEstado.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
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
            <div className="flex items-center justify-center h-64"><p className="text-gray-400">Cargando...</p></div>
          ) : dashboardData.trabajadoresPorDepto.length === 0 ? (
            <div className="flex items-center justify-center h-64"><p className="text-gray-400">Sin datos</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dashboardData.trabajadoresPorDepto} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} formatter={(value) => [value, 'Empleados']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#1A1A1A" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cumplimiento por Frente */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Cumplimiento por Frente
            </h2>
            <Link href="/auditorias" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todo</Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64"><p className="text-gray-400">Cargando...</p></div>
          ) : dashboardData.cumplimientoFrentes.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ClipboardCheck className="mx-auto h-10 w-10 text-gray-300" />
                <p className="text-gray-400 mt-2 text-sm">Sin frentes registrados</p>
                <Link href="/auditorias" className="text-blue-600 text-xs mt-1 inline-block hover:text-blue-700">Ir a Auditorías</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboardData.cumplimientoFrentes.map((f) => {
                const cfg = getRangoCumplimiento(f.pct)
                return (
                  <Link key={f.id} href={`/auditorias?frente=${f.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
                    <MiniProgressRing pct={f.pct} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.codigo} — {f.nombre}</p>
                      <p className={`text-xs ${cfg.text}`}>
                        {cfg.label} — {f.pct}%
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actividad y Órdenes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Mantenimientos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Próximos Mantenimientos
            </h2>
            <Link href="/mantenimiento/ordenes" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Ver todas</Link>
          </div>
          {loading ? (
            <p className="text-gray-400 text-center py-8">Cargando...</p>
          ) : dashboardData.proximasOrdenes.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="mx-auto h-10 w-10 text-gray-300" />
              <p className="text-gray-400 mt-2 text-sm">Sin mantenimientos pendientes</p>
              <Link href="/mantenimiento/ordenes/nueva" className="text-blue-600 text-xs mt-1 inline-block hover:text-blue-700">Crear orden</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {dashboardData.proximasOrdenes.map((o) => {
                const fecha = new Date(o.fecha_programada)
                const hoy = new Date()
                hoy.setHours(0, 0, 0, 0)
                const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
                const bgColor = diffDias < 0 ? 'bg-red-50 border-red-200' : diffDias <= 3 ? 'bg-orange-50 border-orange-200' : diffDias <= 7 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                const txtColor = diffDias < 0 ? 'text-red-600' : diffDias <= 3 ? 'text-orange-600' : diffDias <= 7 ? 'text-yellow-600' : 'text-gray-600'

                return (
                  <Link
                    key={o.id}
                    href={`/mantenimiento/ordenes/${o.id}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${bgColor} hover:opacity-80 transition`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-500">{o.codigo}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          o.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {o.estado === 'pendiente' ? 'Pendiente' : 'En Proceso'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate mt-1">{o.titulo}</p>
                      {o.maquinaria && (
                        <p className="text-xs text-gray-500 mt-0.5">{o.maquinaria.codigo_interno} — {o.maquinaria.nombre}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-semibold ${txtColor}`}>
                        {fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </p>
                      <p className={`text-xs ${txtColor}`}>
                        {diffDias < 0 ? `Atrasada ${Math.abs(diffDias)}d` : diffDias === 0 ? 'Hoy' : `En ${diffDias}d`}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          {loading ? (
            <p className="text-gray-400 text-center py-8">Cargando...</p>
          ) : dashboardData.timeline.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Sin actividad reciente</p>
          ) : (
            <div className="relative">
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
                    <div key={item.id} className="relative flex gap-4 py-2.5">
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{item.nombre}</span>
                          <span className="text-gray-500"> — {item.mensaje}</span>
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
      </div>
    </div>
  )
}
