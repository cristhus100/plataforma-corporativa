'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F5F5' }}>
      <Sidebar />
      
      {/* Contenido principal con margen izquierdo para el sidebar */}
      <div style={{ marginLeft: '256px', minHeight: '100vh' }}>
        <Header />
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
