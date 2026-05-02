export const dynamic = 'force-dynamic';
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  Search,
  Filter,
  Users,
  Truck
} from 'lucide-react'

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
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetchAlertas()
  }, [])

  async function fetchAlertas() {
    try {
      setLoading(true)
     const { data, error } = await supabase
  .from('vw_alertas_documentos')
  .select('*')  // 👈 Trae todo para ver qué columnas hay
  .order('fecha_vencimiento', { ascending: true })

if (error) throw error

console.log('Primera alerta:', data?.[0])  //
setAlertas(data || [])

    } catch (err) {
  console.error('Error cargando alertas:', err.message, err.details, err.hint, err.code)
} finally {
  setLoading(false)
}

  }

  // Conteos para cards de resumen
  const conteos = {
    VENCIDO: alertas.filter(a => a.estado_alerta === 'VENCIDO').length,
    CRITICO: alertas.filter(a => a.estado_alerta === 'CRITICO').length,
    PROXIMO: alertas.filter(a => a.estado_alerta === 'PROXIMO').length,
    VIGENTE: alertas.filter(a => a.estado_alerta === 'VIGENTE').length,
  }

  // Aplicar filtros
  const alertasFiltradas = alertas.filter(a => {
    if (filtroEstado !== 'TODOS' && a.estado_alerta !== filtroEstado) return false
    if (filtroTipo !== 'TODOS' && a.tipo_entidad !== filtroTipo) return false
    if (busqueda) {
      const texto = `${a.nombre_entidad || ''} ${a.tipo_documento || ''}`.toLowerCase()
      if (!texto.includes(busqueda.toLowerCase())) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alertas de Documentos</h1>
        <p className="text-gray-600 mt-1">
          Control de vencimientos de trabajadores y maquinaria
        </p>
      </div>

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
          {/* Buscador */}
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

          {/* Filtro Tipo */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="trabajador">Trabajadores</option>
              <option value="maquinaria">Maquinaria</option>
            </select>
          </div>

          {/* Filtro Estado */}
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
        </div>
      </div>

      {/* Tabla de alertas */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Cargando alertas...
          </div>
        ) : alertasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              No hay alertas que coincidan con los filtros
            </p>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer con conteo */}
        {!loading && alertasFiltradas.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando <span className="font-semibold">{alertasFiltradas.length}</span> de <span className="font-semibold">{alertas.length}</span> alertas
          </div>
        )}
      </div>
    </div>
  )
}
