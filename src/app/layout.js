import { Inter } from 'next/font/google'
import './globals.css'
import MainLayout from '@/components/layout/MainLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Plataforma Corporativa',
  description: 'Sistema integral de gestión empresarial',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  )
}
