import { Inter } from 'next/font/google'
import './globals.css'
import MainLayout from '@/components/layout/MainLayout'
import { RoleProvider } from '@/context/RoleContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Plataforma Corporativa',
  description: 'Sistema integral de gestión empresarial',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <RoleProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </RoleProvider>
      </body>
    </html>
  )
}
