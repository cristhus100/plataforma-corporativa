-- ============================================
-- MIGRACIÓN: Tabs faltantes de maquinaria
-- Documentos, Fotos, Operador Asignado
-- ============================================

-- 1. OPERADOR: Agregar columna a maquinaria
ALTER TABLE maquinaria
ADD COLUMN IF NOT EXISTS operador_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operador_asignado_desde DATE;

-- 2. TIPOS DE DOCUMENTOS PARA MAQUINARIA
CREATE TABLE IF NOT EXISTS tipos_documentos_maquinaria (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  requiere_vencimiento BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true
);

-- 3. DOCUMENTOS DE MAQUINARIA
CREATE TABLE IF NOT EXISTS documentos_maquinaria (
  id BIGSERIAL PRIMARY KEY,
  maquinaria_id BIGINT REFERENCES maquinaria(id) ON DELETE CASCADE,
  tipo_documento_id BIGINT REFERENCES tipos_documentos_maquinaria(id),
  numero_documento TEXT,
  nombre_archivo TEXT,
  ruta_archivo TEXT,
  tamano_bytes BIGINT,
  tipo_mime TEXT,
  fecha_emision DATE,
  fecha_vencimiento DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FOTOS DE MAQUINARIA
CREATE TABLE IF NOT EXISTS fotos_maquinaria (
  id BIGSERIAL PRIMARY KEY,
  maquinaria_id BIGINT REFERENCES maquinaria(id) ON DELETE CASCADE,
  ruta_archivo TEXT NOT NULL,
  nombre_original TEXT,
  descripcion TEXT,
  es_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TIPOS DE DOCUMENTOS POR DEFECTO
INSERT INTO tipos_documentos_maquinaria (nombre, requiere_vencimiento, activo) VALUES
  ('SOAT', true, true),
  ('Técnico-Mecánica', true, true),
  ('Seguro Contractual', true, true),
  ('Seguro Extracontractual', true, true),
  ('Poliza de Maquinaria', true, true),
  ('Manual de Operación', false, true),
  ('Certificado de Operador', true, true),
  ('Inspección Anual', true, true),
  ('Certificado de Calibración', true, true)
ON CONFLICT DO NOTHING;

-- 6. VISTA DE ALERTAS PARA DOCUMENTOS DE MAQUINARIA
CREATE OR REPLACE VIEW vw_alertas_documentos_maquinaria AS
SELECT
  dm.id,
  m.id AS entidad_id,
  m.nombre AS nombre_entidad,
  m.codigo_interno,
  'maquinaria'::text AS tipo_entidad,
  tdm.nombre AS tipo_documento,
  dm.numero_documento,
  dm.fecha_emision,
  dm.fecha_vencimiento,
  dm.observaciones,
  CASE
    WHEN dm.fecha_vencimiento IS NULL THEN 'SIN_FECHA'
    WHEN dm.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
    WHEN dm.fecha_vencimiento <= CURRENT_DATE + 7 THEN 'CRITICO'
    WHEN dm.fecha_vencimiento <= CURRENT_DATE + 30 THEN 'PROXIMO'
    ELSE 'VIGENTE'
  END AS estado_alerta,
  CASE
    WHEN dm.fecha_vencimiento IS NULL THEN NULL
    ELSE (dm.fecha_vencimiento - CURRENT_DATE)::INTEGER
  END AS dias_para_vencer
FROM documentos_maquinaria dm
JOIN maquinaria m ON m.id = dm.maquinaria_id
JOIN tipos_documentos_maquinaria tdm ON tdm.id = dm.tipo_documento_id
WHERE m.activo = true;

-- 7. RLS (con roles: SELECT para todos, INSERT/DELETE solo admin)
ALTER TABLE tipos_documentos_maquinaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_maquinaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_maquinaria ENABLE ROW LEVEL SECURITY;

-- tipos_documentos_maquinaria (catálogo, solo lectura)
DROP POLICY IF EXISTS "select_tipos_documentos_maquinaria" ON tipos_documentos_maquinaria;
CREATE POLICY "select_tipos_documentos_maquinaria" ON tipos_documentos_maquinaria FOR SELECT TO authenticated USING (true);

-- documentos_maquinaria
DROP POLICY IF EXISTS "select_documentos_maquinaria" ON documentos_maquinaria;
CREATE POLICY "select_documentos_maquinaria" ON documentos_maquinaria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_documentos_maquinaria" ON documentos_maquinaria;
CREATE POLICY "insert_documentos_maquinaria" ON documentos_maquinaria FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_documentos_maquinaria" ON documentos_maquinaria;
CREATE POLICY "delete_documentos_maquinaria" ON documentos_maquinaria FOR DELETE TO authenticated USING (es_admin());

-- fotos_maquinaria
DROP POLICY IF EXISTS "select_fotos_maquinaria" ON fotos_maquinaria;
CREATE POLICY "select_fotos_maquinaria" ON fotos_maquinaria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_fotos_maquinaria" ON fotos_maquinaria;
CREATE POLICY "insert_fotos_maquinaria" ON fotos_maquinaria FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_fotos_maquinaria" ON fotos_maquinaria;
CREATE POLICY "delete_fotos_maquinaria" ON fotos_maquinaria FOR DELETE TO authenticated USING (es_admin());

-- ============================================
-- 8. ALERTAS SUPRIMIDAS (para descartar alertas)
-- ============================================
CREATE TABLE IF NOT EXISTS alertas_suprimidas (
  id BIGSERIAL PRIMARY KEY,
  entidad_id BIGINT NOT NULL,
  tipo_entidad TEXT NOT NULL,
  tipo_alerta TEXT,
  motivo TEXT,
  suprimido_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alertas_suprimidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_alertas_suprimidas" ON alertas_suprimidas;
CREATE POLICY "select_alertas_suprimidas" ON alertas_suprimidas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_alertas_suprimidas" ON alertas_suprimidas;
CREATE POLICY "insert_alertas_suprimidas" ON alertas_suprimidas FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_alertas_suprimidas" ON alertas_suprimidas;
CREATE POLICY "delete_alertas_suprimidas" ON alertas_suprimidas FOR DELETE TO authenticated USING (es_admin());
