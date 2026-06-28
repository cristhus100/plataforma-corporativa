'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dynamicImport from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { Search, Truck, BatteryFull, BatteryLow, Navigation, MapPin, RefreshCw, Clock, Radio, Wifi, WifiOff, X } from 'lucide-react'

// Leaflet solo se importa del lado del cliente
const MapContainer = dynamicImport(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamicImport(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamicImport(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup = dynamicImport(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

import 'leaflet/dist/leaflet.css'

// Centro: Planta Cemex, Vereda Santa Rosa, La Calera, Cundinamarca
const CENTRO_LA_CALERA = [4.7167, -73.9667]
const UBICACION_SANTA_ROSA = { lat: 4.7167, lng: -73.9667, ciudad: 'Santa Rosa, La Calera' }

function getStatusIcon(estado) {
  switch (estado) {
    case 'operativa': return { color: 'bg-green-500', text: 'Encendida' }
    case 'en_mantenimiento': return { color: 'bg-yellow-500', text: 'Mantenimiento' }
    case 'en_reparacion': return { color: 'bg-orange-500', text: 'Reparación' }
    case 'fuera_servicio': return { color: 'bg-red-500', text: 'Fuera de Servicio' }
    case 'dada_de_baja': return { color: 'bg-gray-500', text: 'Dada de Baja' }
    default: return { color: 'bg-gray-400', text: 'Desconocido' }
  }
}

export default function UbicacionPage() {
  const { addToast } = useToast()
  const supabase = createClient()
  const [maquinaria, setMaquinaria] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [gpsActivo, setGpsActivo] = useState(false)
  const [gpsError, setGpsError] = useState(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [modoGPS, setModoGPS] = useState('database') // 'database' | 'browser'
  const watchIdRef = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    async function fixLeafletIcons() {
      const L = await import('leaflet')
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setMapReady(true)
    }
    fixLeafletIcons()
    cargarPosiciones()
    // Refrescar posiciones cada 30 segundos
    intervalRef.current = setInterval(cargarPosiciones, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  async function cargarPosiciones() {
    try {
      setLoading(true)
      // Obtener maquinaria activa
      const { data: maquinas, error: errMaq } = await supabase
        .from('maquinaria')
        .select(`
          id, codigo_interno, nombre, estado, marca, modelo, placa,
          tipos_maquinaria ( id, nombre )
        `)
        .eq('activo', true)
        .order('codigo_interno', { ascending: true })

      if (errMaq) throw errMaq

      // Intentar obtener posiciones reales desde la base de datos
      const { data: posiciones, error: errPos } = await supabase
        .from('vw_ultimas_posiciones')
        .select('*')

      const posMap = {}
      if (!errPos && posiciones) {
        posiciones.forEach(p => { posMap[p.maquinaria_id] = p })
      }

      // Combinar maquinaria con posiciones
      const conUbicacion = (maquinas || []).map((m) => {
        const pos = posMap[m.id]
        if (pos) {
          return {
            ...m,
            ubicacion: { lat: pos.latitud, lng: pos.longitud, ciudad: pos.maquina_nombre },
            bateria: pos.bateria ?? 100,
            velocidad: pos.velocidad ?? 0,
            precision: pos.precision ?? null,
            timestamp: pos.timestamp,
            fuente: pos.fuente || 'database',
          }
        }
        // Fallback: asignar ubicación por defecto (Santa Rosa)
        return {
          ...m,
          ubicacion: { ...UBICACION_SANTA_ROSA },
          bateria: 100,
          velocidad: 0,
          precision: null,
          timestamp: null,
          fuente: null,
        }
      })

      setMaquinaria(conUbicacion)
      setUltimaActualizacion(new Date())
    } catch (err) {
      console.error('Error cargando posiciones:', err)
      addToast('Error al cargar posiciones', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Activar GPS del navegador para registrar posición actual
  const activarGPSLocal = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización')
      return
    }

    setGpsError(null)
    setModoGPS('browser')

    // Obtener posición única
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsActivo(true)
        setGpsError(null)
        // Registrar la posición actual del operador en la base de datos
        // (opcional — la maquinaria registrará su propia posición via IoT)
      },
      (err) => {
        setGpsError(`Error GPS: ${err.message}`)
        setGpsActivo(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  const desactivarGPS = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setGpsActivo(false)
  }, [])

  const maquinariaFiltrada = useMemo(() => {
    if (!search.trim()) return maquinaria
    const term = search.toLowerCase()
    return maquinaria.filter(
      (m) =>
        m.codigo_interno?.toLowerCase().includes(term) ||
        m.nombre?.toLowerCase().includes(term) ||
        m.marca?.toLowerCase().includes(term) ||
        m.placa?.toLowerCase().includes(term)
    )
  }, [maquinaria, search])

  const equiposConGPS = useMemo(
    () => maquinaria.filter(m => m.fuente !== null && m.timestamp !== null).length,
    [maquinaria]
  )

  const [panelAbierto, setPanelAbierto] = useState(true)

  return (
    <div className="relative flex h-[calc(100vh-8rem)] -m-4 sm:-m-6 lg:-m-8 gap-0">
      {/* Botón toggle para mobile */}
      <button
        onClick={() => setPanelAbierto(!panelAbierto)}
        className="absolute top-2 left-2 z-20 lg:hidden bg-white border border-gray-300 rounded-lg p-2 shadow-md hover:bg-gray-50 transition"
        title={panelAbierto ? 'Cerrar panel' : 'Abrir panel'}
      >
        {panelAbierto ? <X size={16} /> : <Truck size={16} />}
      </button>

      {/* Panel lateral de equipos */}
      <div className={`
        absolute lg:relative z-10
        w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${panelAbierto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-full
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Equipos en Línea</h2>
            <button
              onClick={cargarPosiciones}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              title="Actualizar posiciones"
            >
              <RefreshCw size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Indicador de modo GPS */}
          {gpsActivo && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-green-50 rounded-lg text-xs text-green-700">
              <Radio size={12} className="animate-pulse" />
              GPS activo — posiciones en tiempo real
            </div>
          )}
          {gpsError && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-red-50 rounded-lg text-xs text-red-600">
              <WifiOff size={12} />
              {gpsError}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">Cargando equipos...</div>
          ) : maquinariaFiltrada.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">No se encontraron equipos</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {maquinariaFiltrada.map((m) => {
                const status = getStatusIcon(m.estado)
                const isSelected = selectedId === m.id
                const tieneGPS = m.fuente !== null && m.timestamp !== null
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                      isSelected ? 'bg-gray-50 border-l-2 border-l-gray-900' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {m.codigo_interno} — {m.nombre}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {m.marca} {m.modelo} {m.placa ? `· ${m.placa}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} />
                          {m.ubicacion?.lat.toFixed(4)}, {m.ubicacion?.lng.toFixed(4)}
                        </p>
                        {tieneGPS && m.precision && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            ±{m.precision}m de precisión
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {tieneGPS && (
                          <span className="text-[10px] text-green-500 flex items-center gap-0.5">
                            <Wifi size={10} /> GPS
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.estado === 'operativa'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                          {status.text}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          {m.bateria > 80 ? <BatteryFull size={12} /> : <BatteryLow size={12} />}
                          {m.bateria}%
                        </span>
                        {m.velocidad > 0 && (
                          <span className="flex items-center gap-1 text-xs text-blue-500">
                            <Navigation size={12} />
                            {m.velocidad.toFixed(1)} km/h
                          </span>
                        )}
                        {m.timestamp && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Clock size={10} />
                            {new Date(m.timestamp).toLocaleTimeString('es-CO')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
              {maquinaria.filter((m) => m.estado === 'operativa').length} activos
            </p>
            <p className="text-xs text-gray-500">
              <Wifi size={10} className="inline mr-0.5" />
              {equiposConGPS} con GPS
            </p>
          </div>
          <p className="text-xs text-gray-400">
            {maquinaria.length - maquinaria.filter((m) => m.estado === 'operativa').length} en mantenimiento
          </p>
          {ultimaActualizacion && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              Actualizado: {ultimaActualizacion.toLocaleTimeString('es-CO')}
            </p>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {mapReady && (
          <MapContainer
            center={CENTRO_LA_CALERA}
            zoom={15}
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {maquinariaFiltrada.map((m) => {
              const status = getStatusIcon(m.estado)
              const isSelected = selectedId === m.id
              return (
                <Marker
                  key={m.id}
                  position={[m.ubicacion.lat, m.ubicacion.lng]}
                  eventHandlers={{
                    click: () => setSelectedId(m.id),
                  }}
                >
                  <Popup>
                    <div className="text-sm min-w-[150px]">
                      <p className="font-semibold">{m.codigo_interno}</p>
                      <p className="text-gray-600">{m.nombre}</p>
                      <p className="text-gray-500">{m.marca} {m.modelo} {m.placa && `· ${m.placa}`}</p>
                      <p className={`font-medium mt-1 ${
                        m.estado === 'operativa' ? 'text-green-600' : 'text-yellow-600'
                      }`}>{status.text}</p>
                      {m.fuente && (
                        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                          <Wifi size={10} /> GPS en tiempo real
                        </p>
                      )}
                      {m.timestamp && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(m.timestamp).toLocaleString('es-CO')}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.ubicacion.lat.toFixed(4)}, {m.ubicacion.lng.toFixed(4)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
        {!mapReady && (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500">Cargando mapa...</p>
          </div>
        )}

        {/* Botón flotante para activar GPS */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          {!gpsActivo ? (
            <button
              onClick={activarGPSLocal}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 transition text-sm font-medium text-gray-700"
            >
              <MapPin size={16} className="text-blue-500" />
              Activar GPS
            </button>
          ) : (
            <button
              onClick={desactivarGPS}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 border border-green-700 rounded-lg shadow-md hover:bg-green-700 transition text-sm font-medium text-white"
            >
              <Radio size={16} className="animate-pulse" />
              GPS Activo
            </button>
          )}
          <button
            onClick={cargarPosiciones}
            className="flex items-center justify-center p-2 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 transition"
            title="Refrescar"
          >
            <RefreshCw size={16} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}
