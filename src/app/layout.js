import { Inter } from 'next/font/google'
import './globals.css'
import MainLayout from '@/components/layout/MainLayout'
import { RoleProvider } from '@/context/RoleContext'
import { ToastProvider } from '@/context/ToastContext'
import { AlertProvider } from '@/context/AlertContext'
import { ThemeProvider } from '@/context/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Plataforma Corporativa',
  description: 'Sistema integral de gestión empresarial',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThemeProvider>
          <RoleProvider>
            <ToastProvider>
              <AlertProvider>
                <MainLayout>
                  {children}
                </MainLayout>
              </AlertProvider>
            </ToastProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
