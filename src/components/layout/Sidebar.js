'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Package, 
  FileText,
  Building2,
  Truck,
  Bell
} from 'lucide-react'

const menuItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trabajadores', href: '/trabajadores', icon: Users },
  { name: 'Maquinaria', href: '/maquinaria', icon: Truck },
  { name: 'Alertas', href: '/alertas', icon: Bell, showBadge: true },
  { name: 'Clientes', href: '/clientes', icon: UserCircle },
  { name: 'Productos', href: '/productos', icon: Package },
  { name: 'Cotizaciones', href: '/cotizaciones', icon: FileText },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [alertasCount, setAlertasCount] = useState(0)

  useEffect(() => {
    async function fetchAlertas() {
      try {
        const { count, error } = await supabase
          .from('vw_alertas_documentos')
          .select('*', { count: 'exact', head: true })
          .in('estado_alerta', ['VENCIDO', 'CRITICO'])

        if (!error && count !== null) {
          setAlertasCount(count)
        }
      } catch (err) {
        console.error('Error cargando alertas:', err)
      }
    }

    fetchAlertas()
    const interval = setInterval(fetchAlertas, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Header del Sidebar */}
      <div className="flex items-center gap-2 p-4 pb-4 border-b border-slate-700 flex-shrink-0">
        <Building2 className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="font-bold text-lg">Mi Empresa</h1>
          <p className="text-xs text-slate-400">Plataforma Corporativa</p>
        </div>
      </div>

      {/* Navegación con scroll si hace falta */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
                          (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </div>
              
              {item.showBadge && alertasCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {alertasCount > 99 ? '99+' : alertasCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer del Sidebar */}
      <div className="p-4 text-xs text-slate-500 text-center border-t border-slate-700 flex-shrink-0">
        v1.0.0 - 2025
      </div>
    </aside>
  )
}
