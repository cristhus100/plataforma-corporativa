'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

export function useAlertas() {
  const [alertas, setAlertas] = useState({
    documentos: [],
    maquinaria: [],
    vehiculos: [],
    filtroAire: [],
    loading: true,
  })
  const [error, setError] = useState(null)

  const fetchAlertas = useCallback(async () => {
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

      setAlertas({
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
      setAlertas((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  useEffect(() => {
    fetchAlertas()
    const interval = setInterval(fetchAlertas, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchAlertas])

  // Combinar todas las alertas para notificaciones y badges
  const notificaciones = useCallback(() => {
    const docs = (alertas.documentos || []).map((a) => ({
      ...a,
      _origen: 'documentos',
    }))
    const maq = (alertas.maquinaria || []).map((a) => ({
      ...a,
      _origen: 'maquinaria',
    }))
    const veh = (alertas.vehiculos || []).map((a) => ({
      ...a,
      _origen: 'vehiculos',
    }))
    const aire = (alertas.filtroAire || []).map((a) => ({
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
  }, [alertas])

  // Conteo de alertas urgentes para el badge
  const conteoUrgente = useCallback(() => {
    const n = notificaciones()
    return n.filter(
      (a) => a.estado_alerta === 'VENCIDO' || a.estado_alerta === 'CRITICO'
    ).length
  }, [notificaciones])

  // Conteo total para sidebar
  const conteoTotal = useCallback(() => {
    const docs = (alertas.documentos || []).filter(
      (a) => a.estado_alerta && a.estado_alerta !== 'VIGENTE'
    ).length
    const maq = (alertas.maquinaria || []).filter(
      (a) => a.estado_alerta && a.estado_alerta !== 'VIGENTE'
    ).length
    const veh = (alertas.vehiculos || []).filter(
      (a) => a.estado_alerta && a.estado_alerta !== 'VIGENTE'
    ).length
    const aire = alertas.filtroAire.length
    return docs + maq + veh + aire
  }, [alertas])

  return {
    ...alertas,
    notificaciones: notificaciones(),
    conteoUrgente: conteoUrgente(),
    conteoTotal: conteoTotal(),
    refetch: fetchAlertas,
  }
}
