'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { Car, AlertTriangle, Trash2 } from 'lucide-react';
import TabDocumentos from './components/TabDocumentos';
import TabMantenimiento from './components/TabMantenimiento';
import TabHistorial from './components/TabHistorial';
import { useToast } from '@/context/ToastContext';

import {
  getEstadoLabel, getEstadoBadge, getEstadoIcon,
  formatearFecha, formatearMoneda,
} from '@/lib/utils/vehiculo';

const TABS = [
  { id: 'general', label: 'Información General', icon: '📋' },
  { id: 'documentos', label: 'Documentos', icon: '📄' },
  { id: 'mantenimiento', label: 'Mantenimiento', icon: '🔧' },
  { id: 'historial', label: 'Historial', icon: '📜' },
];

export default function VehiculoDetallePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin } = useRole();
  const [vehiculo, setVehiculo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [showEliminar, setShowEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (params.id) cargarVehiculo();
  }, [params.id]);

  async function cargarVehiculo() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('vehiculos').select('*').eq('id', params.id).single();
      if (error) throw error;
      setVehiculo(data);
    } catch (err) {
      console.error('Error:', err);
      try { addToast('Error al cargar datos del vehículo', { type: 'error' }) } catch(e) {}
    } finally {
      setLoading(false);
    }
  }

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      const { error } = await supabase.from('vehiculos').delete().eq('id', params.id);
      if (error) throw error;
      router.push('/vehiculos');
    } catch (err) {
      setErrorEliminar(err.message);
      setEliminando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!vehiculo) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vehículo no encontrado</p>
          <Link href="/vehiculos" className="text-gray-900 underline hover:text-gray-700">Volver al listado</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/vehiculos" className="text-gray-500 hover:text-gray-900 text-sm">← Volver</Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{vehiculo.nombre}</h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoBadge(vehiculo.estado)}`}>
                <span>{getEstadoIcon(vehiculo.estado)}</span>
                {getEstadoLabel(vehiculo.estado)}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">{vehiculo.placa}</span>
              {vehiculo.marca && <span>🏭 {vehiculo.marca} {vehiculo.modelo}</span>}
              {vehiculo.anio && <span>📅 {vehiculo.anio}</span>}
              {vehiculo.color && <span>🎨 {vehiculo.color}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push(`/vehiculos/${params.id}/editar`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
              ✏️ Editar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 px-4 min-w-max">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <span className="mr-2">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'general' && <TabGeneral vehiculo={vehiculo} />}
          {activeTab === 'documentos' && <TabDocumentos vehiculoId={params.id} isAdmin={isAdmin} />}
          {activeTab === 'mantenimiento' && <TabMantenimiento vehiculoId={params.id} vehiculo={vehiculo} onUpdate={cargarVehiculo} isAdmin={isAdmin} />}
          {activeTab === 'historial' && <TabHistorial vehiculoId={params.id} isAdmin={isAdmin} />}
        </div>
      </div>

      {/* Eliminar (solo admin) */}
      {isAdmin && (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Zona de Peligro</h2>
            <p className="text-sm text-gray-500">Eliminar este vehículo permanentemente</p>
          </div>
        </div>
        {errorEliminar && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{errorEliminar}</p>
          </div>
        )}
        {!showEliminar ? (
          <button onClick={() => setShowEliminar(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition">
            <Trash2 className="w-4 h-4" /> Eliminar Vehículo
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-red-800 font-medium">¿Estás seguro de eliminar <strong>{vehiculo.nombre}</strong> ({vehiculo.placa})?</p>
            <p className="text-xs text-red-600">Esta acción NO se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={handleEliminar} disabled={eliminando}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button onClick={() => { setShowEliminar(false); setErrorEliminar(null); }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
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

function TabGeneral({ vehiculo }) {
  const Row = ({ label, value }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || 'N/A'}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General</h3>
        <dl>
          <Row label="Placa" value={vehiculo.placa} />
          <Row label="Nombre" value={vehiculo.nombre} />
          <Row label="Marca" value={vehiculo.marca} />
          <Row label="Modelo" value={vehiculo.modelo} />
          <Row label="Año" value={vehiculo.anio} />
          <Row label="Color" value={vehiculo.color} />
          <Row label="Tipo" value={vehiculo.tipo} />
        </dl>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Técnica</h3>
        <dl>
          <Row label="Estado" value={
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${getEstadoBadge(vehiculo.estado)}`}>
              {getEstadoLabel(vehiculo.estado)}
            </span>
          } />
          <Row label="Número de Motor" value={vehiculo.numero_motor} />
          <Row label="Número de Chasis" value={vehiculo.numero_chasis} />
          <Row label="Kilometraje" value={vehiculo.kilometraje_actual ? `${Number(vehiculo.kilometraje_actual).toLocaleString()} km` : null} />
          <Row label="Creado" value={formatearFecha(vehiculo.created_at)} />
        </dl>
      </div>
    </div>
  );
}
