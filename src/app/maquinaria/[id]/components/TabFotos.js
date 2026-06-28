'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Camera, X, Upload, Star, Trash2, ImageOff, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function TabFotos({ maquinariaId, isAdmin = false }) {
  const { addToast, confirm } = useToast();
  const supabase = createClient();
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  useEffect(() => {
    if (maquinariaId) cargarFotos();
  }, [maquinariaId]);

  const getPublicUrl = useCallback((ruta) => {
    if (!ruta) return null;
    const { data } = supabase.storage.from('fotos-maquinaria').getPublicUrl(ruta);
    return data?.publicUrl;
  }, [supabase]);

  const cargarFotos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fotos_maquinaria')
        .select('*')
        .eq('maquinaria_id', maquinariaId)
        .order('es_principal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFotos(data || []);
    } catch (error) {
      console.error('Error cargando fotos:', error);
      addToast('Error al cargar fotos', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `maquinaria/${maquinariaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('fotos-maquinaria')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const esPrimera = fotos.length === 0;

      const { error: dbError } = await supabase
        .from('fotos_maquinaria')
        .insert([{
          maquinaria_id: maquinariaId,
          ruta_archivo: fileName,
          nombre_original: selectedFile.name,
          descripcion: descripcion || null,
          es_principal: esPrimera,
        }]);

      if (dbError) {
        await supabase.storage.from('fotos-maquinaria').remove([fileName]);
        throw dbError;
      }

      setSelectedFile(null);
      setDescripcion('');
      setShowUpload(false);
      cargarFotos();
    } catch (error) {
      console.error('Error subiendo foto:', error);
      addToast('Error al subir foto: ' + error.message, { type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleEliminar = async (foto) => {
    const ok = await confirm('¿Eliminar esta foto?', { title: 'Eliminar foto', confirmText: 'Eliminar', variant: 'danger' });
    if (!ok) return;

    try {
      if (foto.ruta_archivo) {
        await supabase.storage.from('fotos-maquinaria').remove([foto.ruta_archivo]);
      }
      await supabase.from('fotos_maquinaria').delete().eq('id', foto.id);
      addToast('Foto eliminada', { type: 'success' });
      cargarFotos();
    } catch (error) {
      addToast('Error al eliminar foto: ' + error.message, { type: 'error' });
    }
  };

  const setPrincipal = async (fotoId) => {
    await supabase.from('fotos_maquinaria').update({ es_principal: false }).eq('maquinaria_id', maquinariaId);
    await supabase.from('fotos_maquinaria').update({ es_principal: true }).eq('id', fotoId);
    cargarFotos();
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Galería de Fotos</h3>
          <p className="text-sm text-gray-500">{fotos.length} foto(s)</p>
        </div>
        {isAdmin && (
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Camera size={16} />
          Agregar Foto
        </button>
        )}
      </div>

      {fotos.length === 0 && !showUpload ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <ImageOff className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">No hay fotos registradas</p>
          <p className="text-sm text-gray-400 mt-1">Agrega la primera foto usando el botón superior</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {fotos.map((foto) => {
            const url = getPublicUrl(foto.ruta_archivo);
            return (
              <div key={foto.id} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden">
                {url ? (
                  <img
                    src={url}
                    alt={foto.descripcion || 'Foto maquinaria'}
                    className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition"
                    onClick={() => setFotoAmpliada(url)}
                  />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-gray-100">
                    <ImageOff className="text-gray-400" size={32} />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  {!foto.es_principal && (
                    <button onClick={() => setPrincipal(foto.id)}
                      className="p-1.5 bg-white rounded-full shadow hover:bg-yellow-50" title="Marcar como principal">
                      <Star size={14} className="text-gray-400 hover:text-yellow-500" />
                    </button>
                  )}
                  {isAdmin && (
                  <button onClick={() => handleEliminar(foto)}
                    className="p-1.5 bg-white rounded-full shadow hover:bg-red-50" title="Eliminar">
                    <Trash2 size={14} className="text-gray-500 hover:text-red-600" />
                  </button>
                )}
                </div>
                {foto.es_principal && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded shadow">
                      <Star size={10} /> Principal
                    </span>
                  </div>
                )}
                {foto.descripcion && (
                  <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-600 truncate">{foto.descripcion}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Upload */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Agregar Foto</h3>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar imagen</label>
                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium file:cursor-pointer hover:file:bg-blue-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Vista lateral derecha"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              {selectedFile && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  Archivo: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowUpload(false); setSelectedFile(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                  Cancelar
                </button>
                <button onClick={handleUpload} disabled={!selectedFile || uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? (
                    <><Loader2 className="animate-spin" size={16} /> Subiendo...</>
                  ) : (
                    <><Upload size={16} /> Subir</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal imagen ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-3xl w-full">
            <img src={fotoAmpliada} alt="Foto ampliada" className="w-full rounded-lg" />
            <button onClick={() => setFotoAmpliada(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
