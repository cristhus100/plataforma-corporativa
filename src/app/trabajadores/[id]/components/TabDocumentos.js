'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  Upload, FileText, Download, Trash2, AlertTriangle, 
  CheckCircle, Clock, X, Loader2, Calendar, Eye
} from 'lucide-react';

export default function TabDocumentos({ trabajadorId }) {
  const [documentos, setDocumentos] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    tipo_documento_id: '',
    archivo: null,
    fecha_emision: '',
    fecha_vencimiento: '',
    observaciones: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch tipos de documento
    const { data: tipos } = await supabase
      .from('tipos_documentos_trabajador')
      .select('*')
      .order('nombre');
    
    // Fetch documentos del trabajador
    const { data: docs } = await supabase
      .from('documentos_trabajadores')
      .select(`
        *,
        tipos_documentos_trabajador (
          id, nombre, descripcion, requiere_vencimiento
        )
      `)
      .eq('trabajador_id', trabajadorId)
      .order('created_at', { ascending: false });
    
    setTiposDocumento(tipos || []);
    setDocumentos(docs || []);
    setLoading(false);
  }, [trabajadorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 10 * 1024 * 1024) {
      alert('El archivo no puede superar los 10MB');
      return;
    }
    setFormData({ ...formData, archivo: file });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.archivo || !formData.tipo_documento_id) {
      alert('Selecciona un tipo de documento y un archivo');
      return;
    }

    setUploading(true);
    try {
      // 1. Subir archivo a Storage
      const fileExt = formData.archivo.name.split('.').pop();
      const fileName = `${Date.now()}_${formData.archivo.name}`;
      const filePath = `${trabajadorId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-trabajadores')
        .upload(filePath, formData.archivo);

      if (uploadError) throw uploadError;

      // 2. Insertar registro en la tabla
      const { error: insertError } = await supabase
        .from('documentos_trabajadores')
        .insert({
          trabajador_id: trabajadorId,
          tipo_documento_id: formData.tipo_documento_id,
          nombre_archivo: formData.archivo.name,
          ruta_archivo: filePath,
          tamano_bytes: formData.archivo.size,
          tipo_mime: formData.archivo.type,
          fecha_emision: formData.fecha_emision || null,
          fecha_vencimiento: formData.fecha_vencimiento || null,
          observaciones: formData.observaciones || null
        });

      if (insertError) throw insertError;

      // 3. Registrar en historial
      const tipoDoc = tiposDocumento.find(t => t.id == formData.tipo_documento_id);
      await supabase.from('historial_trabajadores').insert({
        trabajador_id: trabajadorId,
        tipo_evento: 'documento_subido',
        titulo: `Documento subido: ${tipoDoc?.nombre || 'Documento'}`,
        descripcion: `Se subió el archivo ${formData.archivo.name}`
      });

      // Reset y refresh
      setFormData({
        tipo_documento_id: '',
        archivo: null,
        fecha_emision: '',
        fecha_vencimiento: '',
        observaciones: ''
      });
      setShowUploadModal(false);
      fetchData();
    } catch (error) {
      console.error('Error al subir:', error);
      alert('Error al subir el documento: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-trabajadores')
        .createSignedUrl(doc.ruta_archivo, 60);
      
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      alert('Error al descargar: ' + error.message);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`¿Eliminar el documento "${doc.nombre_archivo}"?`)) return;

    try {
      // Eliminar de storage
      await supabase.storage
        .from('documentos-trabajadores')
        .remove([doc.ruta_archivo]);

      // Eliminar de la tabla
      await supabase
        .from('documentos_trabajadores')
        .delete()
        .eq('id', doc.id);

      // Registrar en historial
      await supabase.from('historial_trabajadores').insert({
        trabajador_id: trabajadorId,
        tipo_evento: 'documento_eliminado',
        titulo: `Documento eliminado: ${doc.tipos_documentos_trabajador?.nombre}`,
        descripcion: `Se eliminó el archivo ${doc.nombre_archivo}`
      });

      fetchData();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;
  };

  const getEstadoBadge = (estado) => {
    const config = {
      vigente: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30', icon: CheckCircle, label: 'Vigente' },
      por_vencer: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30', icon: Clock, label: 'Por vencer' },
      vencido: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30', icon: AlertTriangle, label: 'Vencido' },
      archivado: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30', icon: FileText, label: 'Archivado' }
    };
    const c = config[estado] || config.vigente;
    const Icon = c.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-yellow-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Documentos del Trabajador</h3>
          <p className="text-sm text-gray-400 mt-1">
            {documentos.length} {documentos.length === 1 ? 'documento' : 'documentos'} registrado{documentos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
        >
          <Upload size={18} />
          Subir Documento
        </button>
      </div>

      {/* Lista de documentos */}
      {documentos.length === 0 ? (
        <div className="bg-[#212121] border border-gray-800 rounded-xl p-12 text-center">
          <FileText className="mx-auto text-gray-600 mb-3" size={48} />
          <p className="text-gray-400">No hay documentos cargados</p>
          <p className="text-sm text-gray-500 mt-1">Sube el primer documento para comenzar</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="bg-[#212121] border border-gray-800 rounded-xl p-4 hover:border-yellow-500/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <FileText className="text-yellow-500" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-white truncate">
                        {doc.tipos_documentos_trabajador?.nombre || 'Documento'}
                      </h4>
                      {getEstadoBadge(doc.estado)}
                    </div>
                    <p className="text-sm text-gray-400 truncate">{doc.nombre_archivo}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span>{formatBytes(doc.tamano_bytes)}</span>
                      {doc.fecha_vencimiento && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-CO')}
                        </span>
                      )}
                      <span>Subido: {new Date(doc.created_at).toLocaleDateString('es-CO')}</span>
                    </div>
                    {doc.observaciones && (
                      <p className="text-xs text-gray-400 mt-2 italic">{doc.observaciones}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                    title="Ver/Descargar"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Subir Nuevo Documento</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* Tipo de documento */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Documento <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo_documento_id}
                  onChange={(e) => setFormData({ ...formData, tipo_documento_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-[#212121] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposDocumento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Archivo */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Archivo <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full px-3 py-2 bg-[#212121] border border-gray-700 rounded-lg text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-yellow-500 file:text-black file:font-semibold file:cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC (máx. 10MB)</p>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_emision}
                    onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                    className="w-full px-3 py-2 bg-[#212121] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-[#212121] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#212121] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-yellow-500 resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 bg-[#212121] border border-gray-700 hover:border-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-semibold rounded-lg transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Subir
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
