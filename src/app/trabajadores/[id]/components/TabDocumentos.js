'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Upload, FileText, Download, Trash2, Calendar, AlertTriangle, X, Plus } from 'lucide-react';

export default function TabDocumentos({ trabajadorId }) {
  const [documentos, setDocumentos] = useState([]);
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    tipo_documento_id: '',
    fecha_emision: '',
    fecha_vencimiento: '',
    numero_documento: '',
    observaciones: '',
    archivo: null,
  });

  useEffect(() => {
    if (trabajadorId) {
      cargarDatos();
    }
  }, [trabajadorId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar tipos de documento (sin filtro activo por si la columna falla)
      const { data: tipos, error: tiposError } = await supabase
        .from('tipos_documentos_trabajador')
        .select('id, nombre, requiere_vencimiento, obligatorio')
        .eq('activo', true)
        .order('nombre');

      if (tiposError) {
        console.error('❌ Error cargando tipos:', tiposError);
        throw tiposError;
      }

      console.log('✅ Tipos de documento cargados:', tipos?.length || 0);
      setTiposDocumento(tipos || []);

      // Cargar documentos del trabajador con JOIN
      const { data: docs, error: docsError } = await supabase
        .from('documentos_trabajadores')
        .select(`
          *,
          tipos_documentos_trabajador!tipo_documento_id (
            id,
            nombre,
            requiere_vencimiento
          )
        `)
        .eq('trabajador_id', trabajadorId)
        .order('created_at', { ascending: false });

      if (docsError) {
        console.error('❌ Error cargando documentos:', docsError);
        throw docsError;
      }

      console.log('✅ Documentos cargados:', docs?.length || 0);
      setDocumentos(docs || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar documentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo no puede superar los 10MB');
        return;
      }
      setFormData({ ...formData, archivo: file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.archivo || !formData.tipo_documento_id) {
      alert('Selecciona un tipo de documento y un archivo');
      return;
    }

    setUploading(true);
    let filePath = null;

    try {
      // 1. Subir archivo a Storage
      const fileExt = formData.archivo.name.split('.').pop();
      const fileName = `${trabajadorId}/${Date.now()}.${fileExt}`;
      filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('documentos-trabajadores')
        .upload(fileName, formData.archivo);

      if (uploadError) throw uploadError;

      // 2. Insertar registro en BD
      const { error: dbError } = await supabase
        .from('documentos_trabajadores')
        .insert([{
          trabajador_id: trabajadorId,
          tipo_documento_id: parseInt(formData.tipo_documento_id),
          numero_documento: formData.numero_documento || null,
          fecha_emision: formData.fecha_emision || null,
          fecha_vencimiento: formData.fecha_vencimiento || null,
          archivo_url: fileName,
          observaciones: formData.observaciones || null,
        }]);

      if (dbError) {
        // Rollback: eliminar archivo si falla la BD
        await supabase.storage.from('documentos-trabajadores').remove([fileName]);
        throw dbError;
      }

      alert('✅ Documento subido correctamente');
      setShowModal(false);
      setFormData({
        tipo_documento_id: '',
        fecha_emision: '',
        fecha_vencimiento: '',
        numero_documento: '',
        observaciones: '',
        archivo: null,
      });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir documento: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDescargar = async (archivoUrl) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos-trabajadores')
        .createSignedUrl(archivoUrl, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      alert('Error al descargar: ' + error.message);
    }
  };

  const handleEliminar = async (doc) => {
    if (!confirm('¿Eliminar este documento?')) return;

    try {
      // Eliminar archivo de storage
      if (doc.archivo_url) {
        await supabase.storage
          .from('documentos-trabajadores')
          .remove([doc.archivo_url]);
      }

      // Eliminar registro de BD
      const { error } = await supabase
        .from('documentos_trabajadores')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      alert('✅ Documento eliminado');
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const calcularEstadoVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return { color: 'red', texto: 'Vencido', dias: Math.abs(diasRestantes) };
    if (diasRestantes <= 30) return { color: 'yellow', texto: 'Por vencer', dias: diasRestantes };
    return { color: 'green', texto: 'Vigente', dias: diasRestantes };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Documentos del Trabajador</h3>
          <p className="text-sm text-gray-400">{documentos.length} documento(s) registrado(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-500 transition"
        >
          <Plus size={18} />
          Subir Documento
        </button>
      </div>

      {/* Lista de documentos */}
      {documentos.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <FileText className="mx-auto text-gray-600 mb-3" size={48} />
          <p className="text-gray-400">No hay documentos registrados</p>
          <p className="text-sm text-gray-500 mt-1">Sube el primer documento usando el botón superior</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documentos.map((doc) => {
            const estadoVenc = calcularEstadoVencimiento(doc.fecha_vencimiento);
            const tipoNombre = doc.tipos_documentos_trabajador?.nombre || 'Sin tipo';

            return (
              <div
                key={doc.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-yellow-400/50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-yellow-400/10 p-2 rounded-lg">
                      <FileText className="text-yellow-400" size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{tipoNombre}</h4>
                      {doc.numero_documento && (
                        <p className="text-sm text-gray-400 mt-1">N°: {doc.numero_documento}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                        {doc.fecha_emision && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Emitido: {new Date(doc.fecha_emision).toLocaleDateString('es-CO')}
                          </span>
                        )}
                        {doc.fecha_vencimiento && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-CO')}
                          </span>
                        )}
                      </div>
                      {estadoVenc && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mt-2 ${
                            estadoVenc.color === 'red'
                              ? 'bg-red-500/20 text-red-400'
                              : estadoVenc.color === 'yellow'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {estadoVenc.color !== 'green' && <AlertTriangle size={12} />}
                          {estadoVenc.texto} ({estadoVenc.dias} días)
                        </span>
                      )}
                      {doc.observaciones && (
                        <p className="text-xs text-gray-500 mt-2 italic">{doc.observaciones}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDescargar(doc.archivo_url)}
                      className="p-2 bg-gray-700 text-yellow-400 rounded-lg hover:bg-gray-600 transition"
                      title="Descargar"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleEliminar(doc)}
                      className="p-2 bg-gray-700 text-red-400 rounded-lg hover:bg-gray-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Subir Documento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Subir Documento</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tipo de Documento *
                </label>
                <select
                  required
                  value={formData.tipo_documento_id}
                  onChange={(e) => setFormData({ ...formData, tipo_documento_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposDocumento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Número de Documento
                </label>
                <input
                  type="text"
                  value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                  placeholder="Opcional"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha Emisión
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_emision}
                    onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Fecha Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Archivo * (máx. 10MB)
                </label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-yellow-400 file:text-black file:font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg font-medium hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
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
