'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import dynamicImport from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Search, Truck, BatteryFull, BatteryLow, Navigation } from 'lucide-react'

// Leaflet solo se importa del lado del cliente
const MapContainer = dynamicImport(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamicImport(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamicImport(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup = dynamicImport(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

import 'leaflet/dist/leaflet.css'

// Centro de Colombia
const CENTRO_COLOMBIA = [4.5709, -74.2973]
const ZOOM_DEFAULT = 6

// Simulación de ubicaciones de equipos (hasta que tengamos GPS real)
const ubicacionesSimuladas = [
  { lat: 4.7110, lng: -74.0721, ciudad: 'Bogotá' },
  { lat: 6.2442, lng: -75.5812, ciudad: 'Medellín' },
  { lat: 3.4516, lng: -76.5320, ciudad: 'Cali' },
  { lat: 10.9685, lng: -74.7813, ciudad: 'Barranquilla' },
  { lat: 7.1193, lng: -73.1227, ciudad: 'Bucaramanga' },
  { lat: 4.8087, lng: -75.6906, ciudad: 'Pereira' },
  { lat: 4.4389, lng: -75.2323, ciudad: 'Ibagué' },
  { lat: 8.7479, lng: -75.8815, ciudad: 'Montería' },
  { lat: 11.0041, lng: -74.8070, ciudad: 'Puerto Colombia' },
  { lat: 3.8801, lng: -77.0312, ciudad: 'Buenaventura' },
]

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
  const supabase = createClient()
  const [maquinaria, setMaquinaria] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    // Corregir iconos de Leaflet (Next.js issue con los markers default)
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

    cargarMaquinaria()
  }, [])

  async function cargarMaquinaria() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('maquinaria')
        .select(`
          id, codigo_interno, nombre, estado, marca, modelo, placa,
          tipos_maquinaria ( id, nombre )
        `)
        .eq('activo', true)
        .order('codigo_interno', { ascending: true })

      if (error) throw error

      // Asignar ubicación simulada a cada equipo
      const conUbicacion = (data || []).map((m, i) => ({
        ...m,
        ubicacion: ubicacionesSimuladas[i % ubicacionesSimuladas.length],
        bateria: Math.floor(Math.random() * 40) + 60, // Simular batería 60-100%
        velocidad: Math.floor(Math.random() * 60), // Simular velocidad 0-60 km/h
      }))

      setMaquinaria(conUbicacion)
    } catch (err) {
      console.error('Error cargando maquinaria:', err)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-8 gap-0">
      {/* Panel lateral de equipos */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Equipos en Línea</h2>
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
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.ubicacion?.ciudad}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
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
                            {m.velocidad} km/h
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

        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />
            {maquinaria.filter((m) => m.estado === 'operativa').length} equipos activos
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {maquinaria.length - maquinaria.filter((m) => m.estado === 'operativa').length} en mantenimiento
          </p>
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {mapReady && (
          <MapContainer
            center={CENTRO_COLOMBIA}
            zoom={ZOOM_DEFAULT}
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
                    <div className="text-sm">
                      <p className="font-semibold">{m.codigo_interno}</p>
                      <p className="text-gray-600">{m.nombre}</p>
                      <p className="text-gray-500">{m.marca} {m.modelo}</p>
                      <p className="text-gray-500">{m.ubicacion?.ciudad}</p>
                      <p className={`font-medium mt-1 ${
                        m.estado === 'operativa' ? 'text-green-600' : 'text-yellow-600'
                      }`}>{status.text}</p>
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
      </div>
    </div>
  )
}
