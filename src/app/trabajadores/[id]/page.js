'use client';

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getNombreCompleto, ESTADOS_TRABAJADOR } from '@/lib/utils/trabajador';
import { useRole } from '@/context/RoleContext';
import TabDocumentos from './components/TabDocumentos';

const TABS = [
  { id: 'informacion', label: 'Información Personal' },
  { id: 'laboral', label: 'Información Laboral' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'historial', label: 'Historial' },
];

export default function DetalleTrabajadorPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { isAdmin } = useRole();
  const trabajadorId = params.id;

  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabActivo, setTabActivo] = useState('informacion');

  // Estados para eliminación
  const [mostrarModal, setMostrarModal] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState(null);
  const [confirmacionTexto, setConfirmacionTexto] = useState('');

  useEffect(() => {
    if (trabajadorId) {
      cargarTrabajador();
    }
  }, [trabajadorId]);

  const cargarTrabajador = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trabajadores')
        .select(`
          *,
          cargo:cargos(id, nombre),
          departamento_area:departamentos(id, nombre)
        `)
        .eq('id', trabajadorId)
        .single();

      if (error) throw error;
      setTrabajador(data);
    } catch (err) {
      console.error('Error cargando trabajador:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    setEliminando(true);
    setErrorEliminar(null);

    try {
      const { data: archivos } = await supabase.storage
        .from('documentos-trabajadores')
        .list(trabajadorId);

      if (archivos && archivos.length > 0) {
        const rutasArchivos = archivos.map(
          (archivo) => `${trabajadorId}/${archivo.name}`
        );
        await supabase.storage
          .from('documentos-trabajadores')
          .remove(rutasArchivos);
      }

      await supabase
        .from('historial_trabajadores')
        .delete()
        .eq('trabajador_id', trabajadorId);

      await supabase
        .from('documentos_trabajadores')
        .delete()
        .eq('trabajador_id', trabajadorId);

      const { error: errorDelete } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', trabajadorId);

      if (errorDelete) throw errorDelete;

      router.push('/trabajadores');
      router.refresh();
    } catch (err) {
      console.error('Error al eliminar:', err);
      setErrorEliminar('No se pudo eliminar: ' + err.message);
      setEliminando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No registrada';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatearMoneda = (valor) => {
    if (!valor) return 'No registrado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(valor);
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const calcularAntiguedad = (fechaIngreso) => {
    if (!fechaIngreso) return null;
    const hoy = new Date();
    const ingreso = new Date(fechaIngreso);
    const diffMs = hoy - ingreso;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const años = Math.floor(diffDias / 365);
    const meses = Math.floor((diffDias % 365) / 30);
    return { años, meses };
  };

  const getEstadoBadge = (estado) => {
    return ESTADOS_TRABAJADOR[estado] || ESTADOS_TRABAJADOR.inactivo;
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

  if (error || !trabajador) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Empleado no encontrado</p>
          <Link
            href="/trabajadores"
            className="text-gray-900 underline hover:text-gray-700"
          >
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const estado = getEstadoBadge(trabajador.estado || (trabajador.activo ? 'activo' : 'inactivo'));
  const edad = calcularEdad(trabajador.fecha_nacimiento);
  const antiguedad = calcularAntiguedad(trabajador.fecha_ingreso);
  const nombreCompleto = getNombreCompleto(trabajador);
  const cargoNombre = trabajador.cargo?.nombre || trabajador.cargo_legacy || null;
  const deptoNombre = trabajador.departamento_area?.nombre || trabajador.departamento_legacy || null;

  return (
    <div className="space-y-6">
      {/* MODAL DE ELIMINACIÓN */}
      {mostrarModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !eliminando && setMostrarModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg border border-red-200 shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <span className="text-lg">⚠️</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Eliminar Empleado</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 mb-2">
                Estás a punto de eliminar <strong>permanentemente</strong> a:
              </p>
              <p className="text-base font-semibold text-red-900">{nombreCompleto}</p>
              {trabajador.cedula && (
                <p className="text-sm text-red-700 mt-1">Cédula: {trabajador.cedula}</p>
              )}
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-orange-800 mb-2">⚠️ Esta acción NO se puede deshacer. Se eliminarán:</p>
              <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                <li>Datos personales y laborales</li>
                <li>Documentos cargados</li>
                <li>Historial de cambios</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para confirmar, escribe <strong>ELIMINAR</strong>:
              </label>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value)}
                disabled={eliminando}
                placeholder="Escribe ELIMINAR"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {errorEliminar && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                {errorEliminar}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setConfirmacionTexto('');
                  setErrorEliminar(null);
                }}
                disabled={eliminando}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando || confirmacionTexto !== 'ELIMINAR'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {eliminando ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/trabajadores"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                ← Volver
              </Link>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {nombreCompleto}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${estado.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
                {estado.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {trabajador.cedula && (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  CC {trabajador.cedula}
                </span>
              )}
              {cargoNombre && <span>{cargoNombre}</span>}
              {deptoNombre && <span>{deptoNombre}</span>}
            </div>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => setMostrarModal(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                Eliminar
              </button>
            )}
            <Link
              href={`/trabajadores/${trabajadorId}/editar`}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium inline-flex items-center gap-1.5"
            >
              Editar
            </Link>
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
                onClick={() => setTabActivo(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tabActivo === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {tabActivo === 'informacion' && (
            <TabInformacion
              trabajador={trabajador}
              edad={edad}
              formatearFecha={formatearFecha}
              nombreCompleto={nombreCompleto}
            />
          )}

          {tabActivo === 'laboral' && (
            <TabLaboral
              trabajador={trabajador}
              antiguedad={antiguedad}
              formatearFecha={formatearFecha}
              formatearMoneda={formatearMoneda}
              cargoNombre={cargoNombre}
              deptoNombre={deptoNombre}
            />
          )}

          {tabActivo === 'documentos' && (
            <TabDocumentos trabajadorId={trabajadorId} isAdmin={isAdmin} />
          )}

          {tabActivo === 'historial' && (
            <TabHistorial trabajadorId={trabajadorId} />
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================
// TAB: Información Personal
// =====================================
function TabInformacion({ trabajador, edad, formatearFecha, nombreCompleto }) {
  const InfoRow = ({ label, value }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || 'N/A'}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Datos Personales</h3>
        <dl>
          <InfoRow label="Cédula" value={trabajador.cedula || trabajador.tipo_documento ? `${trabajador.tipo_documento || 'CC'} ${trabajador.cedula || ''}`.trim() : null} />
          <InfoRow label="Nombre Completo" value={nombreCompleto} />
          <InfoRow
            label="Fecha de Nacimiento"
            value={
              trabajador.fecha_nacimiento
                ? `${formatearFecha(trabajador.fecha_nacimiento)}${edad ? ` (${edad} años)` : ''}`
                : null
            }
          />
          <InfoRow label="Género" value={trabajador.genero ? (trabajador.genero === 'M' ? 'Masculino' : trabajador.genero === 'F' ? 'Femenino' : trabajador.genero) : null} />
          <InfoRow label="Estado Civil" value={trabajador.estado_civil} />
          <InfoRow label="Tipo de Sangre" value={trabajador.rh || trabajador.tipo_sangre} />
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
        <dl>
          <InfoRow label="Teléfono" value={trabajador.telefono} />
          <InfoRow label="Email" value={trabajador.email} />
          <InfoRow label="Dirección" value={trabajador.direccion} />
          <InfoRow label="Ciudad" value={trabajador.ciudad} />
          <InfoRow label="Departamento (Geográfico)" value={trabajador.departamento_residencia} />
        </dl>

        <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-8">Contacto de Emergencia</h3>
        <dl>
          <InfoRow label="Nombre" value={trabajador.contacto_emergencia_nombre} />
          <InfoRow label="Parentesco" value={trabajador.contacto_emergencia_parentesco} />
          <InfoRow label="Teléfono" value={trabajador.contacto_emergencia_telefono} />
        </dl>
      </div>
    </div>
  );
}

// =====================================
// TAB: Información Laboral
// =====================================
function TabLaboral({ trabajador, antiguedad, formatearFecha, formatearMoneda, cargoNombre, deptoNombre }) {
  const InfoRow = ({ label, value }) => (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value || 'N/A'}</dd>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cargo</h3>
        <dl>
          <InfoRow label="Cargo" value={cargoNombre} />
          <InfoRow label="Departamento" value={deptoNombre} />
          <InfoRow label="Tipo de Contrato" value={trabajador.tipo_contrato} />
          <InfoRow
            label="Fecha de Ingreso"
            value={
              trabajador.fecha_ingreso
                ? `${formatearFecha(trabajador.fecha_ingreso)}${
                    antiguedad ? ` (${antiguedad.años} años, ${antiguedad.meses} meses)` : ''
                  }`
                : null
            }
          />
          <InfoRow label="Fecha Fin Contrato" value={formatearFecha(trabajador.fecha_fin_contrato)} />
          <InfoRow label="Salario" value={formatearMoneda(trabajador.salario)} />
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seguridad Social</h3>
        <dl>
          <InfoRow label="EPS" value={trabajador.eps} />
          <InfoRow label="ARL" value={trabajador.arl} />
          <InfoRow label="Fondo de Pensión" value={trabajador.fondo_pension || trabajador.afp} />
          <InfoRow label="Caja de Compensación" value={trabajador.caja_compensacion} />
        </dl>

        <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-8">Información Bancaria</h3>
        <dl>
          <InfoRow label="Banco" value={trabajador.banco} />
          <InfoRow label="Tipo de Cuenta" value={trabajador.tipo_cuenta} />
          <InfoRow label="Número de Cuenta" value={trabajador.numero_cuenta} />
        </dl>
      </div>
    </div>
  );
}

// =====================================
// TAB: Historial
// =====================================
function TabHistorial({ trabajadorId }) {
  const supabase = createClient();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarHistorial();
  }, [trabajadorId]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('historial_trabajadores')
        .select('*')
        .eq('trabajador_id', trabajadorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorial(data || []);
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500">Cargando historial...</p>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Cambios</h3>

      {historial.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No hay registros de historial para este trabajador.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historial.map((item) => (
            <div
              key={item.id}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 border-l-4 border-l-gray-900"
            >
              <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                <strong className="text-sm font-semibold text-gray-900">
                  {item.tipo_evento || item.tipo_cambio || 'Cambio'}
                </strong>
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at || item.fecha_evento).toLocaleString('es-CO')}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                {item.descripcion || 'Sin descripción'}
              </p>
              {item.usuario && (
                <p className="text-xs text-gray-400 mt-2">
                  Por: {item.usuario}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
