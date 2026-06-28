'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/context/ToastContext'
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Gift, Briefcase, Truck, FileText } from 'lucide-react'
import { CardGridSkeleton } from '@/components/ui/LoadingSkeleton'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const TIPO_EVENTO = {
  vencimiento: { label: 'Vencimiento', color: 'bg-red-500', icon: AlertTriangle },
  cumpleanos: { label: 'Cumpleaños', color: 'bg-pink-500', icon: Gift },
  ingreso: { label: 'Ingreso', color: 'bg-blue-500', icon: Briefcase },
  adquisicion: { label: 'Adquisición', color: 'bg-green-500', icon: Truck },
  documento: { label: 'Documento', color: 'bg-purple-500', icon: FileText },
}

export default function CalendarioPage() {
  const supabase = createClient()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [hoy] = useState(new Date())
  const [mes, setMes] = useState(hoy.getMonth())
  const [año, setAño] = useState(hoy.getFullYear())
  const [eventos, setEventos] = useState([])
  const [eventosAnuales, setEventosAnuales] = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [cargandoEventos, setCargandoEventos] = useState(false)

  // Cargar eventos — se recarga solo cuando cambia el año para
  // traer documentos con vencimiento en el rango visible
  useEffect(() => {
    cargarDocumentos(año)
  }, [año])

  async function cargarDocumentos(añoVisible) {
    try {
      setCargandoEventos(true)
      const year = añoVisible || año

      // Vencimientos de documentos del año visible — sin límite arbitrario
      const inicioAño = `${year}-01-01`
      const finAño = `${year + 1}-01-01`
      const { data: docs } = await supabase
        .from('documentos_trabajadores')
        .select('*, trabajador:trabajadores!trabajador_id(nombre,primer_apellido), tipo:tipos_documentos_trabajador!tipo_documento_id(nombre)')
        .gte('fecha_vencimiento', inicioAño)
        .lt('fecha_vencimiento', finAño)

      const eventosTemp = []
      ;(docs || []).forEach((d) => {
        if (d.fecha_vencimiento) {
          eventosTemp.push({
            fecha: d.fecha_vencimiento,
            tipo: 'vencimiento',
            titulo: `Vence: ${d.tipo?.nombre || 'Documento'}`,
            subtitulo: d.trabajador ? `${d.trabajador.nombre || ''} ${d.trabajador.primer_apellido || ''}`.trim() : '',
            link: `/trabajadores/${d.trabajador_id}`,
          })
        }
      })

      // Datos fuente para eventos anuales — todos los registros activos,
      // necesarios para proyectar cumpleaños/aniversarios a cualquier año
      const [trabRes, maqRes] = await Promise.all([
        supabase.from('trabajadores')
          .select('id, nombre, primer_apellido, fecha_nacimiento, fecha_ingreso'),
        supabase.from('maquinaria')
          .select('id, nombre, codigo_interno, fecha_adquisicion')
          .eq('activo', true),
      ])

      const trabajadores = trabRes.data || []
      const maquinaria = maqRes.data || []

      // Guardar datos fuente de eventos anuales
      const anualesBase = {
        cumpleanos: trabajadores.filter(t => t.fecha_nacimiento).map(t => ({
          id: t.id, nombre: t.nombre, apellido: t.primer_apellido,
          mes: new Date(t.fecha_nacimiento).getMonth(),
          dia: new Date(t.fecha_nacimiento).getDate(),
        })),
        ingresos: trabajadores.filter(t => t.fecha_ingreso).map(t => ({
          id: t.id, nombre: t.nombre, apellido: t.primer_apellido,
          mes: new Date(t.fecha_ingreso).getMonth(),
          dia: new Date(t.fecha_ingreso).getDate(),
        })),
        adquisiciones: maquinaria.filter(m => m.fecha_adquisicion).map(m => ({
          id: m.id, codigo: m.codigo_interno, nombre: m.nombre,
          mes: new Date(m.fecha_adquisicion).getMonth(),
          dia: new Date(m.fecha_adquisicion).getDate(),
        })),
      }

      setEventosAnuales(anualesBase)

      // Proyectar eventos anuales al año visible
      const anualesProyectados = proyectarAnuales(anualesBase, year)
      setEventos([...eventosTemp, ...anualesProyectados])
    } catch (err) {
      console.error('Error cargando eventos:', err)
      addToast('Error al cargar eventos del calendario', { type: 'error' })
    } finally {
      setCargandoEventos(false)
      setLoading(false)
    }
  }

  function proyectarAnuales(base, year) {
    const result = []

    base.cumpleanos.forEach((t) => {
      result.push({
        fecha: new Date(year, t.mes, t.dia).toISOString(),
        tipo: 'cumpleanos',
        titulo: `Cumpleaños: ${t.nombre || ''} ${t.apellido || ''}`.trim(),
        subtitulo: '',
        link: `/trabajadores/${t.id}`,
      })
    })

    base.ingresos.forEach((t) => {
      result.push({
        fecha: new Date(year, t.mes, t.dia).toISOString(),
        tipo: 'ingreso',
        titulo: `Ingreso: ${t.nombre || ''} ${t.apellido || ''}`.trim(),
        subtitulo: '',
        link: `/trabajadores/${t.id}`,
      })
    })

    base.adquisiciones.forEach((m) => {
      result.push({
        fecha: new Date(year, m.mes, m.dia).toISOString(),
        tipo: 'adquisicion',
        titulo: `Adquisición: ${m.codigo || ''} ${m.nombre || ''}`.trim(),
        subtitulo: '',
        link: `/maquinaria/${m.id}`,
      })
    })

    return result
  }

  function proyectarEventosAnuales(year) {
    setEventos(prev => {
      const fijos = prev.filter(e => e.tipo === 'vencimiento' || e.tipo === 'documento')
      const anuales = proyectarAnuales(eventosAnuales, year)
      return [...fijos, ...anuales]
    })
  }

  const eventosPorDia = useMemo(() => {
    const map = {}
    eventos.forEach((e) => {
      const d = new Date(e.fecha)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [eventos])

  const eventosDelMes = useMemo(() => {
    return eventos.filter((e) => {
      const d = new Date(e.fecha)
      return d.getMonth() === mes && d.getFullYear() === año
    })
  }, [eventos, mes, año])

  // Construir grid del calendario
  const diasCalendario = useMemo(() => {
    const primerDia = new Date(año, mes, 1).getDay()
    const ultimoDia = new Date(año, mes + 1, 0).getDate()
    const dias = []

    for (let i = 0; i < primerDia; i++) {
      dias.push(null)
    }
    for (let d = 1; d <= ultimoDia; d++) {
      dias.push(d)
    }
    while (dias.length % 7 !== 0) {
      dias.push(null)
    }
    return dias
  }, [mes, año])

  function navegar(delta) {
    let nuevoMes = mes + delta
    let nuevoAño = año
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAño-- }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAño++ }
    setMes(nuevoMes)
    setAño(nuevoAño)
    setDiaSeleccionado(null)
  }

  function getEventosDelDia(dia) {
    if (!dia) return []
    const key = `${año}-${mes}-${dia}`
    return eventosPorDia[key] || []
  }

  function formatFecha(dia) {
    return new Date(año, mes, dia).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  const esHoy = (dia) => {
    return dia === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear()
  }

  const eventosDelDiaSeleccionado = diaSeleccionado ? getEventosDelDia(diaSeleccionado) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
        <p className="text-sm text-gray-600">Vencimientos, cumpleaños y fechas importantes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          {/* Navegación */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navegar(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">{MESES[mes]} {año}</h2>
            <button onClick={() => navegar(1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-1">
            {diasCalendario.map((dia, idx) => {
              const eventosDia = dia ? getEventosDelDia(dia) : []
              const isSelected = dia === diaSeleccionado
              const isToday = esHoy(dia)

              return (
                <button
                  key={idx}
                  disabled={!dia}
                  onClick={() => setDiaSeleccionado(dia)}
                  className={`relative min-h-[70px] p-1.5 rounded-lg text-sm transition ${
                    !dia ? 'cursor-default' :
                    isSelected ? 'bg-gray-900 text-white ring-2 ring-gray-900' :
                    isToday ? 'bg-yellow-50 border border-yellow-200' :
                    'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  {dia && (
                    <>
                      <span className={`text-xs font-medium ${isSelected ? 'text-white' : isToday ? 'text-yellow-700' : 'text-gray-700'}`}>
                        {dia}
                      </span>
                      {eventosDia.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {eventosDia.slice(0, 3).map((e, i) => {
                            const config = TIPO_EVENTO[e.tipo] || TIPO_EVENTO.documento
                            return <span key={i} className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
                          })}
                          {eventosDia.length > 3 && (
                            <span className={`text-[9px] font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                              +{eventosDia.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-100">
            {Object.entries(TIPO_EVENTO).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                {config.label}
              </div>
            ))}
          </div>
        </div>

        {/* Panel lateral de eventos */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {diaSeleccionado ? formatFecha(diaSeleccionado) : 'Selecciona un día'}
          </h3>

          {loading ? (
            <CardGridSkeleton count={1} />
          ) : eventosDelDiaSeleccionado.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">
                {diaSeleccionado ? 'Sin eventos este día' : 'Haz clic en un día para ver eventos'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventosDelDiaSeleccionado.map((evt, idx) => {
                const config = TIPO_EVENTO[evt.tipo] || TIPO_EVENTO.documento
                const Icon = config.icon
                return (
                  <Link
                    key={idx}
                    href={evt.link || '#'}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
                  >
                    <div className={`p-1.5 rounded-lg ${config.color.replace('bg-', 'bg-').replace('500', '100')}`}>
                      <Icon size={14} className={config.color.replace('bg-', 'text-').replace('500', '600')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition">
                        {evt.titulo}
                      </p>
                      {evt.subtitulo && (
                        <p className="text-xs text-gray-500 mt-0.5">{evt.subtitulo}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Eventos del mes */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Eventos de {MESES[mes]}
            </h3>
            {eventosDelMes.length === 0 ? (
              <p className="text-sm text-gray-400">Sin eventos este mes</p>
            ) : (
              <div className="space-y-1.5">
                {eventosDelMes
                  .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                  .slice(0, 10)
                  .map((evt, idx) => {
                    const d = new Date(evt.fecha)
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-gray-400 w-8 flex-shrink-0">{d.getDate()}</span>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${(TIPO_EVENTO[evt.tipo] || TIPO_EVENTO.documento).color}`} />
                        <span className="text-gray-600 truncate">{evt.titulo}</span>
                      </div>
                    )
                  })}
                {eventosDelMes.length > 10 && (
                  <p className="text-xs text-gray-400">...y {eventosDelMes.length - 10} más</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
