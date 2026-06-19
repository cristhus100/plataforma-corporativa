'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/context/RoleContext'
import { User, Mail, Shield, Calendar, Loader2, Save, Check, Eye, EyeOff } from 'lucide-react'

export default function PerfilPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, perfil, loading: roleLoading } = useRole()

  const [nombreMostrar, setNombreMostrar] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [perfilExito, setPerfilExito] = useState(null)
  const [perfilError, setPerfilError] = useState(null)

  // Estado para cambio de contraseña
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [guardandoPassword, setGuardandoPassword] = useState(false)
  const [passwordExito, setPasswordExito] = useState(null)
  const [passwordError, setPasswordError] = useState(null)

  useEffect(() => {
    if (perfil?.nombre_mostrar) {
      setNombreMostrar(perfil.nombre_mostrar)
    }
  }, [perfil])

  async function handleGuardarPerfil(e) {
    e.preventDefault()
    setGuardandoPerfil(true)
    setPerfilExito(null)
    setPerfilError(null)

    const { error } = await supabase
      .from('perfiles')
      .update({ nombre_mostrar: nombreMostrar.trim() })
      .eq('user_id', user.id)

    if (error) {
      setPerfilError(error.message)
    } else {
      setPerfilExito('Nombre actualizado correctamente')
      setTimeout(() => setPerfilExito(null), 3000)
    }
    setGuardandoPerfil(false)
  }

  async function handleCambiarPassword(e) {
    e.preventDefault()
    setGuardandoPassword(true)
    setPasswordExito(null)
    setPasswordError(null)

    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      setGuardandoPassword(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.')
      setGuardandoPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordExito('Contraseña actualizada correctamente')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      setTimeout(() => setPasswordExito(null), 3000)
    }
    setGuardandoPassword(false)
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-gray-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-600 mt-1">Información de tu cuenta y preferencias</p>
      </div>

      {/* Tarjeta de información del usuario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {perfil?.nombre_mostrar || user?.email?.split('@')[0] || 'Usuario'}
            </h2>
            <p className="text-sm text-gray-500">{user?.email || ''}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Correo electrónico</p>
              <p className="text-sm font-medium text-gray-900">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Rol</p>
              <p className="text-sm font-medium text-gray-900">
                {perfil?.rol === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg sm:col-span-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Miembro desde</p>
              <p className="text-sm font-medium text-gray-900">
                {perfil?.created_at
                  ? new Date(perfil.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Editar nombre mostrado */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Nombre mostrado</h3>
        <form onSubmit={handleGuardarPerfil} className="space-y-4">
          <div>
            <label htmlFor="nombreMostrar" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nombre visible en la plataforma
            </label>
            <input
              id="nombreMostrar"
              type="text"
              value={nombreMostrar}
              onChange={(e) => setNombreMostrar(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A]"
            />
          </div>

          {perfilExito && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">{perfilExito}</p>
            </div>
          )}

          {perfilError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{perfilError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={guardandoPerfil || !nombreMostrar.trim()}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {guardandoPerfil ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar cambios
              </>
            )}
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Contraseña</h3>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Cambiar contraseña
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handleCambiarPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
                minLength={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A]"
              />
            </div>

            {passwordExito && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">{passwordExito}</p>
              </div>
            )}

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={guardandoPassword}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {guardandoPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Actualizar contraseña'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false)
                  setNewPassword('')
                  setConfirmPassword('')
                  setPasswordError(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
