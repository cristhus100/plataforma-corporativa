'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle, Gift, Briefcase, Truck, FileText } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [hoy] = useState(new Date())
  const [mes, setMes] = useState(hoy.getMonth())
  const [año, setAño] = useState(hoy.getFullYear())
  const [eventos, setEventos] = useState([])
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)

  useEffect(() => {
    cargarEventos()
  }, [])

  async function cargarEventos() {
    try {
      setLoading(true)
      const eventosTemp = []

      // Vencimientos de documentos de trabajadores
      const { data: docs } = await supabase
        .from('documentos_trabajadores')
        .select('*, trabajador:trabajadores!trabajador_id(nombre,primer_apellido), tipo:tipos_documentos_trabajador!tipo_documento_id(nombre)')

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

      // Cumpleaños de trabajadores
      const { data: trabajadores } = await supabase
        .from('trabajadores')
        .select('id, nombre, primer_apellido, fecha_nacimiento')

      ;(trabajadores || []).forEach((t) => {
        if (t.fecha_nacimiento) {
          const nac = new Date(t.fecha_nacimiento)
          eventosTemp.push({
            fecha: new Date(año, nac.getMonth(), nac.getDate()).toISOString(),
            tipo: 'cumpleanos',
            titulo: `Cumpleaños: ${t.nombre || ''} ${t.primer_apellido || ''}`.trim(),
            subtitulo: '',
            link: `/trabajadores/${t.id}`,
          })
        }
      })

      // Ingresos de trabajadores
      ;(trabajadores || []).forEach((t) => {
        if (t.fecha_ingreso) {
          const ing = new Date(t.fecha_ingreso)
          eventosTemp.push({
            fecha: new Date(año, ing.getMonth(), ing.getDate()).toISOString(),
            tipo: 'ingreso',
            titulo: `Ingreso: ${t.nombre || ''} ${t.primer_apellido || ''}`.trim(),
            subtitulo: '',
            link: `/trabajadores/${t.id}`,
          })
        }
      })

      // Adquisiciones de maquinaria
      const { data: maquinaria } = await supabase
        .from('maquinaria')
        .select('id, nombre, codigo_interno, fecha_adquisicion')

      ;(maquinaria || []).forEach((m) => {
        if (m.fecha_adquisicion) {
          const adq = new Date(m.fecha_adquisicion)
          eventosTemp.push({
            fecha: new Date(año, adq.getMonth(), adq.getDate()).toISOString(),
            tipo: 'adquisicion',
            titulo: `Adquisición: ${m.codigo_interno || ''} ${m.nombre || ''}`.trim(),
            subtitulo: '',
            link: `/maquinaria/${m.id}`,
          })
        }
      })

      setEventos(eventosTemp)
    } catch (err) {
      console.error('Error cargando eventos:', err)
    } finally {
      setLoading(false)
    }
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
            <p className="text-gray-400 text-sm">Cargando...</p>
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
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 {(TIPO_EVENTO[evt.tipo] || TIPO_EVENTO.documento).color}" />
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
