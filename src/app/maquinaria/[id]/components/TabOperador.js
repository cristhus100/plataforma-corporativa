'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getNombreCompleto } from '@/lib/utils/trabajador';
import { User, Search, X, Check, UserCheck, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function TabOperador({ maquinaria, onUpdate, isAdmin = false }) {
  const { addToast } = useToast();
  const supabase = createClient();
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [asignando, setAsignando] = useState(false);
  const [buscando, setBuscando] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [operador, setOperador] = useState(null);

  const operadorActual = maquinaria.operador_id;

  useEffect(() => {
    if (operadorActual) {
      cargarOperador();
    }
    setLoading(false);
  }, [operadorActual]);

  const cargarOperador = async () => {
    try {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('id, cedula, primer_apellido, segundo_apellido, nombre, cargo_legacy, cargo:cargos(nombre)')
        .eq('id', operadorActual)
        .single();

      if (!error && data) setOperador(data);
    } catch (e) {
      // ignore
    }
  };

  const buscarTrabajadores = async (termino) => {
    if (!termino.trim()) {
      setTrabajadores([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('id, cedula, primer_apellido, segundo_apellido, nombre, cargo_legacy, cargo:cargos(nombre)')
        .or(`nombre.ilike.%${termino}%,primer_apellido.ilike.%${termino}%,segundo_apellido.ilike.%${termino}%,cedula.ilike.%${termino}%`)
        .eq('activo', true)
        .limit(10);

      if (!error) setTrabajadores(data || []);
    } catch (e) {
      // ignore
    }
  };

  const asignarOperador = async (trabajadorId) => {
    setAsignando(true);
    try {
      const { error } = await supabase
        .from('maquinaria')
        .update({
          operador_id: trabajadorId,
          operador_asignado_desde: new Date().toISOString().split('T')[0],
        })
        .eq('id', maquinaria.id);

      if (error) throw error;
      setShowSelector(false);
      setBuscando('');
      if (onUpdate) onUpdate();
    } catch (error) {
      addToast('Error al asignar operador: ' + error.message, { type: 'error' });
    } finally {
      setAsignando(false);
    }
  };

  const desasignarOperador = async () => {
    setAsignando(true);
    try {
      await supabase.from('maquinaria').update({ operador_id: null, operador_asignado_desde: null }).eq('id', maquinaria.id);
      setOperador(null);
      addToast('Operador desasignado', { type: 'success' });
      if (onUpdate) onUpdate();
    } catch (error) {
      addToast('Error al desasignar: ' + error.message, { type: 'error' });
    } finally {
      setAsignando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Operador Asignado</h3>
        <p className="text-sm text-gray-500 mb-4">Asigna un trabajador como operador de esta maquinaria</p>
      </div>

      {operador ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-3 rounded-full">
                <UserCheck className="text-green-600" size={28} />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{getNombreCompleto(operador)}</h4>
                <p className="text-sm text-gray-500">
                  {operador.cargo?.nombre || operador.cargo_legacy || 'Sin cargo'}
                </p>
                {operador.cedula && (
                  <p className="text-sm font-mono text-gray-400 mt-1">CC {operador.cedula}</p>
                )}
                {maquinaria.operador_asignado_desde && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Calendar size={12} />
                    Asignado desde {new Date(maquinaria.operador_asignado_desde).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>
            </div>
            {isAdmin && (
            <div className="flex gap-2">
              <button onClick={() => setShowSelector(true)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                Cambiar
              </button>
              <button onClick={desasignarOperador} disabled={asignando}
                className="px-3 py-1.5 border border-red-300 rounded-lg text-sm text-red-600 hover:bg-red-50 transition disabled:opacity-50">
                {asignando ? '...' : 'Desasignar'}
              </button>
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <User className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">Sin operador asignado</p>
          <p className="text-sm text-gray-400 mt-1">Asigna un trabajador como operador de esta máquina</p>
          {isAdmin && (
          <button onClick={() => setShowSelector(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <UserCheck size={16} />
            Asignar Operador
          </button>
        )}
        </div>
      )}

      {/* Selector de trabajadores */}
      {showSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Seleccionar Operador</h3>
              <button onClick={() => { setShowSelector(false); setBuscando(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nombre o cédula..."
                  value={buscando}
                  onChange={(e) => {
                    setBuscando(e.target.value);
                    buscarTrabajadores(e.target.value);
                  }}
                  autoFocus
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {buscando.trim() && trabajadores.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-500">No se encontraron trabajadores</p>
              ) : !buscando.trim() ? (
                <p className="text-center py-8 text-sm text-gray-400">Escribe para buscar trabajadores activos</p>
              ) : (
                <div className="space-y-1">
                  {trabajadores.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => asignarOperador(t.id)}
                      disabled={asignando}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                    >
                      <div className="bg-gray-100 p-2 rounded-full">
                        <User size={18} className="text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{getNombreCompleto(t)}</p>
                        <p className="text-xs text-gray-500">
                          {t.cargo?.nombre || t.cargo_legacy || 'Sin cargo'}
                          {t.cedula && ` · CC ${t.cedula}`}
                        </p>
                      </div>
                      {asignando ? (
                        <Loader2 className="animate-spin text-blue-600" size={16} />
                      ) : (
                        <Check className="text-gray-300" size={18} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
