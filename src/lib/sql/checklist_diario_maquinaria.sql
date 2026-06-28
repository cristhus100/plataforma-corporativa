-- ============================================
-- MIGRACIÓN: Checklist diario en maquinaria  v2
-- Agrega columna para tracking del último
-- checklist diario realizado por el operador
-- + tabla histórica de checklists completos
-- ============================================

-- 1. Columna en maquinaria (ya existe si se ejecutó 00_consolidado)
ALTER TABLE maquinaria
ADD COLUMN IF NOT EXISTS ultimo_checklist_diario DATE;

-- 2. Tabla histórica de checklists
CREATE TABLE IF NOT EXISTS checklist_diario_maquinaria (
  id BIGSERIAL PRIMARY KEY,
  maquinaria_id BIGINT NOT NULL REFERENCES maquinaria(id) ON DELETE CASCADE,
  operador_nombre TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  horometro NUMERIC(10,2),
  kilometraje NUMERIC(10,2),

  -- Items del checklist (cada uno: 'bien' | 'regular' | 'mal')
  aceite_motor TEXT NOT NULL DEFAULT 'bien',
  liquido_hidraulico TEXT NOT NULL DEFAULT 'bien',
  refrigerante TEXT NOT NULL DEFAULT 'bien',
  filtro_aire TEXT NOT NULL DEFAULT 'bien',
  llantas TEXT NOT NULL DEFAULT 'bien',
  luces TEXT NOT NULL DEFAULT 'bien',
  frenos TEXT NOT NULL DEFAULT 'bien',
  bocina TEXT NOT NULL DEFAULT 'bien',
  espejos TEXT NOT NULL DEFAULT 'bien',
  cinturon TEXT NOT NULL DEFAULT 'bien',
  extintor TEXT NOT NULL DEFAULT 'bien',
  botiquin TEXT NOT NULL DEFAULT 'bien',
  limpieza TEXT NOT NULL DEFAULT 'bien',
  fugas TEXT NOT NULL DEFAULT 'bien',
  estado_general TEXT NOT NULL DEFAULT 'bien',

  -- Total items marcados como 'mal'
  total_fallas INTEGER NOT NULL DEFAULT 0,
  observaciones TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_checklist_maquinaria_fecha
  ON checklist_diario_maquinaria(maquinaria_id, fecha DESC);

-- 4. RLS
ALTER TABLE checklist_diario_maquinaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist diario read" ON checklist_diario_maquinaria;
CREATE POLICY "checklist diario read"
  ON checklist_diario_maquinaria FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "checklist diario insert" ON checklist_diario_maquinaria;
CREATE POLICY "checklist diario insert"
  ON checklist_diario_maquinaria FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "checklist diario update" ON checklist_diario_maquinaria;
CREATE POLICY "checklist diario update"
  ON checklist_diario_maquinaria FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
