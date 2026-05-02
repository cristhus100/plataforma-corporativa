'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import TabDocumentos from './components/TabDocumentos';

export default function DetalleTrabajadorPage() {
  const params = useParams();
  const router = useRouter();
  const trabajadorId = params.id;

  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabActivo, setTabActivo] = useState('informacion');

  // 🆕 Estados para eliminación
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
        .select('*')
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

  // 🆕 Función para eliminar trabajador permanentemente
  const handleEliminar = async () => {
    setEliminando(true);
    setErrorEliminar(null);

    try {
      // 1. Eliminar archivos del Storage (documentos)
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

      // 2. Eliminar registros del historial
      await supabase
        .from('historial_trabajadores')
        .delete()
        .eq('trabajador_id', trabajadorId);

      // 3. Eliminar registros de documentos (tabla)
      await supabase
        .from('documentos_trabajadores')
        .delete()
        .eq('trabajador_id', trabajadorId);

      // 4. Eliminar el trabajador
      const { error: errorDelete } = await supabase
        .from('trabajadores')
        .delete()
        .eq('id', trabajadorId);

      if (errorDelete) throw errorDelete;

      // 5. Redirigir a la lista
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

  const getEstadoColor = (estado) => {
    const colores = {
      activo: { bg: '#1B5E20', color: '#A5D6A7' },
      inactivo: { bg: '#424242', color: '#BDBDBD' },
      vacaciones: { bg: '#1565C0', color: '#90CAF9' },
      incapacidad: { bg: '#E65100', color: '#FFCC80' },
      retirado: { bg: '#B71C1C', color: '#EF9A9A' },
    };
    return colores[estado] || { bg: '#424242', color: '#BDBDBD' };
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', color: '#F5F5F5', textAlign: 'center' }}>
        <p>Cargando información del trabajador...</p>
      </div>
    );
  }

  if (error || !trabajador) {
    return (
      <div style={{ padding: '40px', color: '#F5F5F5' }}>
        <div
          style={{
            backgroundColor: '#B71C1C',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ marginBottom: '10px' }}>Error al cargar el trabajador</h2>
          <p>{error || 'No se encontró el trabajador solicitado'}</p>
        </div>
        <Link
          href="/trabajadores"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#FFC107',
            color: '#1A1A1A',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: '600',
          }}
        >
          ← Volver a Trabajadores
        </Link>
      </div>
    );
  }

  const estadoStyle = getEstadoColor(trabajador.estado);
  const edad = calcularEdad(trabajador.fecha_nacimiento);
  const antiguedad = calcularAntiguedad(trabajador.fecha_ingreso);
  const nombreCompleto = `${trabajador.nombres} ${trabajador.apellidos}`;

  return (
    <div style={{ padding: '30px', color: '#F5F5F5' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <Link
          href="/trabajadores"
          style={{
            color: '#FFC107',
            textDecoration: 'none',
            fontSize: '14px',
            marginBottom: '15px',
            display: 'inline-block',
          }}
        >
          ← Volver a Trabajadores
        </Link>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '15px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#FFC107' }}>
              {nombreCompleto}
            </h1>
            <p style={{ color: '#BDBDBD', fontSize: '16px' }}>
              {trabajador.cargo || 'Sin cargo asignado'}
              {trabajador.departamento && ` · ${trabajador.departamento}`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: estadoStyle.bg,
                color: estadoStyle.color,
                fontSize: '13px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              {trabajador.estado}
            </span>

            <Link
              href={`/trabajadores/${trabajadorId}/editar`}
              style={{
                padding: '10px 18px',
                backgroundColor: '#FFC107',
                color: '#1A1A1A',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              ✏️ Editar
            </Link>

            {/* 🆕 Botón Eliminar */}
            <button
              onClick={() => setMostrarModal(true)}
              style={{
                padding: '10px 18px',
                backgroundColor: '#B71C1C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#D32F2F')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#B71C1C')}
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '5px',
          borderBottom: '2px solid #424242',
          marginBottom: '25px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'informacion', label: '👤 Información Personal' },
          { id: 'laboral', label: '💼 Información Laboral' },
          { id: 'documentos', label: '📄 Documentos' },
          { id: 'historial', label: '📋 Historial' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            style={{
              padding: '12px 20px',
              backgroundColor: tabActivo === tab.id ? '#FFC107' : 'transparent',
              color: tabActivo === tab.id ? '#1A1A1A' : '#F5F5F5',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: tabActivo === tab.id ? '600' : '400',
              fontSize: '14px',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de los Tabs */}
      <div
        style={{
          backgroundColor: '#212121',
          padding: '25px',
          borderRadius: '8px',
          minHeight: '400px',
        }}
      >
        {tabActivo === 'informacion' && (
          <TabInformacion
            trabajador={trabajador}
            edad={edad}
            formatearFecha={formatearFecha}
          />
        )}

        {tabActivo === 'laboral' && (
          <TabLaboral
            trabajador={trabajador}
            antiguedad={antiguedad}
            formatearFecha={formatearFecha}
            formatearMoneda={formatearMoneda}
          />
        )}

        {tabActivo === 'documentos' && (
          <TabDocumentos trabajadorId={trabajadorId} />
        )}

        {tabActivo === 'historial' && <TabHistorial trabajadorId={trabajadorId} />}
      </div>

      {/* 🆕 MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {mostrarModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => !eliminando && setMostrarModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#212121',
              border: '2px solid #B71C1C',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '32px',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: '#B71C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ⚠️
              </div>
              <h2 style={{ fontSize: '22px', color: '#F5F5F5', margin: 0 }}>
                Eliminar Trabajador
              </h2>
            </div>

            <div
              style={{
                backgroundColor: '#1A1A1A',
                padding: '15px',
                borderRadius: '6px',
                borderLeft: '3px solid #B71C1C',
                marginBottom: '20px',
              }}
            >
              <p style={{ color: '#F5F5F5', fontSize: '15px', marginBottom: '10px' }}>
                Estás a punto de eliminar <strong style={{ color: '#FFC107' }}>permanentemente</strong> a:
              </p>
              <p style={{ color: '#FFC107', fontSize: '17px', fontWeight: '600', marginBottom: '10px' }}>
                {nombreCompleto}
              </p>
              <p style={{ color: '#BDBDBD', fontSize: '13px' }}>
                Cédula: {trabajador.cedula || 'No registrada'}
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#3E2723',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
              }}
            >
              <p style={{ color: '#FFCDD2', fontSize: '13px', margin: 0 }}>
                ⚠️ <strong>Esta acción NO se puede deshacer.</strong> Se eliminarán:
              </p>
              <ul style={{ color: '#FFCDD2', fontSize: '13px', marginTop: '8px', paddingLeft: '20px' }}>
                <li>Datos personales y laborales</li>
                <li>Documentos cargados</li>
                <li>Historial de cambios</li>
              </ul>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#BDBDBD',
                  fontSize: '13px',
                  marginBottom: '8px',
                }}
              >
                Para confirmar, escribe <strong style={{ color: '#FFC107' }}>ELIMINAR</strong>:
              </label>
              <input
                type="text"
                value={confirmacionTexto}
                onChange={(e) => setConfirmacionTexto(e.target.value)}
                disabled={eliminando}
                placeholder="Escribe ELIMINAR"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: '#1A1A1A',
                  border: '1px solid #424242',
                  borderRadius: '6px',
                  color: '#F5F5F5',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {errorEliminar && (
              <div
                style={{
                  backgroundColor: '#B71C1C',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  fontSize: '13px',
                }}
              >
                {errorEliminar}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setMostrarModal(false);
                  setConfirmacionTexto('');
                  setErrorEliminar(null);
                }}
                disabled={eliminando}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: '#F5F5F5',
                  border: '1px solid #424242',
                  borderRadius: '6px',
                  cursor: eliminando ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: eliminando ? 0.5 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={eliminando || confirmacionTexto !== 'ELIMINAR'}
                style={{
                  padding: '10px 20px',
                  backgroundColor:
                    confirmacionTexto === 'ELIMINAR' && !eliminando
                      ? '#B71C1C'
                      : '#424242',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    confirmacionTexto === 'ELIMINAR' && !eliminando
                      ? 'pointer'
                      : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: confirmacionTexto === 'ELIMINAR' && !eliminando ? 1 : 0.5,
                }}
              >
                {eliminando ? '⏳ Eliminando...' : '🗑️ Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================
// TAB: Información Personal
// =====================================
function TabInformacion({ trabajador, edad, formatearFecha }) {
  return (
    <div>
      <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#FFC107' }}>
        Datos Personales
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Campo label="Cédula" valor={trabajador.cedula} />
        <Campo
          label="Nombre Completo"
          valor={`${trabajador.nombres} ${trabajador.apellidos}`}
        />
        <Campo
          label="Fecha de Nacimiento"
          valor={
            trabajador.fecha_nacimiento
              ? `${formatearFecha(trabajador.fecha_nacimiento)} (${edad} años)`
              : 'No registrada'
          }
        />
        <Campo label="Género" valor={trabajador.genero} />
        <Campo label="Estado Civil" valor={trabajador.estado_civil} />
        <Campo label="Tipo de Sangre" valor={trabajador.tipo_sangre} />
      </div>

      <h2
        style={{
          fontSize: '18px',
          margin: '30px 0 20px',
          color: '#FFC107',
          paddingTop: '20px',
          borderTop: '1px solid #424242',
        }}
      >
        Información de Contacto
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Campo label="Teléfono" valor={trabajador.telefono} />
        <Campo label="Email" valor={trabajador.email} />
        <Campo label="Dirección" valor={trabajador.direccion} />
        <Campo label="Ciudad" valor={trabajador.ciudad} />
        <Campo label="Departamento" valor={trabajador.departamento_residencia} />
      </div>

      <h2
        style={{
          fontSize: '18px',
          margin: '30px 0 20px',
          color: '#FFC107',
          paddingTop: '20px',
          borderTop: '1px solid #424242',
        }}
      >
        Contacto de Emergencia
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Campo label="Nombre" valor={trabajador.contacto_emergencia_nombre} />
        <Campo label="Parentesco" valor={trabajador.contacto_emergencia_parentesco} />
        <Campo label="Teléfono" valor={trabajador.contacto_emergencia_telefono} />
      </div>
    </div>
  );
}

// =====================================
// TAB: Información Laboral
// =====================================
function TabLaboral({ trabajador, antiguedad, formatearFecha, formatearMoneda }) {
  return (
    <div>
      <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#FFC107' }}>
        Información del Cargo
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Campo label="Cargo" valor={trabajador.cargo} />
        <Campo label="Departamento" valor={trabajador.departamento} />
        <Campo label="Tipo de Contrato" valor={trabajador.tipo_contrato} />
        <Campo
          label="Fecha de Ingreso"
          valor={
            trabajador.fecha_ingreso
              ? `${formatearFecha(trabajador.fecha_ingreso)}${
                  antiguedad
                    ? ` (${antiguedad.años} años, ${antiguedad.meses} meses)`
                    : ''
                }`
              : 'No registrada'
          }
        />
        <Campo
          label="Fecha Fin Contrato"
          valor={formatearFecha(trabajador.fecha_fin_contrato)}
        />
        <Campo label="Salario" valor={formatearMoneda(trabajador.salario)} />
      </div>

      <h2
        style={{
          fontSize: '18px',
          margin: '30px 0 20px',
          color: '#FFC107',
          paddingTop: '20px',
          borderTop: '1px solid #424242',
        }}
      >
        Seguridad Social
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Campo label="EPS" valor={trabajador.eps} />
        <Campo label="ARL" valor={trabajador.arl} />
        <Campo label="Fondo de Pensión" valor={trabajador.fondo_pension} />
        <Campo label="Fondo de Cesantías" valor={trabajador.fondo_cesantias} />
        <Campo label="Caja de Compensación" valor={trabajador.caja_compensacion} />
      </div>

      <h2
        style={{
          fontSize: '18px',
          margin: '30px 0 20px',
          color: '#FFC107',
          paddingTop: '20px',
          borderTop: '1px solid #424242',
        }}
      >
        Información Bancaria
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <Campo label="Banco" valor={trabajador.banco} />
        <Campo label="Tipo de Cuenta" valor={trabajador.tipo_cuenta} />
        <Campo label="Número de Cuenta" valor={trabajador.numero_cuenta} />
      </div>
    </div>
  );
}

// =====================================
// TAB: Historial
// =====================================
function TabHistorial({ trabajadorId }) {
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
    return <p style={{ color: '#BDBDBD' }}>Cargando historial...</p>;
  }

  return (
    <div>
      <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#FFC107' }}>
        Historial de Cambios
      </h2>

      {historial.length === 0 ? (
        <p style={{ color: '#BDBDBD' }}>
          No hay registros de historial para este trabajador.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {historial.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '15px',
                backgroundColor: '#1A1A1A',
                borderRadius: '6px',
                borderLeft: '3px solid #FFC107',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <strong style={{ color: '#FFC107', fontSize: '14px' }}>
                  {item.tipo_cambio || 'Cambio'}
                </strong>
                <span style={{ color: '#BDBDBD', fontSize: '12px' }}>
                  {new Date(item.created_at).toLocaleString('es-CO')}
                </span>
              </div>
              <p style={{ color: '#F5F5F5', fontSize: '14px' }}>
                {item.descripcion || 'Sin descripción'}
              </p>
              {item.usuario && (
                <p style={{ color: '#9E9E9E', fontSize: '12px', marginTop: '6px' }}>
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

// =====================================
// Componente Auxiliar: Campo
// =====================================
function Campo({ label, valor }) {
  return (
    <div>
      <p
        style={{
          fontSize: '12px',
          color: '#9E9E9E',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: '15px', color: '#F5F5F5' }}>
        {valor || <span style={{ color: '#616161' }}>No registrado</span>}
      </p>
    </div>
  );
}
