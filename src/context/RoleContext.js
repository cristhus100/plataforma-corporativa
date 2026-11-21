'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const RoleContext = createContext({
  user: null,
  perfil: null,
  rol: null,
  loading: true,
  isAdmin: false,
})

export function RoleProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    perfil: null,
    rol: null,
    loading: true,
    isAdmin: false,
  })

  // Crear el cliente de forma perezosa: solo en cliente, y solo en useEffect.
  // Nunca durante el render, para que la prerenderización estática (páginas como
  // /_not-found) no falle por falta de variables de entorno de Supabase.
  const supabaseRef = useRef(null)

  const fetchPerfil = useCallback(async (user) => {
    const supabase = supabaseRef.current
    if (!user || !supabase) {
      setState({ user: null, perfil: null, rol: null, loading: false, isAdmin: false })
      return
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Si no hay perfil todavía (trigger puede tardar), intentar de nuevo
    if (error && error.code === 'PGRST116') {
      setState({ user, perfil: null, rol: null, loading: false, isAdmin: false })
      return
    }

    setState({
      user,
      perfil: data,
      rol: data?.rol || null,
      loading: false,
      isAdmin: data?.rol === 'admin',
    })
  }, [])

  useEffect(() => {
    supabaseRef.current = createClient()

    // Verificar sesión inicial
    supabaseRef.current.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchPerfil(session.user)
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    })

    // Escuchar cambios de sesión (login, logout)
    const { data: { subscription } } = supabaseRef.current.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchPerfil(session.user)
      } else {
        setState({ user: null, perfil: null, rol: null, loading: false, isAdmin: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchPerfil])

  return (
    <RoleContext.Provider value={state}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}