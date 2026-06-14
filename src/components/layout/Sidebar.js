'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAlertas } from '@/hooks/useAlertas';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Bell,
  MapPin,
  CalendarDays,
  Megaphone,
  Car,
  ClipboardCheck,
  ClipboardList,
  History,
  Clock,
  Receipt,
  Calculator,
  DollarSign,
} from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Empleados', href: '/trabajadores', icon: Users },
  { label: 'Turnos', href: '/turnos', icon: Clock },
  { label: 'Maquinaria', href: '/maquinaria', icon: Wrench },
  { label: 'Vehículos', href: '/vehiculos', icon: Car },
  { label: 'Órdenes Mtto.', href: '/mantenimiento/ordenes', icon: ClipboardList },
  { label: 'Auditorías', href: '/auditorias', icon: ClipboardCheck },
  { label: 'Facturación', href: '/facturacion', icon: Receipt },
  { label: 'Contabilidad', href: '/contabilidad', icon: Calculator },
  { label: 'Nómina', href: '/nomina', icon: DollarSign },
  { label: 'Ubicación', href: '/ubicacion', icon: MapPin },
  { label: 'Calendario', href: '/calendario', icon: CalendarDays },
  { label: 'Alertas', href: '/alertas', icon: Bell, showBadge: true },
  { label: 'Anuncios', href: '/anuncios', icon: Megaphone },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { conteoTotal: alertCount } = useAlertas();


  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50 border-r"
      style={{
        backgroundColor: '#1A1A1A',
        borderColor: '#2D2D2D',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        visibility: isOpen ? 'visible' : 'hidden',
      }}
    >
      {/* Logo y nombre */}
      <div
        className="px-6 py-6 border-b"
        style={{ borderColor: '#2D2D2D' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0 shadow-lg">
            <Image
              src="/logo-serviequipos.jpg"
              alt="Serviequipos"
              fill
              sizes="48px"
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-base leading-tight">
              Serviequipos
            </span>
            <span className="text-xs font-medium" style={{ color: '#FFC107' }}>
              Mantenimiento Ltda.
            </span>
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => { if (window.innerWidth < 1024) onClose?.() }}
                  className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: active ? '#FFC107' : 'transparent',
                    color: active ? '#1A1A1A' : '#D1D5DB',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#2D2D2D';
                      e.currentTarget.style.color = '#FFFFFF';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#D1D5DB';
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.showBadge && alertCount > 0 && (
                    <span
                      className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full"
                      style={{
                        backgroundColor: active ? '#1A1A1A' : '#EF4444',
                        color: active ? '#FFC107' : '#FFFFFF',
                      }}
                    >
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className="px-6 py-4 border-t"
        style={{ borderColor: '#2D2D2D' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs text-gray-400">Sistema activo</span>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          NIT 832.005.736-3
        </p>
      </div>
    </aside>
  );
}
