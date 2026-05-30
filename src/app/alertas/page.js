'use client'

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Users,
  Truck,
  Fuel,
  Wrench,
  Car,
  Wind,
} from 'lucide-react'
import {
  getEstadoAceiteConfig,
} from '@/lib/utils/aceite'
import { formatearFecha } from '@/lib/utils/maquinaria'

const ESTADOS = {
  VENCIDO: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-600'
  },
  CRITICO: {
    label: 'Crítico',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertCircle,
    iconColor: 'text-orange-600'
  },
  PROXIMO: {
    label: 'Próximo',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  VIGENTE: {
    label: 'Vigente',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-600'
  }
}

export default function AlertasPage() {
  const [modo, setModo] = useState('documentos') // 'documentos' | 'maquinaria' | 'vehiculos'

  // Estado para documentos
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')

  // Estado para maquinaria
  const [alertasAceite, setAlertasAceite] = useState([])
  const [loadingAceite, setLoadingAceite] = useState(false)
  const [filtroEstadoAceite, setFiltroEstadoAceite] = useState('TODOS')
  const [busquedaAceite, setBusquedaAceite] = useState('')

  // Estado para vehiculos
  const [alertasVehiculos, setAlertasVehiculos] = useState([])
  const [loadingVehiculos, setLoadingVehiculos] = useState(false)
  const [filtroEstadoVehiculos, setFiltroEstadoVehiculos] = useState('TODOS')
  const [busquedaVehiculos, setBusquedaVehiculos] = useState('')

  // Estado para filtro de aire
  const [alertasFiltroAire, setAlertasFiltroAire] = useState([])
  const [loadingFiltroAire, setLoadingFiltroAire] = useState(false)
  const [busquedaFiltroAire, setBusquedaFiltroAire] = useState('')

  // Alertas descartadas localmente
  const [descartadas, setDescartadas] = useState([])
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false)

  useEffect(() => {
    fetchAlertas()
    cargarDescartadas()
  }, [])

  async function cargarDescartadas() {
    try {
      const { data } = await supabase.from('alertas_suprimidas').select('id')
      if (data) setDescartadas(data.map(d => d.id))
    } catch (e) { /* ignore */ }
  }

  async function descartarAlerta(id) {
    if (!id) return
    try {
      const { data } = await supabase.from('alertas_suprimidas').insert([{ entidad_id: id }]).select('id')
      if (data && data[0]) {
        setDescartadas(prev => [...prev, data[0].id])
      } else {
        setDescartadas(prev => [...prev, `tmp_${id}`])
      }
    } catch (e) {
      setDescartadas(prev => [...prev, `tmp_${id}`])
      console.error('Error al descartar alerta:', e)
    }
  }

  function estaDescartada(item) {
    if (mostrarDescartadas) return false
    const id = item.id || item.entidad_id || item.maquinaria_id
    if (!id && id !== 0) return false
    return descartadas.includes(id) || descartadas.includes(`tmp_${id}`)
  }

  useEffect(() => {
    if (modo === 'maquinaria') {
      fetchAlertasAceite()
      fetchAlertasFiltroAire()
    } else if (modo === 'vehiculos') {
      fetchAlertasVehiculos()
    } else if (modo === 'filtro_aire') {
      fetchAlertasFiltroAire()
    }
  }, [modo])

  async function fetchAlertas() {
    try {
      setLoading(true)
     const { data, error } = await supabase
  .from('vw_alertas_documentos')
  .select('*')
  .order('fecha_vencimiento', { ascending: true })

  if (error) throw error

  setAlertas(data || [])

    } catch (err) {
  console.error('Error cargando alertas:', err.message, err.details, err.hint, err.code)
  } finally {
  setLoading(false)
  }
  }

  async function fetchAlertasAceite() {
    try {
      setLoadingAceite(true)
      const { data, error } = await supabase
        .from('vw_alertas_maquinaria')
        .select('*')
        .order('horas_desde_cambio', { ascending: false })

      if (error) throw error
      setAlertasAceite(data || [])
    } catch (err) {
      console.error('Error cargando alertas de aceite:', err)
    } finally {
      setLoadingAceite(false)
    }
  }

  // Conteos
  const conteos = {
    VENCIDO: alertas.filter(a => a.estado_alerta === 'VENCIDO').length,
    CRITICO: alertas.filter(a => a.estado_alerta === 'CRITICO').length,
    PROXIMO: alertas.filter(a => a.estado_alerta === 'PROXIMO').length,
    VIGENTE: alertas.filter(a => a.estado_alerta === 'VIGENTE').length,
  }

  const conteosVehiculos = {
    VENCIDO: alertasVehiculos.filter(a => a.estado_alerta === 'VENCIDO').length,
    CRITICO: alertasVehiculos.filter(a => a.estado_alerta === 'CRITICO').length,
    PROXIMO: alertasVehiculos.filter(a => a.estado_alerta === 'PROXIMO').length,
    VIGENTE: alertasVehiculos.filter(a => a.estado_alerta === 'VIGENTE').length,
  }

  const conteosAceite = {
    VENCIDO: alertasAceite.filter(a => a.estado_alerta === 'VENCIDO').length,
    CRITICO: alertasAceite.filter(a => a.estado_alerta === 'CRITICO').length,
    PROXIMO: alertasAceite.filter(a => a.estado_alerta === 'PROXIMO').length,
    VIGENTE: alertasAceite.filter(a => a.estado_alerta === 'VIGENTE').length,
    SIN_DATO: alertasAceite.filter(a => a.estado_alerta === 'SIN_DATO').length,
  }

  // Filtros documentos
  const alertasFiltradas = alertas.filter(a => {
    if (estaDescartada(a)) return false
    if (filtroEstado !== 'TODOS' && a.estado_alerta !== filtroEstado) return false
    if (filtroTipo !== 'TODOS' && a.tipo_entidad !== filtroTipo) return false
    if (busqueda) {
      const texto = `${a.nombre_entidad || ''} ${a.tipo_documento || ''}`.toLowerCase()
      if (!texto.includes(busqueda.toLowerCase())) return false
    }
    return true
  })

  async function fetchAlertasVehiculos() {
    try {
      setLoadingVehiculos(true)
      const { data, error } = await supabase
        .from('vw_alertas_vehiculos')
        .select('*')
        .order('estado_alerta', { ascending: true })
      if (error) throw error
      setAlertasVehiculos(data || [])
    } catch (err) {
      console.error('Error cargando alertas de vehículos:', err)
    } finally {
      setLoadingVehiculos(false)
    }
  }

  async function fetchAlertasFiltroAire() {
    try {
      setLoadingFiltroAire(true)
      const { data, error } = await supabase
        .from('maquinaria')
        .select('id, nombre, codigo_interno, ultima_condicion_filtro_aire, horometro_actual, ultimo_cambio_filtro_aire_horometro, ultimo_cambio_filtro_aire_fecha')
        .in('ultima_condicion_filtro_aire', ['regular', 'critica'])
        .order('ultima_condicion_filtro_aire', { ascending: true })
      if (error) throw error
      setAlertasFiltroAire(data || [])
    } catch (err) {
      console.error('Error cargando alertas de filtro de aire:', err)
    } finally {
      setLoadingFiltroAire(false)
    }
  }

  // Filtros filtro de aire
  const alertasFiltroAireFiltradas = alertasFiltroAire.filter(a => {
    if (busquedaFiltroAire) {
      const texto = `${a.nombre || ''} ${a.codigo_interno || ''}`.toLowerCase()
      if (!texto.includes(busquedaFiltroAire.toLowerCase())) return false
    }
    return true
  })

  // Filtros vehiculos
  const alertasVehiculosFiltradas = alertasVehiculos.filter(a => {
    if (estaDescartada(a)) return false
    if (filtroEstadoVehiculos !== 'TODOS' && a.estado_alerta !== filtroEstadoVehiculos) return false
    if (busquedaVehiculos) {
      const texto = `${a.nombre_vehiculo || ''} ${a.placa || ''}`.toLowerCase()
      if (!texto.includes(busquedaVehiculos.toLowerCase())) return false
    }
    return true
  })

  // Filtros aceite
  const alertasAceiteFiltradas = alertasAceite.filter(a => {
    if (estaDescartada(a)) return false
    if (filtroEstadoAceite !== 'TODOS') {
      if (filtroEstadoAceite === 'SIN_DATO' && a.estado_alerta !== 'SIN_DATO') return false
      if (filtroEstadoAceite !== 'SIN_DATO' && a.estado_alerta !== filtroEstadoAceite) return false
    }
    if (busquedaAceite) {
      const texto = `${a.nombre_equipo || ''} ${a.codigo_interno || ''}`.toLowerCase()
      if (!texto.includes(busquedaAceite.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Encabezado con toggle */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alertas</h1>
        <p className="text-gray-600 mt-1">
          Control de vencimientos y mantenimiento de equipos
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setModo('documentos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === 'documentos'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Documentos
          </button>
          <button
            onClick={() => setModo('maquinaria')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === 'maquinaria'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Wrench className="w-4 h-4 inline mr-1.5" />
            Maquinaria
          </button>
          <button
            onClick={() => setModo('vehiculos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              modo === 'vehiculos'
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Car className="w-4 h-4 inline mr-1.5" />
            Vehículos
          </button>
        </div>
      </div>

      {/* Vista de Documentos */}
      {modo === 'documentos' && (
        <>
          {/* Cards de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ESTADOS).map(([key, config]) => {
              const Icon = config.icon
              const isActive = filtroEstado === key
              return (
                <button
                  key={key}
                  onClick={() => setFiltroEstado(isActive ? 'TODOS' : key)}
                  className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                    isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-6 h-6 ${config.iconColor}`} />
                    <span className="text-3xl font-bold text-gray-900">
                      {conteos[key]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{config.label}</p>
                </button>
              )
            })}
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o documento..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value="trabajador">Empleados</option>
                  <option value="maquinaria">Maquinaria</option>
                </select>
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="VENCIDO">Vencidos</option>
                <option value="CRITICO">Críticos</option>
                <option value="PROXIMO">Próximos</option>
                <option value="VIGENTE">Vigentes</option>
              </select>
              <button
                onClick={() => setMostrarDescartadas(!mostrarDescartadas)}
                className={`px-3 py-2 text-sm rounded-lg border transition ${
                  mostrarDescartadas ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
                title={mostrarDescartadas ? 'Ocultar alertas descartadas' : 'Mostrar alertas descartadas'}
              >
                {mostrarDescartadas ? '✕ Ocultar descartadas' : '🗙 Descartadas'}
              </button>
            </div>
          </div>

          {/* Tabla documentos */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Cargando alertas...</div>
            ) : alertasFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay alertas que coincidan con los filtros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Entidad</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vencimiento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Días</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alertasFiltradas.map((alerta, idx) => {
                      const estadoConfig = ESTADOS[alerta.estado_alerta] || ESTADOS.VIGENTE
                      const Icon = estadoConfig.icon
                      const TipoIcon = alerta.tipo_entidad === 'trabajador' ? Users : Truck

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${estadoConfig.color}`}>
                              <Icon className="w-3 h-3" />
                              {estadoConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-gray-700">
                              <TipoIcon className="w-4 h-4" />
                              <span className="text-sm capitalize">{alerta.tipo_entidad}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {alerta.nombre_entidad || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {alerta.tipo_documento || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {alerta.fecha_vencimiento
                              ? new Date(alerta.fecha_vencimiento).toLocaleDateString('es-CO')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`font-bold ${
                              alerta.dias_para_vencer < 0 ? 'text-red-600' :
                              alerta.dias_para_vencer <= 7 ? 'text-orange-600' :
                              alerta.dias_para_vencer <= 30 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {alerta.dias_para_vencer < 0
                                ? `${Math.abs(alerta.dias_para_vencer)} días vencido`
                                : `${alerta.dias_para_vencer} días`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => descartarAlerta(alerta.id)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Descartar alerta"
                            >
                              🗙
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && alertasFiltradas.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                Mostrando <span className="font-semibold">{alertasFiltradas.length}</span> de <span className="font-semibold">{alertas.length}</span> alertas
              </div>
            )}
          </div>
        </>
      )}

      {/* Vista de Cambio de Aceite */}
      {modo === 'maquinaria' && (
        <>
          {/* Cards de resumen para aceite */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setFiltroEstadoAceite(filtroEstadoAceite === 'VENCIDO' ? 'TODOS' : 'VENCIDO')}
              className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                filtroEstadoAceite === 'VENCIDO' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <span className="text-3xl font-bold text-gray-900">{conteosAceite.VENCIDO}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Vencidos</p>
            </button>
            <button
              onClick={() => setFiltroEstadoAceite(filtroEstadoAceite === 'CRITICO' ? 'TODOS' : 'CRITICO')}
              className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                filtroEstadoAceite === 'CRITICO' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <span className="text-3xl font-bold text-gray-900">{conteosAceite.CRITICO}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Críticos</p>
            </button>
            <button
              onClick={() => setFiltroEstadoAceite(filtroEstadoAceite === 'PROXIMO' ? 'TODOS' : 'PROXIMO')}
              className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                filtroEstadoAceite === 'PROXIMO' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-6 h-6 text-yellow-600" />
                <span className="text-3xl font-bold text-gray-900">{conteosAceite.PROXIMO}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Próximos</p>
            </button>
            <button
              onClick={() => setFiltroEstadoAceite(filtroEstadoAceite === 'VIGENTE' ? 'TODOS' : 'VIGENTE')}
              className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${
                filtroEstadoAceite === 'VIGENTE' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <span className="text-3xl font-bold text-gray-900">{conteosAceite.VIGENTE}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Vigentes</p>
            </button>
          </div>

          {/* Filtros aceite */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por equipo o código..."
                  value={busquedaAceite}
                  onChange={(e) => setBusquedaAceite(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filtroEstadoAceite}
                onChange={(e) => setFiltroEstadoAceite(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="VENCIDO">Vencidos</option>
                <option value="CRITICO">Críticos</option>
                <option value="PROXIMO">Próximos</option>
                <option value="VIGENTE">Vigentes</option>
              </select>
            </div>
          </div>

          {/* Tabla alertas de aceite */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loadingAceite ? (
              <div className="p-12 text-center text-gray-500">Cargando alertas de mantenimiento...</div>
            ) : alertasAceiteFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay alertas de cambio de aceite</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Equipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Horómetro</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Horas desde Cambio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Intervalo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Último Cambio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alertasAceiteFiltradas.map((alerta, idx) => {
                      const configAceite = getEstadoAceiteConfig(alerta.estado_alerta)
                      const Icon = alerta.estado_alerta === 'VENCIDO' ? AlertTriangle
                        : alerta.estado_alerta === 'CRITICO' ? AlertCircle
                        : alerta.estado_alerta === 'PROXIMO' ? Clock
                        : CheckCircle2

                      const tipoStyle = alerta.tipo_alerta === 'aceite_motor'
                        ? { color: '#DC2626' }
                        : { color: '#2563EB' }
                      const tipoBg = alerta.tipo_alerta === 'aceite_motor'
                        ? { backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }
                        : { backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }

                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${configAceite.badge}`}>
                              <Icon className="w-3 h-3" />
                              {configAceite.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{alerta.nombre_equipo || '-'}</p>
                                <p className="text-xs text-gray-500 font-mono">{alerta.codigo_interno || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={tipoBg}>
                              {alerta.tipo_alerta === 'aceite_motor' ? 'Aceite Motor' : 'Filtros Combustible'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                            {alerta.horometro_actual ?? '-'} hrs
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-bold font-mono ${
                              alerta.estado_alerta === 'VENCIDO' ? 'text-red-600' :
                              alerta.estado_alerta === 'CRITICO' ? 'text-orange-600' :
                              alerta.estado_alerta === 'PROXIMO' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {alerta.horas_desde_cambio ?? 0} hrs
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-gray-900">
                            {alerta.intervalo_horas || '—'} hrs
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {alerta.ultimo_cambio_fecha
                              ? formatearFecha(alerta.ultimo_cambio_fecha)
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => descartarAlerta(alerta.id)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Descartar alerta"
                            >
                              🗙
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loadingAceite && alertasAceiteFiltradas.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                Mostrando <span className="font-semibold">{alertasAceiteFiltradas.length}</span> de <span className="font-semibold">{alertasAceite.length}</span> equipos
              </div>
            )}
          </div>

          {/* Filtros de Aire */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <Wind className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">Filtros de Aire</h3>
            </div>
            {loadingFiltroAire ? (
              <div className="p-6 text-center text-gray-500 text-sm">Cargando...</div>
            ) : alertasFiltroAireFiltradas.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay alertas de filtro de aire</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Equipo</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Código</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Condición</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Último Cambio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alertasFiltroAireFiltradas.map((alerta, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                            alerta.ultima_condicion_filtro_aire === 'critica'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}>
                            {alerta.ultima_condicion_filtro_aire === 'critica'
                              ? <AlertCircle className="w-3 h-3 text-orange-600" />
                              : <Clock className="w-3 h-3 text-yellow-600" />}
                            {alerta.ultima_condicion_filtro_aire === 'critica' ? 'Crítico' : 'Regular'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Wind className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{alerta.nombre || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-700">{alerta.codigo_interno || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {alerta.ultima_condicion_filtro_aire === 'critica' ? 'Requiere cambio urgente' : 'Requiere atención'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {alerta.ultimo_cambio_filtro_aire_fecha
                            ? new Date(alerta.ultimo_cambio_filtro_aire_fecha).toLocaleDateString('es-CO')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingFiltroAire && alertasFiltroAireFiltradas.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                <span className="font-semibold">{alertasFiltroAireFiltradas.length}</span> equipo(s) con alerta
              </div>
            )}
          </div>
        </>
      )}

      {/* Vista de Vehículos */}
      {modo === 'vehiculos' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(ESTADOS).map(([key, config]) => {
              const Icon = config.icon
              const isActive = filtroEstadoVehiculos === key
              return (
                <button key={key} onClick={() => setFiltroEstadoVehiculos(isActive ? 'TODOS' : key)}
                  className={`bg-white rounded-lg border-2 p-4 text-left transition-all hover:shadow-md ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`w-6 h-6 ${config.iconColor}`} />
                    <span className="text-3xl font-bold text-gray-900">{conteosVehiculos[key]}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">{config.label}</p>
                </button>
              )
            })}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Buscar por vehículo o placa..." value={busquedaVehiculos}
                  onChange={(e) => setBusquedaVehiculos(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={filtroEstadoVehiculos} onChange={(e) => setFiltroEstadoVehiculos(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="TODOS">Todos los estados</option>
                <option value="VENCIDO">Vencidos</option>
                <option value="CRITICO">Críticos</option>
                <option value="PROXIMO">Próximos</option>
                <option value="VIGENTE">Vigentes</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loadingVehiculos ? (
              <div className="p-12 text-center text-gray-500">Cargando alertas de vehículos...</div>
            ) : alertasVehiculosFiltradas.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay alertas de vehículos</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vehículo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Alerta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Documento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vencimiento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Días</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {alertasVehiculosFiltradas.map((alerta, idx) => {
                      const estadoConfig = ESTADOS[alerta.estado_alerta] || ESTADOS.VIGENTE
                      const Icon = estadoConfig.icon
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${estadoConfig.color}`}>
                              <Icon className="w-3 h-3" />{estadoConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Car className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{alerta.nombre_vehiculo || '-'}</p>
                                <p className="text-xs text-gray-500 font-mono">{alerta.placa || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{alerta.nombre_alerta || '-'}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{alerta.numero_documento || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {alerta.fecha_vencimiento ? new Date(alerta.fecha_vencimiento).toLocaleDateString('es-CO') : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`font-bold ${alerta.dias_para_vencer < 0 ? 'text-red-600' : alerta.dias_para_vencer <= 7 ? 'text-orange-600' : alerta.dias_para_vencer <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                              {alerta.dias_para_vencer < 0 ? `${Math.abs(alerta.dias_para_vencer)} días vencido` : `${alerta.dias_para_vencer} días`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => descartarAlerta(alerta.id)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                              title="Descartar alerta"
                            >
                              🗙
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingVehiculos && alertasVehiculosFiltradas.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                Mostrando <span className="font-semibold">{alertasVehiculosFiltradas.length}</span> de <span className="font-semibold">{alertasVehiculos.length}</span> alertas
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}
