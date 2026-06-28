'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// Umbrales por defecto (coinciden con los valores hardcodeados originales)
const UMBRALES_DEFAULT_ACEITE = { PROXIMO: 200, CRITICO: 250, VENCIDO: 300 }
const UMBRALES_DEFAULT_FILTRO = { PROXIMO: 80, CRITICO: 100, VENCIDO: 120 }

/**
 * Deriva los umbrales PROXIMO/CRITICO/VENCIDO a partir del intervalo total.
 * PROXIMO = 67% del intervalo, CRITICO = 83%, VENCIDO = 100%.
 * Ejemplo: intervalo 600h → { PROXIMO: 400, CRITICO: 500, VENCIDO: 600 }
 */
function derivarUmbrales(total) {
  return {
    PROXIMO: Math.round(total * 0.67),
    CRITICO: Math.round(total * 0.83),
    VENCIDO: total,
  }
}

/**
 * Hook que lee los umbrales de mantenimiento desde configuracion_alertas en DB.
 *
 * Retorna: { aceite, filtro, loading }
 * - aceite: { PROXIMO, CRITICO, VENCIDO } para aceite de motor
 * - filtro: { PROXIMO, CRITICO, VENCIDO } para filtros de combustible
 * - loading: true mientras se fetch la configuración
 *
 * Durante loading se usan los mismos defaults hardcodeados de siempre,
 * por lo que el primer render es idéntico al comportamiento anterior.
 */
export function useUmbrales() {
  const [umbrales, setUmbrales] = useState({
    aceite: UMBRALES_DEFAULT_ACEITE,
    filtro: UMBRALES_DEFAULT_FILTRO,
    loading: true,
  })

  useEffect(() => {
    let cancel = false

    const fetchUmbrales = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('configuracion_alertas')
          .select('intervalo_cambio_aceite, intervalo_cambio_filtros')
          .single()

        if (cancel) return

        if (data) {
          setUmbrales({
            aceite: derivarUmbrales(data.intervalo_cambio_aceite || 300),
            filtro: derivarUmbrales(data.intervalo_cambio_filtros || 120),
            loading: false,
          })
        } else {
          setUmbrales((prev) => ({ ...prev, loading: false }))
        }
      } catch {
        // Tabla no existe o sin datos — mantener defaults
        setUmbrales((prev) => ({ ...prev, loading: false }))
      }
    }

    fetchUmbrales()

    return () => { cancel = true }
  }, [])

  return umbrales
}
