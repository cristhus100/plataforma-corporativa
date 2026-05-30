'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Upload, FileText, Download, Trash2, Calendar, AlertTriangle, X, Plus } from 'lucide-react';

export default function TabDocumentos({ maquinariaId, isAdmin = false }) {
  const supabase = createClient();
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
    noVence: false,
  });

  useEffect(() => {
    if (maquinariaId) cargarDatos();
  }, [maquinariaId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      const { data: tipos, error: tiposError } = await supabase
        .from('tipos_documentos_maquinaria')
        .select('id, nombre, requiere_vencimiento')
        .eq('activo', true)
        .order('nombre');

      if (tiposError) throw tiposError;
      setTiposDocumento(tipos || []);

      let docsData = [];
      const { data: docs, error: docsError } = await supabase
        .from('documentos_maquinaria')
        .select('*')
        .eq('maquinaria_id', maquinariaId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      if (docs && docs.length > 0) {
        const tiposIds = [...new Set(docs.map(d => d.tipo_documento_id))];
        const { data: tiposMap } = await supabase
          .from('tipos_documentos_maquinaria')
          .select('id, nombre, requiere_vencimiento')
          .in('id', tiposIds);
        const tipoMap = Object.fromEntries((tiposMap || []).map(t => [t.id, t]));
        docsData = docs.map(d => ({ ...d, tipos_documentos_maquinaria: tipoMap[d.tipo_documento_id] || null }));
      }

      setDocumentos(docsData);
    } catch (error) {
      console.error('Error cargando documentos:', error?.message || error);
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

    try {
      const fileExt = formData.archivo.name.split('.').pop();
      const fileName = `maquinaria/${maquinariaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-maquinaria')
        .upload(fileName, formData.archivo);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documentos_maquinaria')
        .insert([{
          maquinaria_id: maquinariaId,
          tipo_documento_id: parseInt(formData.tipo_documento_id),
          nombre_archivo: formData.archivo.name,
          ruta_archivo: fileName,
          tamano_bytes: formData.archivo.size,
          tipo_mime: formData.archivo.type,
          numero_documento: formData.numero_documento || null,
          fecha_emision: formData.fecha_emision || null,
          fecha_vencimiento: formData.noVence ? null : (formData.fecha_vencimiento || null),
          observaciones: formData.observaciones || null,
        }]);

      if (dbError) {
        await supabase.storage.from('documentos-maquinaria').remove([fileName]);
        throw dbError;
      }

      alert('Documento subido correctamente');
      setShowModal(false);
      setFormData({ tipo_documento_id: '', fecha_emision: '', fecha_vencimiento: '', numero_documento: '', observaciones: '', archivo: null, noVence: false });
      cargarDatos();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir documento: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDescargar = async (rutaArchivo) => {
    if (!rutaArchivo) return;
    try {
      const { data, error } = await supabase.storage
        .from('documentos-maquinaria')
        .createSignedUrl(rutaArchivo, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      alert('Error al descargar: ' + error.message);
    }
  };

  const handleEliminar = async (doc) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      if (doc.ruta_archivo) {
        await supabase.storage.from('documentos-maquinaria').remove([doc.ruta_archivo]);
      }
      const { error } = await supabase.from('documentos_maquinaria').delete().eq('id', doc.id);
      if (error) throw error;
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Documentos de la Maquinaria</h3>
          <p className="text-sm text-gray-500">{documentos.length} documento(s) registrado(s)</p>
        </div>
        {isAdmin && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Subir Documento
        </button>
        )}
      </div>

      {documentos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">No hay documentos registrados</p>
          <p className="text-sm text-gray-400 mt-1">Sube el primer documento usando el botón superior</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documentos.map((doc) => {
            const estadoVenc = calcularEstadoVencimiento(doc.fecha_vencimiento);
            const tipoNombre = doc.tipos_documentos_maquinaria?.nombre || 'Sin tipo';

            return (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <FileText className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-gray-900 font-medium">{tipoNombre}</h4>
                      {doc.numero_documento && (
                        <p className="text-sm text-gray-500 mt-1">N°: {doc.numero_documento}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {doc.fecha_emision && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Emitido: {new Date(doc.fecha_emision).toLocaleDateString('es-CO')}
                          </span>
                        )}
                        {doc.fecha_vencimiento ? (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString('es-CO')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Calendar size={12} />
                            No vence
                          </span>
                        )}
                      </div>
                      {estadoVenc ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mt-2 ${
                          estadoVenc.color === 'red'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : estadoVenc.color === 'yellow'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {estadoVenc.color !== 'green' && <AlertTriangle size={12} />}
                          {estadoVenc.texto} ({estadoVenc.dias} días)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mt-2 bg-gray-50 text-gray-500 border border-gray-200">
                          No vence
                        </span>
                      )}
                      {doc.observaciones && (
                        <p className="text-xs text-gray-400 mt-2 italic">{doc.observaciones}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDescargar(doc.ruta_archivo)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition" title="Descargar">
                      <Download size={16} />
                    </button>
                    {isAdmin && (
                    <button onClick={() => handleEliminar(doc)}
                      className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-600 transition" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Subir Documento</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento *</label>
                <select required value={formData.tipo_documento_id}
                  onChange={(e) => setFormData({ ...formData, tipo_documento_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Seleccione un tipo</option>
                  {tiposDocumento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Documento</label>
                <input type="text" value={formData.numero_documento}
                  onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Opcional" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión</label>
                  <input type="date" value={formData.fecha_emision}
                    onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
                  <div className="space-y-2">
                    <input type="date" value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                      disabled={formData.noVence}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${formData.noVence ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300'}`} />
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={formData.noVence}
                        onChange={(e) => setFormData({ ...formData, noVence: e.target.checked, fecha_vencimiento: e.target.checked ? '' : formData.fecha_vencimiento })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs text-gray-500">No vence</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo * (máx. 10MB)</label>
                <input type="file" required onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium file:cursor-pointer hover:file:bg-blue-700" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium" disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Subiendo...</>
                  ) : (
                    <><Upload size={16} /> Subir</>
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
