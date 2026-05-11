'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Mail, Shield, AlertTriangle, XCircle, Clock, CheckCircle2, Save, Loader2 } from 'lucide-react'

export default function ConfiguracionPage() {
  const supabase = createClient()
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const [config, setConfig] = useState({
    email_notifications: false,
    email_destino: '',
    alertar_vencidos: true,
    alertar_criticos: true,
    alertar_proximos: false,
    dias_anticipacion: 7,
    resend_api_key: '',
  })

  useEffect(() => {
    Promise.all([fetchAlertas(), fetchConfig()])
  }, [])

  async function fetchAlertas() {
    try {
      const res = await fetch('/api/alertas')
      const data = await res.json()
      setAlertas(data.alertas || [])
    } catch (err) {
      console.error('Error fetching alertas:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchConfig() {
    try {
      const { data } = await supabase
        .from('configuracion_alertas')
        .select('*')
        .single()

      if (data) {
        setConfig({
          email_notifications: data.email_notifications || false,
          email_destino: data.email_destino || '',
          alertar_vencidos: data.alertar_vencidos ?? true,
          alertar_criticos: data.alertar_criticos ?? true,
          alertar_proximos: data.alertar_proximos ?? false,
          dias_anticipacion: data.dias_anticipacion || 7,
          resend_api_key: '',
        })
      }
    } catch (err) {
      // Tabla no existe o sin datos — usar valores default
    }
  }

  async function guardarConfig() {
    setGuardando(true)
    setGuardado(false)

    try {
      // Intentar guardar — si la tabla no existe, mostrar mensaje
      const { error } = await supabase
        .from('configuracion_alertas')
        .upsert({
          id: 1,
          email_notifications: config.email_notifications,
          email_destino: config.email_destino,
          alertar_vencidos: config.alertar_vencidos,
          alertar_criticos: config.alertar_criticos,
          alertar_proximos: config.alertar_proximos,
          dias_anticipacion: config.dias_anticipacion,
        })

      if (error) throw error
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (err) {
      console.error('Error guardando configuración:', err)
      alert('No se pudo guardar. Crea la tabla configuracion_alertas en Supabase.')
    } finally {
      setGuardando(false)
    }
  }

  const conteo = {
    vencidos: alertas.filter((a) => a.estado_alerta === 'VENCIDO').length,
    criticos: alertas.filter((a) => a.estado_alerta === 'CRITICO').length,
    proximos: alertas.filter((a) => a.estado_alerta === 'PROXIMO').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-600">Alertas por correo y preferencias del sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alertas por correo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Mail size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Alertas por Correo</h2>
                <p className="text-sm text-gray-500">Recibe notificaciones cuando los documentos estén por vencer</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Activar/desactivar */}
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-900">Notificaciones por email</p>
                  <p className="text-xs text-gray-500 mt-0.5">Recibe alertas de vencimientos en tu correo</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={config.email_notifications}
                    onChange={(e) => setConfig({ ...config, email_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </div>
              </label>

              {/* Email destino */}
              <div className={config.email_notifications ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo de destino
                </label>
                <input
                  type="email"
                  value={config.email_destino}
                  onChange={(e) => setConfig({ ...config, email_destino: e.target.value })}
                  placeholder="admin@serviequipos.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">Correo donde recibirás las alertas</p>
              </div>

              {/* Tipos de alerta */}
              <div className={config.email_notifications ? 'space-y-3' : 'opacity-50 pointer-events-none space-y-3'}>
                <p className="text-sm font-medium text-gray-700">Alertar cuando:</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={config.alertar_vencidos} onChange={(e) => setConfig({ ...config, alertar_vencidos: e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-600">Documentos vencidos</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={config.alertar_criticos} onChange={(e) => setConfig({ ...config, alertar_criticos: e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-600">Documentos críticos (7 días o menos)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={config.alertar_proximos} onChange={(e) => setConfig({ ...config, alertar_proximos: e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-600">Documentos próximos a vencer</span>
                </label>
              </div>

              {/* Días de anticipación */}
              <div className={config.email_notifications ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Días de anticipación
                </label>
                <select
                  value={config.dias_anticipacion}
                  onChange={(e) => setConfig({ ...config, dias_anticipacion: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value={3}>3 días</option>
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </select>
              </div>

              {/* API Key Resend */}
              <div className={config.email_notifications ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  API Key (Resend)
                </label>
                <input
                  type="password"
                  value={config.resend_api_key}
                  onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
                  placeholder="re_..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Obtén una API key gratis en{' '}
                  <a href="https://resend.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline">resend.com</a>
                </p>
              </div>

              <button
                onClick={guardarConfig}
                disabled={guardando}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {guardando ? (
                  <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Save size={16} /> Guardar configuración</>
                )}
              </button>
              {guardado && (
                <span className="text-sm text-green-600 ml-3">✓ Configuración guardada</span>
              )}
            </div>
          </div>

          {/* Cómo configurar */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Shield size={20} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">¿Cómo activar los emails?</h2>
                <p className="text-sm text-gray-500">Pasos para recibir alertas por correo</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-gray-600 list-decimal list-inside">
              <li>Crea una cuenta gratis en <a href="https://resend.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Resend</a></li>
              <li>Verifica tu dominio o usa el dominio de prueba (@resend.dev)</li>
              <li>Copia tu API Key y pégala arriba en el campo correspondiente</li>
              <li>Activa las notificaciones y guarda la configuración</li>
              <li>Las alertas se enviarán automáticamente cada hora</li>
            </ol>
          </div>
        </div>

        {/* Resumen de alertas */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Resumen de Alertas</h3>
            </div>
            {loading ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-red-600" />
                    <span className="text-sm text-red-800">Vencidos</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">{conteo.vencidos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-orange-600" />
                    <span className="text-sm text-orange-800">Críticos</span>
                  </div>
                  <span className="text-lg font-bold text-orange-700">{conteo.criticos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-yellow-600" />
                    <span className="text-sm text-yellow-800">Próximos</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-700">{conteo.proximos}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Total alertas</span>
                    <span className="text-lg font-bold text-gray-900">{alertas.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* API endpoint */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">API Endpoint</h3>
            <p className="text-xs text-gray-500 mb-2">Consulta las alertas vía API:</p>
            <code className="block p-2 bg-gray-50 rounded text-xs text-gray-700 break-all">
              GET /api/alertas
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
