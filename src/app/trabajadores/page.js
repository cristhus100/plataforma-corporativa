'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function TrabajadoresPage() {
  const router = useRouter();
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [departamentos, setDepartamentos] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar trabajadores con joins
      const { data: trabajadoresData, error: errorTrab } = await supabase
        .from('trabajadores')
        .select(`
          *,
          cargo:cargos(id, nombre),
          departamento_area:departamentos(id, nombre)
        `)
        .order('primer_apellido', { ascending: true });

      if (errorTrab) throw errorTrab;

      // Cargar departamentos para filtro
      const { data: deptData } = await supabase
        .from('departamentos')
        .select('id, nombre')
        .order('nombre');

      setTrabajadores(trabajadoresData || []);
      setDepartamentos(deptData || []);
    } catch (error) {
      console.error('Error cargando trabajadores:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado
  const trabajadoresFiltrados = trabajadores.filter((t) => {
    const nombreCompleto = `${t.nombres} ${t.primer_apellido} ${t.segundo_apellido || ''}`.toLowerCase();
    const coincideBusqueda =
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      t.cedula?.includes(busqueda);

    const coincideEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activo' && t.activo) ||
      (filtroEstado === 'inactivo' && !t.activo);

    const coincideDepto =
      filtroDepartamento === 'todos' ||
      t.departamento_id === parseInt(filtroDepartamento);

    return coincideBusqueda && coincideEstado && coincideDepto;
  });

  // Estadísticas
  const stats = {
    total: trabajadores.length,
    activos: trabajadores.filter((t) => t.activo).length,
    inactivos: trabajadores.filter((t) => !t.activo).length,
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Cargando trabajadores...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>
            👥 Trabajadores
          </h1>
          <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>
            Gestión del personal de Serviequipos
          </p>
        </div>
        <Link
          href="/trabajadores/nuevo"
          style={{
            backgroundColor: '#FFC107',
            color: '#1A1A1A',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          + Nuevo Trabajador
        </Link>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #1A1A1A' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Total Trabajadores</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1A1A1A' }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Activos</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981' }}>{stats.activos}</div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #EF4444' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>Inactivos</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#EF4444' }}>{stats.inactivos}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o cédula..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px' }}
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Solo activos</option>
          <option value="inactivo">Solo inactivos</option>
        </select>
        <select
          value={filtroDepartamento}
          onChange={(e) => setFiltroDepartamento(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #E5E5E5', borderRadius: '8px', fontSize: '14px' }}
        >
          <option value="todos">Todos los departamentos</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden' }}>
        {trabajadoresFiltrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#666' }}>
              No se encontraron trabajadores
            </div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              {trabajadores.length === 0 ? 'Crea el primer trabajador' : 'Intenta con otros filtros'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#F5F5F5', borderBottom: '2px solid #E5E5E5' }}>
              <tr>
                <th style={thStyle}>Cédula</th>
                <th style={thStyle}>Nombre Completo</th>
                <th style={thStyle}>Cargo</th>
                <th style={thStyle}>Departamento</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {trabajadoresFiltrados.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: '1px solid #F0F0F0', cursor: 'pointer' }}
                  onClick={() => router.push(`/trabajadores/${t.id}`)}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  <td style={tdStyle}>{t.cedula}</td>
                  <td style={{ ...tdStyle, fontWeight: '600' }}>
                    {t.primer_apellido} {t.segundo_apellido} {t.nombres}
                  </td>
                  <td style={tdStyle}>{t.cargo?.nombre || '—'}</td>
                  <td style={tdStyle}>{t.departamento_area?.nombre || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: t.activo ? '#D1FAE5' : '#FEE2E2',
                      color: t.activo ? '#065F46' : '#991B1B',
                    }}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <Link
                      href={`/trabajadores/${t.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#1A1A1A', fontWeight: '600', fontSize: '13px', textDecoration: 'none' }}
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '16px', fontSize: '13px', color: '#999', textAlign: 'right' }}>
        Mostrando {trabajadoresFiltrados.length} de {trabajadores.length} trabajadores
      </div>
    </div>
  );
}

const thStyle = {
  padding: '14px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: '600',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: '14px',
  color: '#1A1A1A',
};
