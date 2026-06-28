'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export const AlertContext = createContext(null)

export function useAlertas() {
  const ctx = useContext(AlertContext)
  if (!ctx) {
    throw new Error('useAlertas debe usarse dentro de AlertProvider')
  }
  return ctx
}

export function AlertProvider({ children }) {
  const supabaseRef = useRef(null)
  const [data, setData] = useState({
    documentos: [],
    maquinaria: [],
    vehiculos: [],
    filtroAire: [],
    loading: true,
  })
  const [suprimidas, setSuprimidas] = useState([])
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  // Inicializar supabase solo en cliente
  useEffect(() => {
    supabaseRef.current = createClient()
  }, [])

  const fetchAlertas = useCallback(async () => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      const [resDocs, resMaq, resVeh, resAire] = await Promise.all([
        supabase.from('vw_alertas_documentos').select('*'),
        supabase.from('vw_alertas_maquinaria').select('*'),
        supabase.from('vw_alertas_vehiculos').select('*'),
        supabase
          .from('maquinaria')
          .select('id, nombre, codigo_interno, ultima_condicion_filtro_aire')
          .in('ultima_condicion_filtro_aire', ['regular', 'critica']),
      ])

      setData({
        documentos: resDocs.data || [],
        maquinaria: resMaq.data || [],
        vehiculos: resVeh.data || [],
        filtroAire: resAire.data || [],
        loading: false,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching alertas:', err)
      setError(err.message)
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  const fetchSuprimidas = useCallback(async () => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      const { data: ids } = await supabase
        .from('alertas_suprimidas')
        .select('entidad_id')
      setSuprimidas((ids || []).map((s) => String(s.entidad_id)))
    } catch (err) {
      console.error('Error fetching suprimidas:', err)
      setError(err.message)
    }
  }, [])

  const descartar = useCallback(async (entidadId) => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      await supabase.from('alertas_suprimidas').insert([{ entidad_id: entidadId }])
      setSuprimidas((prev) => [...prev, String(entidadId)])
    } catch (err) {
      console.error('Error descartando alerta:', err)
      setSuprimidas((prev) => prev.filter((id) => id !== String(entidadId)))
      setError(err.message)
    }
  }, [])

  // Fetch inicial
  useEffect(() => {
    if (!supabaseRef.current) return
    fetchAlertas()
    fetchSuprimidas()
  }, [fetchAlertas, fetchSuprimidas])

  // Polling único
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchAlertas()
    }, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchAlertas])

  // Valores computados memoizados
  const notificaciones = useMemo(() => {
    const docs = (data.documentos || []).map((a) => ({ ...a, _origen: 'documentos' }))
    const maq = (data.maquinaria || []).map((a) => ({ ...a, _origen: 'maquinaria' }))
    const veh = (data.vehiculos || []).map((a) => ({ ...a, _origen: 'vehiculos' }))
    const aire = (data.filtroAire || []).map((a) => ({
      ...a,
      _origen: 'filtro_aire',
      estado_alerta:
        a.ultima_condicion_filtro_aire === 'critica' ? 'CRITICO' : 'PROXIMO',
      nombre_entidad: a.nombre,
      tipo_documento: 'Filtro de aire',
    }))

    return [...docs, ...maq, ...veh, ...aire].sort((a, b) => {
      const orden = { VENCIDO: 1, CRITICO: 2, PROXIMO: 3 }
      return (orden[a.estado_alerta] || 99) - (orden[b.estado_alerta] || 99)
    })
  }, [data.documentos, data.maquinaria, data.vehiculos, data.filtroAire])

  const conteoUrgente = useMemo(() => {
    return notificaciones.filter(
      (a) => a.estado_alerta === 'VENCIDO' || a.estado_alerta === 'CRITICO'
    ).length
  }, [notificaciones])

  const conteoTotal = useMemo(() => {
    const docs = (data.documentos || []).filter(
      (a) => a.estado_alerta && a.estado_alerta !== 'VIGENTE'
    ).length
    const maq = (data.maquinaria || []).filter(
      (a) => a.estado_alerta && a.estado_alerta !== 'VIGENTE'
    ).length
    const veh = (data.vehiculos || []).filter(
      (a) => a.estado_alerta && a.estado_alerta !== 'VIGENTE'
    ).length
    const aire = data.filtroAire.length
    return docs + maq + veh + aire
  }, [data.documentos, data.maquinaria, data.vehiculos, data.filtroAire])

  const value = useMemo(
    () => ({
      ...data,
      error,
      suprimidas,
      notificaciones,
      conteoUrgente,
      conteoTotal,
      refetch: fetchAlertas,
      descartar,
    }),
    [data, error, suprimidas, notificaciones, conteoUrgente, conteoTotal, fetchAlertas, descartar]
  )

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>
}
