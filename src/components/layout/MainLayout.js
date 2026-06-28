'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Cerrar sidebar en mobile al navegar
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) setSidebarOpen(false);
  }, [pathname]);

  // Cerrar sidebar al alcanzar breakpoint lg
  const handleResize = useCallback(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Inicializar estado según tamaño de pantalla
    if (window.innerWidth < 1024) setSidebarOpen(false);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Login y formularios QR (sin sidebar ni header)
  const esQR = pathname.startsWith('/mantenimiento/cambio-aceite/') || pathname.startsWith('/mantenimiento/vehiculo/')
  if (pathname === '/login' || esQR) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Overlay backdrop para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Contenido principal */}
      <div
        className={`
          min-h-screen transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'lg:ml-64' : 'ml-0'}
        `}
      >
        <Header onToggleSidebar={toggleSidebar} />
        <main className="animate-fade-in p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
