'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Megaphone, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'

const PRIORIDADES = {
  alta: { label: 'Alta', class: 'bg-red-100 text-red-700 border-red-200' },
  media: { label: 'Media', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  baja: { label: 'Baja', class: 'bg-green-100 text-green-700 border-green-200' },
}

const TIPOS = [
  { value: 'general', label: 'General' },
  { value: 'importante', label: 'Importante' },
  { value: 'informativo', label: 'Informativo' },
]

function anuncioVacio() {
  return {
    titulo: '',
    contenido: '',
    tipo: 'general',
    prioridad: 'media',
  }
}

export default function AnunciosPage() {
  const supabase = createClient()
  const [anuncios, setAnuncios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(anuncioVacio())
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarAnuncios()
  }, [])

  async function cargarAnuncios() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('comunicados')
        .select('*')
        .eq('activo', true)
        .order('fecha_publicacion', { ascending: false })

      if (error) throw error
      setAnuncios(data || [])
    } catch (err) {
      console.error('Error cargando anuncios:', err)
    } finally {
      setLoading(false)
    }
  }

  function abrirNuevo() {
    setForm(anuncioVacio())
    setEditando(null)
    setError(null)
    setModalOpen(true)
  }

  function abrirEditar(anuncio) {
    setForm({
      titulo: anuncio.titulo || '',
      contenido: anuncio.contenido || '',
      tipo: anuncio.tipo || 'general',
      prioridad: anuncio.prioridad || 'media',
    })
    setEditando(anuncio.id)
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.contenido.trim()) {
      setError('El título y el contenido son obligatorios')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      if (editando) {
        const { error: err } = await supabase
          .from('comunicados')
          .update({
            titulo: form.titulo.trim(),
            contenido: form.contenido.trim(),
            tipo: form.tipo,
            prioridad: form.prioridad,
          })
          .eq('id', editando)

        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('comunicados')
          .insert([{
            titulo: form.titulo.trim(),
            contenido: form.contenido.trim(),
            tipo: form.tipo,
            prioridad: form.prioridad,
            fecha_publicacion: new Date().toISOString(),
            activo: true,
          }])

        if (err) throw err
      }

      setModalOpen(false)
      cargarAnuncios()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este anuncio?')) return

    try {
      await supabase.from('comunicados').update({ activo: false }).eq('id', id)
      cargarAnuncios()
    } catch (err) {
      console.error('Error eliminando:', err)
    }
  }

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anuncios</h1>
          <p className="text-sm text-gray-600">
            Comunicados y noticias internas de Serviequipos
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nuevo Anuncio
        </button>
      </div>

      {/* Lista de anuncios */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Cargando anuncios...</div>
      ) : anuncios.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border border-gray-200">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900">No hay anuncios</h3>
          <p className="mt-1 text-sm text-gray-500">Crea el primer anuncio para tu equipo.</p>
          <button
            onClick={abrirNuevo}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Crear anuncio
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {anuncios.map((anuncio) => {
            const prio = PRIORIDADES[anuncio.prioridad] || PRIORIDADES.media
            return (
              <div
                key={anuncio.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {anuncio.titulo}
                      </h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${prio.class}`}>
                        {prio.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line line-clamp-2">
                      {anuncio.contenido}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>{formatDate(anuncio.fecha_publicacion)}</span>
                      <span className="capitalize">{anuncio.tipo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => abrirEditar(anuncio)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminar(anuncio.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editando ? 'Editar Anuncio' : 'Nuevo Anuncio'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Título del anuncio"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenido <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  rows={5}
                  placeholder="Escribe el contenido del anuncio..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {guardando ? (
                    <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                  ) : (
                    editando ? 'Guardar Cambios' : 'Publicar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
