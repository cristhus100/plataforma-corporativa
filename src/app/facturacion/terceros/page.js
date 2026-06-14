'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fetchPaginated } from '@/lib/supabase/paginacion'
import Pagination from '@/components/ui/Pagination'
import usePaginacion from '@/hooks/usePaginacion'
import { useRole } from '@/context/RoleContext'
import { eliminarTercero } from '@/actions/facturacion'
import {
  Users,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Building2,
} from 'lucide-react'

export default function TercerosPage() {
  const supabase = createClient()
  const { isAdmin } = useRole()
  const [resumen, setResumen] = useState({ total: 0, clientes: 0, proveedores: 0 })
  const [eliminando, setEliminando] = useState(null)

  useEffect(() => {
    async function init() {
      const [totalRes, cliRes, provRes] = await Promise.all([
        supabase.from('terceros').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('terceros').select('id', { count: 'exact', head: true }).eq('activo', true).eq('tipo_tercero', 'cliente'),
        supabase.from('terceros').select('id', { count: 'exact', head: true }).eq('activo', true).eq('tipo_tercero', 'proveedor'),
      ])
      setResumen({
        total: totalRes.count || 0,
        clientes: cliRes.count || 0,
        proveedores: provRes.count || 0,
      })
    }
    init()
  }, [supabase])

  const fetchFn = useCallback(async ({ page, limit, search }) => {
    let query = supabase
      .from('terceros')
      .select('*', { count: 'exact' })
      .eq('activo', true)

    if (search) {
      const term = `%${search}%`
      query = query.or(
        `nombre_completo.ilike.${term},nombre_comercial.ilike.${term},numero_documento.ilike.${term},telefono.ilike.${term},email.ilike.${term}`
      )
    }

    query = query.order('nombre_completo', { ascending: true })
    return fetchPaginated(query, page, limit)
  }, [supabase])

  const paginacion = usePaginacion({
    fetchFn,
    limit: 25,
    searchDelay: 300,
  })

  async function handleEliminar(id) {
    if (!confirm('Seguro de eliminar este tercero?')) return
    setEliminando(id)
    try {
      const res = await eliminarTercero(id)
      if (res.error) throw new Error(res.error)
      paginacion.refetch()
      setResumen(prev => ({ ...prev, total: prev.total - 1 }))
    } catch (err) {
      alert(err.message)
    } finally {
      setEliminando(null)
    }
  }

  const tipoLabels = {
    cliente: 'Cliente',
    proveedor: 'Proveedor',
    ambos: 'Ambos',
    otro: 'Otro',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/facturacion" className="hover:text-gray-900">Facturación</Link>
            <span>/</span>
            <span className="text-gray-900">Terceros</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Terceros</h1>
          <p className="text-sm text-gray-600">Clientes, proveedores y otros terceros</p>
        </div>
        {isAdmin && (
          <Link
            href="/facturacion/terceros/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Nuevo Tercero
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 text-sm font-medium mb-1">Total</p>
          <p className="text-3xl font-bold text-gray-900">{resumen.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 text-sm font-medium mb-1">Clientes</p>
          <p className="text-3xl font-bold text-blue-600">{resumen.clientes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 text-sm font-medium mb-1">Proveedores</p>
          <p className="text-3xl font-bold text-orange-600">{resumen.proveedores}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento, teléfono o email..."
            value={paginacion.search}
            onChange={(e) => paginacion.setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {paginacion.search && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Mostrando <strong>{paginacion.total}</strong> resultados
            </span>
            <button onClick={paginacion.limpiarFiltros} className="text-blue-600 hover:text-blue-700 font-medium">
              Limpiar búsqueda
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {paginacion.loading ? (
          <div className="p-12 text-center text-gray-500">Cargando terceros...</div>
        ) : paginacion.error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">Error: {paginacion.error}</p>
          </div>
        ) : paginacion.data.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900">
              {resumen.total === 0 ? 'No hay terceros registrados' : 'No se encontraron resultados'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {resumen.total === 0 ? 'Comienza registrando tu primer tercero.' : 'Intenta ajustar los términos de búsqueda.'}
            </p>
            {resumen.total === 0 && isAdmin && (
              <Link href="/facturacion/terceros/nuevo" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Nuevo Tercero
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Documento</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Teléfono</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paginacion.data.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      <Link href={`/facturacion/terceros/${t.id}`} className="hover:text-blue-600 transition">
                        {t.tipo_documento} {t.numero_documento}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/facturacion/terceros/${t.id}`} className="hover:text-blue-600 transition">
                        {t.nombre_comercial || t.nombre_completo || '—'}
                      </Link>
                      {t.nombre_comercial && t.nombre_completo && (
                        <span className="block text-xs text-gray-400">{t.nombre_completo}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.telefono || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        t.tipo_tercero === 'cliente' || t.tipo_tercero === 'ambos'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {tipoLabels[t.tipo_tercero] || t.tipo_tercero}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/facturacion/terceros/${t.id}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <>
                            <Link
                              href={`/facturacion/terceros/${t.id}/editar`}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleEliminar(t.id)}
                              disabled={eliminando === t.id}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!paginacion.loading && paginacion.totalPages > 1 && (
          <div className="border-t border-gray-200 bg-gray-50 px-4">
            <Pagination
              page={paginacion.page}
              totalPages={paginacion.totalPages}
              onPageChange={paginacion.setPage}
              isLoading={paginacion.loading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
