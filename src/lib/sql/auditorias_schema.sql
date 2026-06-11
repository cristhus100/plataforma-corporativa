-- ============================================================
-- MÓDULO: AUDITORÍAS POR FRENTE DE TRABAJO
-- Creado: 2026-06-04
-- ============================================================

-- 1. Tabla frentes_trabajo
CREATE TABLE IF NOT EXISTS frentes_trabajo (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  ubicacion TEXT,
  ciudad TEXT,
  departamento TEXT,
  responsable_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agregar columna frente_trabajo_id en trabajadores
ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS frente_trabajo_id BIGINT REFERENCES frentes_trabajo(id) ON DELETE SET NULL;

-- 3. Agregar columna frente_trabajo_id en maquinaria
ALTER TABLE maquinaria
  ADD COLUMN IF NOT EXISTS frente_trabajo_id BIGINT REFERENCES frentes_trabajo(id) ON DELETE SET NULL;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_trabajadores_frente ON trabajadores(frente_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_maquinaria_frente ON maquinaria(frente_trabajo_id);

-- 5. RLS Policies (asumiendo que las tablas tienen RLS habilitado)
ALTER TABLE frentes_trabajo ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access frentes_trabajo"
  ON frentes_trabajo
  FOR ALL
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

-- Usuario: read-only
CREATE POLICY "Usuario read frentes_trabajo"
  ON frentes_trabajo
  FOR SELECT
  TO authenticated
  USING (true);

-- 6. Trigger para updated_at en frentes_trabajo
CREATE OR REPLACE FUNCTION update_frentes_trabajo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_frentes_trabajo_updated_at ON frentes_trabajo;
CREATE TRIGGER trg_frentes_trabajo_updated_at
  BEFORE UPDATE ON frentes_trabajo
  FOR EACH ROW
  EXECUTE FUNCTION update_frentes_trabajo_updated_at();

-- 7. Seed data: frentes de trabajo de ejemplo
INSERT INTO frentes_trabajo (codigo, nombre, ubicacion, ciudad, departamento) VALUES
  ('FT-001', 'Sede Principal', 'Cra 50 # 80-20', 'Medellín', 'Antioquia'),
  ('FT-002', 'Sede Norte', 'Autopista Norte # 100-50', 'Barranquilla', 'Atlántico'),
  ('FT-003', 'Planta de Producción', 'Zona Industrial Km 5', 'Bogotá', 'Cundinamarca')
ON CONFLICT (codigo) DO NOTHING;
