'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { login, signup } from './actions'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const form = new FormData()
    form.append('email', email)
    form.append('password', password)

    const result = isLogin
      ? await login(form)
      : await signup(form)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccess(result.success)
      setLoading(false)
    }
    // login() hace redirect internamente si es exitoso
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-40 h-40 border border-[#FFC107] rounded-full" />
          <div className="absolute bottom-20 right-20 w-60 h-60 border border-[#FFC107] rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-20 h-20 border border-[#FFC107] rounded-lg" />
        </div>
        <div className="relative z-10 text-center">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white shadow-lg mx-auto mb-8">
            <Image
              src="/logo-serviequipos.jpg"
              alt="Serviequipos"
              fill
              sizes="96px"
              className="object-contain p-2"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Serviequipos</h1>
          <p className="text-[#FFC107] text-lg font-medium">Mantenimiento Ltda.</p>
          <p className="text-gray-400 mt-6 max-w-sm">
            Plataforma corporativa para la gestión integral de equipos, personal y documentación.
          </p>
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#1A1A1A]">
              <Image
                src="/logo-serviequipos.jpg"
                alt="Serviequipos"
                fill
                sizes="40px"
                className="object-contain p-1"
              />
            </div>
            <div>
              <p className="font-bold text-gray-900">Serviequipos</p>
              <p className="text-xs text-[#FFC107] font-medium">Mantenimiento Ltda.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {isLogin
              ? 'Ingresa tus credenciales para acceder'
              : 'Regístrate para acceder a la plataforma'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#1A1A1A] text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {isLogin ? 'Ingresando...' : 'Creando cuenta...'}
                </>
              ) : (
                isLogin ? 'Ingresar' : 'Crear Cuenta'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                  setSuccess(null)
                }}
                className="text-[#1A1A1A] font-semibold hover:underline"
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
