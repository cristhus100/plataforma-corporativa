'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Login page es standalone (sin sidebar ni header)
  if (pathname === '/login') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
      <Sidebar isOpen={sidebarOpen} />

      {/* Contenido principal con margen dinámico */}
      <div
        style={{
          marginLeft: sidebarOpen ? '256px' : '0',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="animate-fade-in" style={{ padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
