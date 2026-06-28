'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { anularComprobante } from '@/actions/contabilidad';
import { formatValorContable, getNaturalezaLabel, getNaturalezaColor } from '@/lib/utils/contabilidad';
import { useToast } from '@/context/ToastContext';
import {
  AlertTriangle,
  Loader2,
  FileText,
  XCircle,
  ArrowLeft,
} from 'lucide-react';

export default function ComprobanteDetailPage() {
  const params = useParams();
  const supabase = createClient();
  const { isAdmin } = useRole();
  const { addToast } = useToast();
  const [comprobante, setComprobante] = useState(null);
  const [asientos, setAsientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [anularError, setAnularError] = useState(null);

  useEffect(() => {
    if (!params.id) return;
    loadComprobante();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function loadComprobante() {
    try {
      setLoading(true);
      setError(null);

      const { data: comp, error: errComp } = await supabase
        .from('comprobantes')
        .select(`
          *,
          tipo_comprobantes ( id, codigo, nombre, prefijo ),
          creador:creado_por ( id, email )
        `)
        .eq('id', params.id)
        .single();

      if (errComp) throw errComp;
      setComprobante(comp);

      const { data: asientosData, error: errAsientos } = await supabase
        .from('asientos_contables')
        .select(`
          *,
          cuenta:cuenta_id ( id, codigo, nombre, naturaleza ),
          tercero:tercero_id ( id, nombre_completo, tipo_documento, numero_documento )
        `)
        .eq('comprobante_id', params.id)
        .order('id');

      if (errAsientos) throw errAsientos;
      setAsientos(asientosData || []);
    } catch (err) {
      console.error('Error loading comprobante:', err);
      addToast('Error al cargar datos del comprobante', { type: 'error' })
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAnular = async () => {
    setAnulando(true);
    setAnularError(null);
    try {
      const result = await anularComprobante(params.id, motivoAnulacion);
      if (result.error) throw new Error(result.error);
      setMostrarModal(false);
      loadComprobante();
    } catch (err) {
      setAnularError(err.message);
    } finally {
      setAnulando(false);
    }
  };

  function getEstadoBadge(estado) {
    if (estado === 'activo') {
      return 'border-green-200 bg-green-50 text-green-700';
    }
    return 'border-red-200 bg-red-50 text-red-700';
  }

  function getEstadoDot(estado) {
    return estado === 'activo' ? 'bg-green-500' : 'bg-red-500';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 animate-pulse">Cargando comprobante...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Error: {error}</span>
          </div>
          <div>
            <Link href="/contabilidad/comprobantes" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              ← Volver a comprobantes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!comprobante) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-400">Comprobante no encontrado</p>
          <Link href="/contabilidad/comprobantes" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700">
            ← Volver a comprobantes
          </Link>
        </div>
      </div>
    );
  }

  const totales = asientos.reduce(
    (acc, a) => {
      const val = Number(a.valor) || 0;
      if (a.naturaleza === 'debito') acc.debitos += val;
      else acc.creditos += val;
      return acc;
    },
    { debitos: 0, creditos: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/contabilidad/comprobantes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a comprobantes
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {comprobante.numero_comprobante}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-medium ${getEstadoBadge(comprobante.estado)}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${getEstadoDot(comprobante.estado)}`} />
                {comprobante.estado === 'activo' ? 'Activo' : 'Anulado'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              <span><strong>Tipo:</strong> {comprobante.tipo_comprobantes?.codigo || '—'} — {comprobante.tipo_comprobantes?.nombre || '—'}</span>
              <span><strong>Fecha:</strong> {new Date(comprobante.fecha).toLocaleDateString('es-CO')}</span>
              <span><strong>Creado por:</strong> {comprobante.creador?.email || '—'}</span>
              {comprobante.estado === 'anulado' && (
                <span className="text-red-600"><strong>Anulado:</strong> {comprobante.motivo_anulacion || 'Sin motivo'}</span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
          {comprobante.concepto}
        </p>
      </div>

      {/* Asientos Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Asientos Contables</h2>
        </div>
        {asientos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm">Este comprobante no tiene asientos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">#</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Cuenta</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Tercero</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Naturaleza</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {asientos.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-gray-500">{a.cuenta?.codigo}</span>
                      <br />
                      <span className="text-sm font-medium text-gray-900">{a.cuenta?.nombre}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {a.tercero ? (
                        <span>{a.tercero.nombre_completo}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {a.descripcion || '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold ${getNaturalezaColor(a.naturaleza)}`}>
                        {getNaturalezaLabel(a.naturaleza)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-mono font-semibold text-gray-900">
                      {formatValorContable(a.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-6 justify-end">
            <div className="text-sm">
              <span className="text-gray-500">Total Débitos:</span>{' '}
              <span className="font-mono font-semibold text-blue-700">{formatValorContable(totales.debitos)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Total Créditos:</span>{' '}
              <span className="font-mono font-semibold text-green-700">{formatValorContable(totales.creditos)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anular (admin only, only if active) */}
      {isAdmin && comprobante.estado === 'activo' && (
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Zona de Peligro</h2>
              <p className="text-sm text-gray-500">Anular este comprobante contable</p>
            </div>
          </div>

          {!mostrarModal ? (
            <button
              onClick={() => setMostrarModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
            >
              <XCircle className="h-4 w-4" />
              Anular Comprobante
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-800 font-medium">
                ¿Estás seguro de anular el comprobante <strong>{comprobante.numero_comprobante}</strong>?
              </p>
              <p className="text-xs text-red-600">
                Esta acción no se puede deshacer. Los asientos quedarán registrados pero el comprobante se marcará como anulado.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de anulación</label>
                <textarea
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Indique el motivo de la anulación..."
                />
              </div>
              {anularError && (
                <div className="bg-red-100 border border-red-300 rounded p-2 text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {anularError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAnular}
                  disabled={anulando}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {anulando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Anulando...
                    </>
                  ) : (
                    'Sí, anular'
                  )}
                </button>
                <button
                  onClick={() => { setMostrarModal(false); setAnularError(null); setMotivoAnulacion(''); }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
