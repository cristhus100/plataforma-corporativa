-- ============================================
-- RECREAR MÓDULO DE VEHÍCULOS
-- Exactamente como funciona maquinaria
-- ============================================

-- 1. TABLA PRINCIPAL: vehiculos
CREATE TABLE IF NOT EXISTS vehiculos (
  id BIGSERIAL PRIMARY KEY,
  placa TEXT,
  nombre TEXT,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  color TEXT,
  tipo TEXT DEFAULT 'particular',
  numero_motor TEXT,
  numero_chasis TEXT,
  estado TEXT DEFAULT 'operativo',
  kilometraje_actual NUMERIC DEFAULT 0,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLAS RELACIONADAS
CREATE TABLE IF NOT EXISTS tipos_documentos_vehiculo (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  requiere_vencimiento BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS documentos_vehiculos (
  id BIGSERIAL PRIMARY KEY,
  vehiculo_id BIGINT REFERENCES vehiculos(id) ON DELETE CASCADE,
  tipo_documento_id BIGINT REFERENCES tipos_documentos_vehiculo(id),
  numero_documento TEXT,
  fecha_emision DATE,
  fecha_vencimiento DATE,
  archivo_url TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mantenimientos_vehiculos (
  id BIGSERIAL PRIMARY KEY,
  vehiculo_id BIGINT REFERENCES vehiculos(id) ON DELETE CASCADE,
  tipo_mantenimiento TEXT,
  descripcion TEXT,
  kilometraje NUMERIC,
  costo NUMERIC,
  fecha DATE,
  proveedor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registros_vehiculos (
  id BIGSERIAL PRIMARY KEY,
  vehiculo_id BIGINT REFERENCES vehiculos(id) ON DELETE CASCADE,
  operador_nombre TEXT,
  fecha DATE,
  kilometraje_inicial NUMERIC,
  kilometraje_final NUMERIC,
  novedades TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VISTA DE ALERTAS (igual que vw_alertas_maquinaria)
CREATE OR REPLACE VIEW vw_alertas_vehiculos AS
SELECT
  v.id,
  v.nombre AS nombre_vehiculo,
  v.placa,
  dv.id AS documento_id,
  dv.fecha_vencimiento,
  dv.numero_documento,
  td.nombre AS nombre_alerta,
  td.requiere_vencimiento,
  CASE
    WHEN dv.fecha_vencimiento IS NULL THEN 'SIN_DATO'
    WHEN dv.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
    WHEN dv.fecha_vencimiento <= CURRENT_DATE + 7 THEN 'CRITICO'
    WHEN dv.fecha_vencimiento <= CURRENT_DATE + 30 THEN 'PROXIMO'
    ELSE 'VIGENTE'
  END AS estado_alerta,
  CASE
    WHEN dv.fecha_vencimiento IS NULL THEN NULL
    ELSE (dv.fecha_vencimiento - CURRENT_DATE)::INTEGER
  END AS dias_para_vencer
FROM vehiculos v
JOIN documentos_vehiculos dv ON dv.vehiculo_id = v.id
JOIN tipos_documentos_vehiculo td ON td.id = dv.tipo_documento_id
WHERE v.activo = true;

-- 4. RLS: Row Level Security (SELECT para todos, INSERT/UPDATE/DELETE solo admin)
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_documentos_vehiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimientos_vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_vehiculos ENABLE ROW LEVEL SECURITY;

-- Políticas para vehiculos
DROP POLICY IF EXISTS "select_vehiculos" ON vehiculos;
CREATE POLICY "select_vehiculos" ON vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_vehiculos" ON vehiculos;
CREATE POLICY "insert_vehiculos" ON vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "update_vehiculos" ON vehiculos;
CREATE POLICY "update_vehiculos" ON vehiculos FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_vehiculos" ON vehiculos;
CREATE POLICY "delete_vehiculos" ON vehiculos FOR DELETE TO authenticated USING (es_admin());

-- Políticas para tipos_documentos_vehiculo (catálogo, solo lectura)
DROP POLICY IF EXISTS "select_tipos_documentos_vehiculo" ON tipos_documentos_vehiculo;
CREATE POLICY "select_tipos_documentos_vehiculo" ON tipos_documentos_vehiculo FOR SELECT TO authenticated USING (true);

-- Políticas para documentos_vehiculos
DROP POLICY IF EXISTS "select_documentos_vehiculos" ON documentos_vehiculos;
CREATE POLICY "select_documentos_vehiculos" ON documentos_vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_documentos_vehiculos" ON documentos_vehiculos;
CREATE POLICY "insert_documentos_vehiculos" ON documentos_vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_documentos_vehiculos" ON documentos_vehiculos;
CREATE POLICY "delete_documentos_vehiculos" ON documentos_vehiculos FOR DELETE TO authenticated USING (es_admin());

-- Políticas para mantenimientos_vehiculos
DROP POLICY IF EXISTS "select_mantenimientos_vehiculos" ON mantenimientos_vehiculos;
CREATE POLICY "select_mantenimientos_vehiculos" ON mantenimientos_vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_mantenimientos_vehiculos" ON mantenimientos_vehiculos;
CREATE POLICY "insert_mantenimientos_vehiculos" ON mantenimientos_vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());

-- Políticas para registros_vehiculos
DROP POLICY IF EXISTS "select_registros_vehiculos" ON registros_vehiculos;
CREATE POLICY "select_registros_vehiculos" ON registros_vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_registros_vehiculos" ON registros_vehiculos;
CREATE POLICY "insert_registros_vehiculos" ON registros_vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());

-- 5. TIPOS DE DOCUMENTOS POR DEFECTO
INSERT INTO tipos_documentos_vehiculo (nombre, requiere_vencimiento, activo) VALUES
  ('SOAT', true, true),
  ('Técnico-Mecánica', true, true),
  ('Seguro Contractual', true, true),
  ('Seguro Extracontractual', true, true),
  ('Tarjeta de Operación', true, true),
  ('Certificado de Emisiones', true, true),
  ('Revisión Anual', true, true)
ON CONFLICT DO NOTHING;

-- 6. CREAR BUCKET DE STORAGE (ejecutar si no existe)
-- Nota: Los buckets se crean desde Supabase Dashboard > Storage
-- o con la API de Management. Si no existe el bucket 'fotos-maquinaria',
-- crearlo desde el dashboard con visibilidad pública.
