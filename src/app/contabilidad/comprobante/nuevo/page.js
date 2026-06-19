'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { crearComprobante } from '@/actions/contabilidad';
import { formatValorContable } from '@/lib/utils/contabilidad';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function NuevoComprobantePage() {
  const supabase = createClient();
  const { addToast } = useToast();
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useRole();
  const [tipos, setTipos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    tipo_comprobante_id: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
  });

  const [lineas, setLineas] = useState([
    { cuenta_id: '', tercero_id: '', descripcion: '', naturaleza: 'debito', valor: '' },
    { cuenta_id: '', tercero_id: '', descripcion: '', naturaleza: 'credito', valor: '' },
  ]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/contabilidad/comprobantes');
      return;
    }
  }, [roleLoading, isAdmin, router]);

  useEffect(() => {
    async function loadCatalogs() {
      try {
        setLoading(true);
        const [tiposRes, cuentasRes, tercerosRes] = await Promise.all([
          supabase.from('tipo_comprobantes').select('*').eq('activo', true).order('codigo'),
          supabase.from('plan_cuentas').select('*').eq('activa', true).eq('acepta_movimiento', true).order('codigo'),
          supabase.from('terceros').select('id, tipo_documento, numero_documento, nombre_completo').eq('activo', true).order('nombre_completo'),
        ]);
        if (tiposRes.data) setTipos(tiposRes.data);
        if (cuentasRes.data) setCuentas(cuentasRes.data);
        if (tercerosRes.data) setTerceros(tercerosRes.data);
      } catch (err) {
        console.error('Error loading catalogs:', err);
        try { addToast('Error al cargar datos del formulario', { type: 'error' }) } catch(e) {}
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCatalogs();
  }, [supabase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineaChange = (index, field, value) => {
    setLineas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const agregarLinea = () => {
    setLineas((prev) => [...prev, { cuenta_id: '', tercero_id: '', descripcion: '', naturaleza: 'debito', valor: '' }]);
  };

  const eliminarLinea = (index) => {
    if (lineas.length <= 2) return;
    setLineas((prev) => prev.filter((_, i) => i !== index));
  };

  const totales = lineas.reduce(
    (acc, l) => {
      const val = parseFloat(l.valor) || 0;
      if (l.naturaleza === 'debito') acc.debitos += val;
      else acc.creditos += val;
      return acc;
    },
    { debitos: 0, creditos: 0 }
  );
  const diferencia = Math.abs(totales.debitos - totales.creditos);
  const estaCuadrado = diferencia < 0.01;
  const puedeEnviar = estaCuadrado && lineas.every(l => l.cuenta_id && l.valor && parseFloat(l.valor) > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    setSubmitting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('tipo_comprobante_id', formData.tipo_comprobante_id);
      form.append('fecha', formData.fecha);
      form.append('concepto', formData.concepto);
      form.append('lineas', JSON.stringify(lineas));

      const result = await crearComprobante(form);
      if (result.error) throw new Error(result.error);

      setSuccess(`Comprobante ${result.numero} creado exitosamente`);
      setTimeout(() => {
        router.push(`/contabilidad/comprobante/${result.id}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 animate-pulse">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 animate-pulse">Cargando datos del formulario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/contabilidad" className="hover:text-gray-900">Contabilidad</Link>
          <span>/</span>
          <Link href="/contabilidad/comprobantes" className="hover:text-gray-900">Comprobantes</Link>
          <span>/</span>
          <span className="text-gray-900">Nuevo</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo Comprobante Contable</h1>
        <p className="text-sm text-gray-600 mt-1">Registre un asiento contable con partida doble</p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium">{success}</p>
            <p className="text-green-600 text-sm">Redirigiendo al detalle...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Data */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Comprobante</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Comprobante <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipo_comprobante_id"
                  value={formData.tipo_comprobante_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seleccione un tipo</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="concepto"
                  value={formData.concepto}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Descripción del comprobante..."
                />
              </div>
            </div>
          </div>

          {/* Lines Table */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Líneas del Asiento</h2>
              <button
                type="button"
                onClick={agregarLinea}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Plus className="h-4 w-4" />
                Agregar Línea
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">#</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cuenta</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tercero</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Descripción</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Naturaleza</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Valor</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {lineas.map((linea, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <select
                          value={linea.cuenta_id}
                          onChange={(e) => handleLineaChange(idx, 'cuenta_id', e.target.value)}
                          required
                          className="w-48 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar cuenta</option>
                          {cuentas.map((c) => (
                            <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={linea.tercero_id}
                          onChange={(e) => handleLineaChange(idx, 'tercero_id', e.target.value)}
                          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Sin tercero</option>
                          {terceros.map((t) => (
                            <option key={t.id} value={t.id}>{t.nombre_completo}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={linea.descripcion}
                          onChange={(e) => handleLineaChange(idx, 'descripcion', e.target.value)}
                          className="w-40 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Descripción (opcional)"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleLineaChange(idx, 'naturaleza', 'debito')}
                            className={`px-3 py-1.5 text-xs font-medium transition ${
                              linea.naturaleza === 'debito'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Débito
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLineaChange(idx, 'naturaleza', 'credito')}
                            className={`px-3 py-1.5 text-xs font-medium transition ${
                              linea.naturaleza === 'credito'
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Crédito
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={linea.valor}
                          onChange={(e) => handleLineaChange(idx, 'valor', e.target.value)}
                          required
                          className="w-28 rounded border border-gray-300 px-2 py-1.5 text-xs text-right font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lineas.length > 2 && (
                          <button
                            type="button"
                            onClick={() => eliminarLinea(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 transition"
                            title="Eliminar línea"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex flex-wrap items-center gap-6 justify-end">
                <div className="text-sm">
                  <span className="text-gray-500">Débitos:</span>{' '}
                  <span className="font-mono font-semibold text-blue-700">{formatValorContable(totales.debitos)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Créditos:</span>{' '}
                  <span className="font-mono font-semibold text-green-700">{formatValorContable(totales.creditos)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Diferencia:</span>{' '}
                  <span className={`font-mono font-semibold ${estaCuadrado ? 'text-green-600' : 'text-red-600'}`}>
                    {formatValorContable(diferencia)}
                  </span>
                  {estaCuadrado && <span className="ml-1 text-green-600 text-xs">(Cuadrado)</span>}
                  {!estaCuadrado && <span className="ml-1 text-red-600 text-xs">(No cuadra)</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/contabilidad/comprobantes"
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting || !puedeEnviar}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Crear Comprobante
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
