'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Search, User, Menu, LogOut, Sun, Moon, AlertTriangle, XCircle, Clock, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import { useAlertas } from '@/hooks/useAlertas'

export default function Header({ onToggleSidebar }) {
  const router = useRouter()
  const supabase = createClient()
  const { perfil, user, isAdmin, loading: roleLoading } = useRole()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const notifRef = useRef(null)
  const { notificaciones: todasNotifs, conteoUrgente: alertCount } = useAlertas()
  const notificaciones = todasNotifs.slice(0, 10)

  useEffect(() => {
    // Cargar preferencia de tema
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') {
      setDarkMode(true)
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  // Cerrar notificaciones al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleTheme() {
    const newTheme = darkMode ? 'light' : 'dark'
    setDarkMode(!darkMode)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getAlertIcon = (estado) => {
    switch (estado) {
      case 'VENCIDO': return <XCircle size={14} className="text-red-500 flex-shrink-0" />
      case 'CRITICO': return <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
      case 'PROXIMO': return <Clock size={14} className="text-yellow-500 flex-shrink-0" />
      default: return <Bell size={14} className="text-gray-400 flex-shrink-0" />
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex-shrink-0 animate-fade-in no-print">
      <div className="flex items-center justify-between h-full px-6">

        {/* Buscador */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Acciones del usuario */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                  <Link
                    href="/alertas"
                    onClick={() => setShowNotif(false)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver todas
                  </Link>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notificaciones.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">
                      No hay alertas pendientes
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notificaciones.map((n, idx) => (
                        <Link
                          key={idx}
                          href="/alertas"
                          onClick={() => setShowNotif(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition"
                        >
                          {getAlertIcon(n.estado_alerta)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {n._origen === 'maquinaria' ? (n.nombre_equipo || 'Sin nombre') :
                               n._origen === 'vehiculos' ? (n.nombre_vehiculo || 'Sin nombre') :
                               n._origen === 'filtro_aire' ? (n.nombre || 'Sin nombre') :
                               (n.nombre_entidad || 'Sin nombre')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {n._origen === 'maquinaria'
                                ? `${n.tipo_alerta === 'aceite_motor' ? 'Aceite motor' : 'Filtros combustible'} · ${n.horas_desde_cambio ?? 0} hrs`
                                : n._origen === 'vehiculos'
                                ? `${n.nombre_alerta || 'Documento'} · ${n.dias_para_vencer < 0 ? `Vencido hace ${Math.abs(n.dias_para_vencer)} días` : `${n.dias_para_vencer} días`}`
                                : n._origen === 'filtro_aire'
                                ? `Filtro de aire · ${n.ultima_condicion_filtro_aire === 'critica' ? 'Crítico' : 'Regular'}`
                                : `${n.tipo_documento || 'Documento'} · ${n.estado_alerta === 'VENCIDO' ? `Vencido hace ${Math.abs(n.dias_para_vencer)} días` : `${n.dias_para_vencer} días`}`}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Usuario */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 pl-4 border-l border-gray-200 cursor-pointer"
            >
              <div className="w-9 h-9 bg-[#1A1A1A] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {roleLoading ? '...' : perfil?.nombre_mostrar || user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500">
                  {roleLoading ? '...' : isAdmin ? 'Administrador' : 'Usuario'}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {isAdmin && (
                    <Link
                      href="/configuracion"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Settings size={16} />
                      Configuración
                    </Link>
                  )}
                  {isAdmin && <div className="border-t border-gray-100 my-1" />}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
