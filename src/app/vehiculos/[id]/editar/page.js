'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/context/RoleContext';
import { ArrowLeft, Save, Loader2, AlertTriangle, Car } from 'lucide-react';

import { ESTADOS_VEHICULO_LIST as ESTADOS_VEHICULO } from '@/lib/utils/vehiculo';

export default function EditarVehiculoPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin, loading: roleLoading } = useRole();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    placa: '', nombre: '', marca: '', modelo: '', anio: '',
    color: '', tipo: 'particular', numero_motor: '', numero_chasis: '',
    estado: 'operativo', kilometraje_actual: '',
  });

  // Redirect si no es admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      router.replace('/vehiculos');
    }
  }, [roleLoading, isAdmin, router]);

  if (roleLoading) return <div className="p-8 text-center text-gray-500">Verificando permisos...</div>;
  if (!isAdmin) return null;

  useEffect(() => {
    if (params.id) cargarVehiculo();
  }, [params.id]);

  async function cargarVehiculo() {
    try {
      setCargando(true);
      const { data, error } = await supabase.from('vehiculos').select('*').eq('id', params.id).single();
      if (error) throw error;
      if (!data) { router.push('/vehiculos'); return; }
      setFormData({
        placa: data.placa || '',
        nombre: data.nombre || '',
        marca: data.marca || '',
        modelo: data.modelo || '',
        anio: data.anio ? String(data.anio) : '',
        color: data.color || '',
        tipo: data.tipo || 'particular',
        numero_motor: data.numero_motor || '',
        numero_chasis: data.numero_chasis || '',
        estado: data.estado || 'operativo',
        kilometraje_actual: data.kilometraje_actual ? String(data.kilometraje_actual) : '',
      });
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const payload = {
        placa: formData.placa.trim().toUpperCase(),
        nombre: formData.nombre.trim(),
        marca: formData.marca || null,
        modelo: formData.modelo || null,
        anio: formData.anio ? parseInt(formData.anio) : null,
        color: formData.color || null,
        tipo: formData.tipo,
        numero_motor: formData.numero_motor || null,
        numero_chasis: formData.numero_chasis || null,
        estado: formData.estado,
        kilometraje_actual: formData.kilometraje_actual ? parseFloat(formData.kilometraje_actual) : null,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

      const { error: updateError } = await supabase
        .from('vehiculos')
        .update(payload)
        .eq('id', params.id);

      if (updateError) throw updateError;
      router.push(`/vehiculos/${params.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/vehiculos/${params.id}`} className="text-gray-500 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Vehículo</h1>
          <p className="text-sm text-gray-600">{formData.placa} — {formData.nombre}</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5" /> Información General
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
              <input type="text" name="placa" value={formData.placa} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input type="text" name="modelo" value={formData.modelo} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
              <input type="number" name="anio" value={formData.anio} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input type="text" name="color" value={formData.color} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={guardando}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href={`/vehiculos/${params.id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
