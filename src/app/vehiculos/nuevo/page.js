'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { crearVehiculo } from '@/actions';
import { useRole } from '@/context/RoleContext';
import { ArrowLeft, Save, Loader2, AlertTriangle, Upload, X, ImageOff, Car } from 'lucide-react';

import { ESTADOS_VEHICULO_LIST as ESTADOS_VEHICULO } from '@/lib/utils/vehiculo';

export default function NuevoVehiculoPage() {
  const supabase = createClient();
  const router = useRouter();
  const { isAdmin, loading: roleLoading } = useRole();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [success, setSuccess] = useState(false);

  // Redirect si no es admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/vehiculos');
    }
  }, [roleLoading, isAdmin, router]);

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>;
  if (!isAdmin) return null;

  const [formData, setFormData] = useState({
    placa: '', nombre: '', marca: '', modelo: '', anio: '',
    color: '', tipo: 'particular', numero_motor: '', numero_chasis: '',
    estado: 'operativo', kilometraje_actual: '',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La foto no puede superar los 5MB'); return; }
    const ext = file.name.split('.').pop().toLowerCase();
    const tipo = file.type || '';
    if (tipo === 'image/heic' || tipo === 'image/heif' || ext === 'heic' || ext === 'heif') {
      setError('Formato HEIC no soportado. Usá JPG o PNG.');
      e.target.value = '';
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    if (!formData.placa.trim() || !formData.nombre.trim()) {
      setError('Placa y nombre son obligatorios');
      return;
    }

    try {
      setGuardando(true);

      // Subir foto desde el cliente (más simple)
      let fotoUrl = null;
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop();
        const fileName = `${formData.placa}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-maquinaria')
          .upload(fileName, fotoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('fotos-maquinaria').getPublicUrl(fileName);
          fotoUrl = publicUrl;
        } else {
          console.warn('Error foto:', uploadError.message);
        }
      }

      // Enviar datos al servidor para INSERT seguro (Server Action)
      const result = await crearVehiculo({
        placa: formData.placa.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        marca: formData.marca,
        modelo: formData.modelo,
        anio: formData.anio,
        color: formData.color,
        tipo: formData.tipo,
        numero_motor: formData.numero_motor,
        numero_chasis: formData.numero_chasis,
        estado: formData.estado,
        kilometraje_actual: formData.kilometraje_actual,
        foto_url: fotoUrl,
      })

      if (result.error) throw new Error(result.error);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => router.push(`/vehiculos/${result.id}`), 1000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vehículo registrado</h2>
          <p className="text-gray-500">Redirigiendo al detalle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/vehiculos" className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Vehículo</h1>
          <p className="text-sm text-gray-600">Registra un nuevo vehículo en la plataforma</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Foto del Vehículo</label>
          <div className="flex items-center gap-4">
            {fotoPreview ? (
              <div className="relative">
                <img src={fotoPreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                <button type="button" onClick={() => { setFotoFile(null); setFotoPreview(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                <ImageOff className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <label className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition cursor-pointer">
              <Upload className="w-4 h-4 inline mr-1.5" /> Subir foto
              <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5" /> Información Básica
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
              <input type="text" name="placa" value={formData.placa} onChange={handleChange}
                placeholder="ABC-123" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                placeholder="Toyota Hilux" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleChange}
                placeholder="Toyota" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange}
                placeholder="Hilux" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input type="number" name="anio" value={formData.anio} onChange={handleChange}
                placeholder="2023" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange}
                placeholder="Blanco" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="particular">Particular</option>
                <option value="camioneta">Camioneta</option>
                <option value="camion">Camión</option>
                <option value="moto">Moto</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                {ESTADOS_VEHICULO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Técnica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Motor</label>
              <input type="text" name="numero_motor" value={formData.numero_motor} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Chasis</label>
              <input type="text" name="numero_chasis" value={formData.numero_chasis} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje Actual</label>
              <input type="number" name="kilometraje_actual" value={formData.kilometraje_actual} onChange={handleChange}
                placeholder="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={guardando}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? 'Guardando...' : 'Guardar Vehículo'}
          </button>
          <Link href="/vehiculos"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
