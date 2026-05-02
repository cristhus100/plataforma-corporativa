'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import {
  getEstadoBadge,
  getEstadoLabel,
  getEstadoIcon,
  formatearFecha,
  formatearMoneda,
  calcularAntiguedad,
} from '@/lib/utils/maquinaria';

const TABS = [
  { id: 'general', label: 'Información General', icon: '📋' },
  { id: 'documentos', label: 'Documentos', icon: '📄' },
  { id: 'fotos', label: 'Fotos', icon: '📸' },
  { id: 'operador', label: 'Operador', icon: '👷' },
  { id: 'historial', label: 'Historial', icon: '🔧' },
];

export default function MaquinariaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [maquinaria, setMaquinaria] = useState(null);
  const [tipoMaquinaria, setTipoMaquinaria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (params.id) {
      cargarMaquinaria();
    }
  }, [params.id]);

  const cargarMaquinaria = async () => {
    try {
      setLoading(true);
      
      const { data: maq, error: errMaq } = await supabase
        .from('maquinaria')
        .select('*')
        .eq('id', params.id)
        .single();

      if (errMaq) throw errMaq;
      setMaquinaria(maq);

      if (maq?.tipo_maquinaria_id) {
        const { data: tipo } = await supabase
          .from('tipos_maquinaria')
          .select('*')
          .eq('id', maq.tipo_maquinaria_id)
          .single();
        setTipoMaquinaria(tipo);
      }
    } catch (error) {
      console.error('Error cargando maquinaria:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (!maquinaria) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Maquinaria no encontrada</p>
          <Link 
            href="/maquinaria"
            className="text-gray-900 underline hover:text-gray-700"
          >
            Volver al listado
          </Link>
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
              <Link 
                href="/maquinaria"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                ← Volver
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {maquinaria.nombre}
              </h1>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoBadge(maquinaria.estado)}`}>
                <span>{getEstadoIcon(maquinaria.estado)}</span>
                {getEstadoLabel(maquinaria.estado)}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {maquinaria.codigo_interno}
              </span>
              {tipoMaquinaria && (
                <span>📦 {tipoMaquinaria.nombre}</span>
              )}
              {maquinaria.marca && (
                <span>🏭 {maquinaria.marca} {maquinaria.modelo}</span>
              )}
              {maquinaria.año && (
                <span>📅 {maquinaria.año}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/maquinaria/${params.id}/editar`)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              ✏️ Editar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 px-4 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general' && <TabGeneral maquinaria={maquinaria} tipo={tipoMaquinaria} />}
          {activeTab === 'documentos' && <TabDocumentos maquinariaId={params.id} />}
          {activeTab === 'fotos' && <TabFotos maquinariaId={params.id} />}
          {activeTab === 'operador' && <TabOperador maquinaria={maquinaria} onUpdate={cargarMaquinaria} />}
          {activeTab === 'historial' && <TabHistorial maquinariaId={params.id} />}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TAB: INFORMACIÓN GENERAL
// ============================================
function TabGeneral({ maquinaria, tipo }) {
  const InfoRow = ({ label, value }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || 'N/A'}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
        <dl>
          <InfoRow label="Código Interno" value={maquinaria.codigo_interno} />
          <InfoRow label="Nombre" value={maquinaria.nombre} />
          <InfoRow label="Tipo" value={tipo?.nombre} />
          <InfoRow label="Marca" value={maquinaria.marca} />
          <InfoRow label="Modelo" value={maquinaria.modelo} />
          <InfoRow label="Año" value={maquinaria.año} />
          <InfoRow label="Serial / VIN" value={maquinaria.serial} />
          <InfoRow label="Placa" value={maquinaria.placa} />
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Operativa</h3>
        <dl>
          <InfoRow 
            label="Estado" 
            value={
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${getEstadoBadge(maquinaria.estado)}`}>
                {getEstadoLabel(maquinaria.estado)}
              </span>
            } 
          />
          <InfoRow label="Ubicación Actual" value={maquinaria.ubicacion_actual} />
          <InfoRow label="Horómetro" value={maquinaria.horometro ? `${maquinaria.horometro} hrs` : null} />
          <InfoRow label="Kilometraje" value={maquinaria.kilometraje ? `${maquinaria.kilometraje} km` : null} />
          <InfoRow label="Fecha de Compra" value={formatearFecha(maquinaria.fecha_compra)} />
          <InfoRow label="Valor de Compra" value={maquinaria.valor_compra ? formatearMoneda(maquinaria.valor_compra) : null} />
          <InfoRow 
            label="Antigüedad" 
            value={maquinaria.fecha_compra ? `${calcularAntiguedad(maquinaria.fecha_compra)} años` : null} 
          />
          <InfoRow label="Observaciones" value={maquinaria.observaciones} />
        </dl>
      </div>
    </div>
  );
}

// ============================================
// TAB: DOCUMENTOS
// ============================================
function TabDocumentos({ maquinariaId }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">📄</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentos</h3>
      <p className="text-gray-600 mb-4">
        Aquí podrás gestionar SOAT, técnico-mecánica, pólizas y demás documentos
      </p>
      <p className="text-sm text-gray-500">Módulo en desarrollo</p>
    </div>
  );
}

// ============================================
// TAB: FOTOS
// ============================================
function TabFotos({ maquinariaId }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">📸</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Galería de Fotos</h3>
      <p className="text-gray-600 mb-4">
        Aquí podrás subir y visualizar fotografías de la maquinaria
      </p>
      <p className="text-sm text-gray-500">Módulo en desarrollo</p>
    </div>
  );
}

// ============================================
// TAB: OPERADOR
// ============================================
function TabOperador({ maquinaria, onUpdate }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">👷</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Operador Asignado</h3>
      <p className="text-gray-600 mb-4">
        Aquí podrás asignar un trabajador como operador de esta maquinaria
      </p>
      <p className="text-sm text-gray-500">Módulo en desarrollo</p>
    </div>
  );
}

// ============================================
// TAB: HISTORIAL DE MANTENIMIENTO
// ============================================
function TabHistorial({ maquinariaId }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">🔧</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Historial de Mantenimiento</h3>
      <p className="text-gray-600 mb-4">
        Aquí podrás registrar y consultar mantenimientos preventivos y correctivos
      </p>
      <p className="text-sm text-gray-500">Módulo en desarrollo</p>
    </div>
  );
}
