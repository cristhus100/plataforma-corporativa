'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { guardarConfiguracionAlertas, crearFrente, actualizarFrente, eliminarFrente, crearTipoMaquinaria, actualizarTipoMaquinaria, eliminarTipoMaquinaria, configurarUmbrales, actualizarRolUsuario } from '@/actions'
import { useRole } from '@/context/RoleContext'
import { useToast } from '@/context/ToastContext'
import CollapsibleSection from '@/components/ui/CollapsibleSection'
import {
  Bell, Mail, Shield, AlertTriangle, XCircle, Clock, CheckCircle2, Save, Loader2,
  MapPin, Plus, Pencil, Trash2, Building2, Wrench, Gauge, Users, ChevronDown,
} from 'lucide-react'

// ─── Componentes locales ────────────────────────────────────────

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-xl">&times;</span>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-500">
        {message}
      </td>
    </tr>
  )
}

// ─── Página principal ────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { addToast, confirm } = useToast();
  const supabase = createClient()
  const { isAdmin, loading: roleLoading } = useRole()

  // ── Collapsible sections state ──
  const [openSections, setOpenSections] = useState({
    alertasCorreo: true,
    frentes: false,
    tiposMaquinaria: false,
    umbrales: false,
    usuarios: false,
  })

  // ── Alertas por correo ──
  const [alertas, setAlertas] = useState([])
  const [loadingAlertas, setLoadingAlertas] = useState(true)
  const [guardandoAlertas, setGuardandoAlertas] = useState(false)
  const [guardadoAlertas, setGuardadoAlertas] = useState(false)
  const [configAlertas, setConfigAlertas] = useState({
    email_notifications: false,
    email_destino: '',
    alertar_vencidos: true,
    alertar_criticos: true,
    alertar_proximos: false,
    dias_anticipacion: 7,
    resend_api_key: '',
  })

  // ── Frentes de Trabajo ──
  const [frentes, setFrentes] = useState([])
  const [loadingFrentes, setLoadingFrentes] = useState(false)
  const [frenteModal, setFrenteModal] = useState(false)
  const [editandoFrente, setEditandoFrente] = useState(null)
  const [frenteForm, setFrenteForm] = useState({ codigo: '', nombre: '', ubicacion: '', ciudad: '', departamento: '' })
  const [guardandoFrente, setGuardandoFrente] = useState(false)

  // ── Tipos de Maquinaria ──
  const [tiposMaq, setTiposMaq] = useState([])
  const [loadingTipos, setLoadingTipos] = useState(false)
  const [tipoModal, setTipoModal] = useState(false)
  const [editandoTipo, setEditandoTipo] = useState(null)
  const [tipoForm, setTipoForm] = useState({ nombre: '', descripcion: '' })
  const [guardandoTipo, setGuardandoTipo] = useState(false)

  // ── Umbrales ──
  const [umbrales, setUmbrales] = useState({
    intervalo_cambio_aceite: 300,
    intervalo_cambio_filtros: 120,
    horometro_maximo: '',
  })
  const [guardandoUmbrales, setGuardandoUmbrales] = useState(false)
  const [guardadoUmbrales, setGuardadoUmbrales] = useState(false)

  // ── Usuarios ──
  const [usuarios, setUsuarios] = useState([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [cambiandoRol, setCambiandoRol] = useState(null)

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Inicialización ──
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      Promise.all([fetchAlertas(), fetchConfig()])
      fetchFrentes()
      fetchTiposMaquinaria()
      fetchUsuarios()
    }
  }, [roleLoading, isAdmin])

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>
  if (!isAdmin) return null

  // ===================================================================
  // Alertas por Correo (funcionalidad existente)
  // ===================================================================

  async function fetchAlertas() {
    try {
      const res = await fetch('/api/alertas')
      const data = await res.json()
      setAlertas(data.alertas || [])
    } catch (err) {
      console.error('Error fetching alertas:', err)
    } finally {
      setLoadingAlertas(false)
    }
  }

  async function fetchConfig() {
    try {
      const { data } = await supabase
        .from('configuracion_alertas')
        .select('*')
        .single()

      if (data) {
        setConfigAlertas({
          email_notifications: data.email_notifications || false,
          email_destino: data.email_destino || '',
          alertar_vencidos: data.alertar_vencidos ?? true,
          alertar_criticos: data.alertar_criticos ?? true,
          alertar_proximos: data.alertar_proximos ?? false,
          dias_anticipacion: data.dias_anticipacion || 7,
          resend_api_key: '',
        })
        setUmbrales({
          intervalo_cambio_aceite: data.intervalo_cambio_aceite || 300,
          intervalo_cambio_filtros: data.intervalo_cambio_filtros || 120,
          horometro_maximo: data.horometro_maximo || '',
        })
      }
    } catch (err) {
      // Tabla no existe o sin datos — usar valores default
    }
  }

  async function guardarConfig(e) {
    e.preventDefault()
    setGuardandoAlertas(true)
    setGuardadoAlertas(false)

    try {
      const result = await guardarConfiguracionAlertas({
        email_notifications: configAlertas.email_notifications,
        email_destino: configAlertas.email_destino,
        alertar_vencidos: configAlertas.alertar_vencidos,
        alertar_criticos: configAlertas.alertar_criticos,
        alertar_proximos: configAlertas.alertar_proximos,
        dias_anticipacion: configAlertas.dias_anticipacion,
      })

      if (result.error) throw new Error(result.error)
      setGuardadoAlertas(true)
      setTimeout(() => setGuardadoAlertas(false), 3000)
    } catch (err) {
      console.error('Error guardando configuración:', err)
      addToast('No se pudo guardar. Verifica los permisos de administrador.', { type: 'error' })
    } finally {
      setGuardandoAlertas(false)
    }
  }

  const conteoAlertas = {
    vencidos: alertas.filter((a) => a.estado_alerta === 'VENCIDO').length,
    criticos: alertas.filter((a) => a.estado_alerta === 'CRITICO').length,
    proximos: alertas.filter((a) => a.estado_alerta === 'PROXIMO').length,
  }

  // ===================================================================
  // Frentes de Trabajo (CRUD)
  // ===================================================================

  async function fetchFrentes() {
    setLoadingFrentes(true)
    const { data } = await supabase
      .from('frentes_trabajo')
      .select('*')
      .order('codigo', { ascending: true })
    setFrentes(data || [])
    setLoadingFrentes(false)
  }

  function abrirNuevoFrente() {
    setEditandoFrente(null)
    setFrenteForm({ codigo: '', nombre: '', ubicacion: '', ciudad: '', departamento: '' })
    setFrenteModal(true)
  }

  function abrirEditarFrente(frente) {
    setEditandoFrente(frente.id)
    setFrenteForm({
      codigo: frente.codigo || '',
      nombre: frente.nombre || '',
      ubicacion: frente.ubicacion || '',
      ciudad: frente.ciudad || '',
      departamento: frente.departamento || '',
    })
    setFrenteModal(true)
  }

  async function handleGuardarFrente(e) {
    e.preventDefault()
    if (!frenteForm.codigo.trim() || !frenteForm.nombre.trim()) return
    setGuardandoFrente(true)

    try {
      let result
      if (editandoFrente) {
        result = await actualizarFrente(editandoFrente, frenteForm)
      } else {
        result = await crearFrente(frenteForm)
      }
      if (result.error) throw new Error(result.error)
      setFrenteModal(false)
      fetchFrentes()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setGuardandoFrente(false)
    }
  }

  // ===================================================================
  // Tipos de Maquinaria (CRUD)
  // ===================================================================

  async function fetchTiposMaquinaria() {
    setLoadingTipos(true)
    const { data } = await supabase
      .from('tipos_maquinaria')
      .select('*')
      .order('nombre', { ascending: true })
    setTiposMaq(data || [])
    setLoadingTipos(false)
  }

  function abrirNuevoTipo() {
    setEditandoTipo(null)
    setTipoForm({ nombre: '', descripcion: '' })
    setTipoModal(true)
  }

  function abrirEditarTipo(tipo) {
    setEditandoTipo(tipo.id)
    setTipoForm({
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || '',
    })
    setTipoModal(true)
  }

  async function handleGuardarTipo(e) {
    e.preventDefault()
    if (!tipoForm.nombre.trim()) return
    setGuardandoTipo(true)

    try {
      let result
      if (editandoTipo) {
        result = await actualizarTipoMaquinaria(editandoTipo, tipoForm)
      } else {
        result = await crearTipoMaquinaria(tipoForm)
      }
      if (result.error) throw new Error(result.error)
      setTipoModal(false)
      fetchTiposMaquinaria()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setGuardandoTipo(false)
    }
  }

  // ===================================================================
  // Umbrales de Mantenimiento
  // ===================================================================

  async function handleGuardarUmbrales(e) {
    e.preventDefault()
    setGuardandoUmbrales(true)
    setGuardadoUmbrales(false)

    try {
      const result = await configurarUmbrales(umbrales)
      if (result.error) throw new Error(result.error)
      setGuardadoUmbrales(true)
      setTimeout(() => setGuardadoUmbrales(false), 3000)
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setGuardandoUmbrales(false)
    }
  }

  // ===================================================================
  // Usuarios y Roles
  // ===================================================================

  async function fetchUsuarios() {
    setLoadingUsuarios(true)
    try {
      const { data: perfiles } = await supabase
        .from('perfiles')
        .select('id, email, nombre_completo, rol, created_at')
        .order('email', { ascending: true })

      setUsuarios(perfiles || [])
    } catch (err) {
      console.error('Error cargando usuarios:', err)
    } finally {
      setLoadingUsuarios(false)
    }
  }

  async function handleCambiarRol(userId, nuevoRol) {
    const ok = await confirm(`¿Cambiar rol a "${nuevoRol}"?`, { title: 'Cambiar rol' });
    if (!ok) return;
    setCambiandoRol(userId)
    try {
      const result = await actualizarRolUsuario(userId, nuevoRol)
      if (result.error) throw new Error(result.error)
      fetchUsuarios()
    } catch (err) {
      addToast(err.message, { type: 'error' })
    } finally {
      setCambiandoRol(null)
    }
  }

  // ===================================================================
  // Render
  // ===================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-600">
          Administración del sistema — Solo administradores
        </p>
      </div>

      {/* Panel principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* ──────── ALERTAS POR CORREO ──────── */}
          <CollapsibleSection
            title="Alertas por Correo"
            isOpen={openSections.alertasCorreo}
            onToggle={() => toggleSection('alertasCorreo')}
          >
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
                    checked={configAlertas.email_notifications}
                    onChange={(e) => setConfigAlertas({ ...configAlertas, email_notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </div>
              </label>

              {/* Email destino */}
              <div className={configAlertas.email_notifications ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo de destino</label>
                <input
                  type="email"
                  value={configAlertas.email_destino}
                  onChange={(e) => setConfigAlertas({ ...configAlertas, email_destino: e.target.value })}
                  placeholder="admin@serviequipos.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">Correo donde recibirás las alertas</p>
              </div>

              {/* Tipos de alerta */}
              <div className={configAlertas.email_notifications ? 'space-y-3' : 'opacity-50 pointer-events-none space-y-3'}>
                <p className="text-sm font-medium text-gray-700">Alertar cuando:</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={configAlertas.alertar_vencidos} onChange={(e) => setConfigAlertas({ ...configAlertas, alertar_vencidos: e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-600">Documentos vencidos</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={configAlertas.alertar_criticos} onChange={(e) => setConfigAlertas({ ...configAlertas, alertar_criticos: e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-600">Documentos críticos (7 días o menos)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={configAlertas.alertar_proximos} onChange={(e) => setConfigAlertas({ ...configAlertas, alertar_proximos: e.target.checked })} className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-600">Documentos próximos a vencer</span>
                </label>
              </div>

              {/* Días de anticipación */}
              <div className={configAlertas.email_notifications ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Días de anticipación</label>
                <select
                  value={configAlertas.dias_anticipacion}
                  onChange={(e) => setConfigAlertas({ ...configAlertas, dias_anticipacion: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value={3}>3 días</option>
                  <option value={7}>7 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </select>
              </div>

              {/* API Key Resend */}
              <div className={configAlertas.email_notifications ? '' : 'opacity-50 pointer-events-none'}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key (Resend)</label>
                <input
                  type="password"
                  value={configAlertas.resend_api_key}
                  onChange={(e) => setConfigAlertas({ ...configAlertas, resend_api_key: e.target.value })}
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
                disabled={guardandoAlertas}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {guardandoAlertas ? (
                  <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Save size={16} /> Guardar configuración</>
                )}
              </button>
              {guardadoAlertas && (
                <span className="text-sm text-green-600 ml-3">✓ Configuración guardada</span>
              )}
            </div>
          </CollapsibleSection>

          {/* ──────── FRENTES DE TRABAJO ──────── */}
          <CollapsibleSection
            title="Frentes de Trabajo"
            isOpen={openSections.frentes}
            onToggle={() => toggleSection('frentes')}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Gestiona los frentes de trabajo y ubicaciones</p>
                <button
                  onClick={abrirNuevoFrente}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={14} /> Nuevo
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Código</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Ubicación</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Ciudad</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">Estado</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingFrentes ? (
                      <EmptyRow colSpan={6} message="Cargando frentes..." />
                    ) : frentes.length === 0 ? (
                      <EmptyRow colSpan={6} message="No hay frentes de trabajo registrados" />
                    ) : (
                      frentes.map(f => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono font-semibold text-gray-900">{f.codigo}</td>
                          <td className="px-3 py-2 text-gray-700">{f.nombre}</td>
                          <td className="px-3 py-2 text-gray-500">{f.ubicacion || '—'}</td>
                          <td className="px-3 py-2 text-gray-500">{f.ciudad ? `${f.ciudad}${f.departamento ? `, ${f.departamento}` : ''}` : '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${f.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {f.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => abrirEditarFrente(f)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar">
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleSection>

          {/* ──────── TIPOS DE MAQUINARIA ──────── */}
          <CollapsibleSection
            title="Tipos de Maquinaria"
            isOpen={openSections.tiposMaquinaria}
            onToggle={() => toggleSection('tiposMaquinaria')}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Catálogo de tipos de maquinaria y equipos</p>
                <button
                  onClick={abrirNuevoTipo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                >
                  <Plus size={14} /> Nuevo
                </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Descripción</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingTipos ? (
                      <EmptyRow colSpan={3} message="Cargando tipos..." />
                    ) : tiposMaq.length === 0 ? (
                      <EmptyRow colSpan={3} message="No hay tipos de maquinaria registrados" />
                    ) : (
                      tiposMaq.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{t.nombre}</td>
                          <td className="px-3 py-2 text-gray-500">{t.descripcion || '—'}</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => abrirEditarTipo(t)} className="p-1 text-gray-400 hover:text-blue-600" title="Editar">
                              <Pencil size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleSection>

          {/* ──────── UMBRALES DE MANTENIMIENTO ──────── */}
          <CollapsibleSection
            title="Umbrales de Mantenimiento"
            isOpen={openSections.umbrales}
            onToggle={() => toggleSection('umbrales')}
          >
            <form onSubmit={handleGuardarUmbrales} className="space-y-5">
              <p className="text-sm text-gray-500">
                Configura los intervalos de mantenimiento preventivo para maquinaria y equipos
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Intervalo cambio aceite (horas)
                  </label>
                  <input
                    type="number"
                    value={umbrales.intervalo_cambio_aceite}
                    onChange={(e) => setUmbrales({ ...umbrales, intervalo_cambio_aceite: parseInt(e.target.value) })}
                    min={50}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: 300 horas</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Intervalo cambio filtros (horas)
                  </label>
                  <input
                    type="number"
                    value={umbrales.intervalo_cambio_filtros}
                    onChange={(e) => setUmbrales({ ...umbrales, intervalo_cambio_filtros: parseInt(e.target.value) })}
                    min={50}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">Default: 120 horas</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Horómetro máximo operativo
                  </label>
                  <input
                    type="number"
                    value={umbrales.horometro_maximo}
                    onChange={(e) => setUmbrales({ ...umbrales, horometro_maximo: e.target.value })}
                    placeholder="Sin límite"
                    min={0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">Límite de horas para operación segura</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={guardandoUmbrales}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {guardandoUmbrales ? (
                  <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                ) : (
                  <><Save size={16} /> Guardar umbrales</>
                )}
              </button>
              {guardadoUmbrales && (
                <span className="text-sm text-green-600 ml-3">✓ Umbrales guardados</span>
              )}
            </form>
          </CollapsibleSection>

          {/* ──────── USUARIOS Y ROLES ──────── */}
          <CollapsibleSection
            title="Usuarios y Roles"
            isOpen={openSections.usuarios}
            onToggle={() => toggleSection('usuarios')}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Administra los roles de los usuarios del sistema
              </p>

              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Nombre</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Rol</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingUsuarios ? (
                      <EmptyRow colSpan={4} message="Cargando usuarios..." />
                    ) : usuarios.length === 0 ? (
                      <EmptyRow colSpan={4} message="No hay usuarios registrados" />
                    ) : (
                      usuarios.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900 font-mono text-xs">{u.email || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{u.nombre_completo || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {u.rol}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleCambiarRol(u.id, u.rol === 'admin' ? 'usuario' : 'admin')}
                              disabled={cambiandoRol === u.id}
                              className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-50"
                            >
                              {cambiandoRol === u.id ? '...' : u.rol === 'admin' ? 'Revocar admin' : 'Hacer admin'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleSection>

        </div>

        {/* ──────── SIDEBAR ──────── */}
        <div className="space-y-4">
          {/* Resumen de Alertas */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Resumen de Alertas</h3>
            </div>
            {loadingAlertas ? (
              <p className="text-sm text-gray-400">Cargando...</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-red-600" />
                    <span className="text-sm text-red-800">Vencidos</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">{conteoAlertas.vencidos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-orange-600" />
                    <span className="text-sm text-orange-800">Críticos</span>
                  </div>
                  <span className="text-lg font-bold text-orange-700">{conteoAlertas.criticos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-yellow-600" />
                    <span className="text-sm text-yellow-800">Próximos</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-700">{conteoAlertas.proximos}</span>
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

          {/* Info frentes */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Frentes</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{frentes.length}</p>
            <p className="text-xs text-gray-500 mt-1">Frentes de trabajo registrados</p>
          </div>

          {/* Info maquinaria */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={18} className="text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Tipos de Maquinaria</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{tiposMaq.length}</p>
            <p className="text-xs text-gray-500 mt-1">Tipos de equipos registrados</p>
          </div>
        </div>
      </div>

      {/* ──────── MODAL FRENTES ──────── */}
      <Modal
        isOpen={frenteModal}
        onClose={() => setFrenteModal(false)}
        title={editandoFrente ? 'Editar Frente' : 'Nuevo Frente'}
      >
        <form onSubmit={handleGuardarFrente} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
            <input type="text" value={frenteForm.codigo} onChange={e => setFrenteForm({ ...frenteForm, codigo: e.target.value })}
              placeholder="FT-SR" required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={frenteForm.nombre} onChange={e => setFrenteForm({ ...frenteForm, nombre: e.target.value })}
              placeholder="Santa Rosa" required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input type="text" value={frenteForm.ubicacion} onChange={e => setFrenteForm({ ...frenteForm, ubicacion: e.target.value })}
              placeholder="Vereda Santa Rosa"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input type="text" value={frenteForm.ciudad} onChange={e => setFrenteForm({ ...frenteForm, ciudad: e.target.value })}
                placeholder="La Calera"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <input type="text" value={frenteForm.departamento} onChange={e => setFrenteForm({ ...frenteForm, departamento: e.target.value })}
                placeholder="Cundinamarca"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setFrenteModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardandoFrente}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
              {guardandoFrente ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : editandoFrente ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ──────── MODAL TIPOS ──────── */}
      <Modal
        isOpen={tipoModal}
        onClose={() => setTipoModal(false)}
        title={editandoTipo ? 'Editar Tipo' : 'Nuevo Tipo de Maquinaria'}
      >
        <form onSubmit={handleGuardarTipo} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={tipoForm.nombre} onChange={e => setTipoForm({ ...tipoForm, nombre: e.target.value })}
              placeholder="Retroexcavadora" required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={tipoForm.descripcion} onChange={e => setTipoForm({ ...tipoForm, descripcion: e.target.value })}
              rows={3} placeholder="Descripción opcional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setTipoModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardandoTipo}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
              {guardandoTipo ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : editandoTipo ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
