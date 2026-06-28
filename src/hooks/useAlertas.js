'use client'

import { useContext } from 'react'
import { AlertContext } from '@/context/AlertContext'

/**
 * useAlertas — Hook de acceso a alertas centralizadas
 *
 * Retorna los mismos datos que el hook anterior para compatibilidad total:
 *   { documentos, maquinaria, vehiculos, filtroAire, loading,
 *     notificaciones, conteoUrgente, conteoTotal, refetch, descartar }
 *
 * NOTA: Debe usarse dentro de un <AlertProvider> (configurado en layout.js).
 */
export function useAlertas() {
  const ctx = useContext(AlertContext)
  if (!ctx) {
    throw new Error(
      'useAlertas debe usarse dentro de AlertProvider. ' +
        'Asegúrate de que <AlertProvider> esté en el layout raíz.'
    )
  }
  return ctx
}
