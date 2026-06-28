-- ============================================================
-- MÓDULO: TURNOS DE EMPLEADOS (Santa Rosa)
-- Creado: 2026-06-11
-- ============================================================
-- Este módulo gestiona la asignación de turnos de trabajo
-- para los empleados. Se manejan 3 turnos fijos:
--   Turno A: 07:00 - 15:00 (diurno)
--   Turno B: 15:00 - 23:00 (tarde/noche)
--   Turno C: 23:00 - 07:00 (nocturno, trasnocha)
-- ============================================================

-- 1. CATÁLOGO DE TIPOS DE TURNO (A, B, C)
CREATE TABLE IF NOT EXISTS tipos_turno (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,                     -- 'A', 'B', 'C'
  nombre TEXT NOT NULL,                            -- 'Turno A', 'Turno B', 'Turno C'
  hora_inicio TIME NOT NULL,                       -- 07:00, 15:00, 23:00
  hora_fin TIME NOT NULL,                          -- 15:00, 23:00, 07:00
  es_nocturno BOOLEAN DEFAULT false,               -- true solo para Turno C
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ASIGNACIONES DE TURNO
-- Registra qué empleado tiene qué turno en qué período
CREATE TABLE IF NOT EXISTS asignaciones_turno (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo_turno_id BIGINT NOT NULL REFERENCES tipos_turno(id) ON DELETE RESTRICT,
  frente_trabajo_id BIGINT REFERENCES frentes_trabajo(id) ON DELETE SET NULL,

  fecha_inicio DATE NOT NULL,                      -- Cuándo empieza esta asignación
  fecha_fin DATE,                                  -- NULL = indefinido, o fecha fin

  -- Estado de la asignación
  estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo', 'suspendido')),

  -- Rotación automática (opcional): cada cuántos días rota
  dias_rotacion INTEGER DEFAULT NULL,              -- NULL = sin rotación fija

  observaciones TEXT,

  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REGISTRO DE ASISTENCIA DIARIA
-- Marca quién llegó a trabajar cada día, en qué turno
CREATE TABLE IF NOT EXISTS registro_asistencia_turno (
  id BIGSERIAL PRIMARY KEY,
  asignacion_turno_id BIGINT NOT NULL REFERENCES asignaciones_turno(id) ON DELETE CASCADE,
  trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo_turno_id BIGINT NOT NULL REFERENCES tipos_turno(id) ON DELETE RESTRICT,
  frente_trabajo_id BIGINT REFERENCES frentes_trabajo(id) ON DELETE SET NULL,

  fecha DATE NOT NULL,                             -- Día de la asistencia
  hora_llegada TIME,                               -- Hora real de llegada
  hora_salida TIME,                                -- Hora real de salida

  -- Estado de asistencia
  estado_asistencia TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado_asistencia IN (
      'pendiente',      -- Sin marcar aún
      'presente',       -- Asistió
      'ausente',        -- No asistió (falta injustificada)
      'permiso',        -- Permiso remunerado
      'incapacidad',    -- Incapacidad médica
      'vacaciones',     -- En período vacacional
      'festivo',        -- Festivo no laborado
      'suspension'      -- Suspensión disciplinaria
    )),

  -- Marcación
  marcado_por BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL,  -- Quién registró
  marcado_en TIMESTAMPTZ DEFAULT NOW(),

  -- Novedades
  novedad TEXT,                                    -- Texto libre con novedades del día
  requiere_reemplazo BOOLEAN DEFAULT false,
  reemplazado_por BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL,

  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un trabajador solo puede tener un registro por día por turno
  UNIQUE (trabajador_id, fecha, tipo_turno_id)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_asignaciones_turno_trabajador
  ON asignaciones_turno(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_turno_frente
  ON asignaciones_turno(frente_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_turno_fechas
  ON asignaciones_turno(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_asignaciones_turno_estado
  ON asignaciones_turno(estado);

CREATE INDEX IF NOT EXISTS idx_asistencia_fecha
  ON registro_asistencia_turno(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_trabajador
  ON registro_asistencia_turno(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_estado
  ON registro_asistencia_turno(estado_asistencia);
CREATE INDEX IF NOT EXISTS idx_asistencia_asignacion
  ON registro_asistencia_turno(asignacion_turno_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_frente
  ON registro_asistencia_turno(frente_trabajo_id);

-- ============================================================
-- TRIGGER: updated_at para tipos_turno
-- ============================================================
CREATE OR REPLACE FUNCTION update_tipos_turno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tipos_turno_updated_at ON tipos_turno;
CREATE TRIGGER trg_tipos_turno_updated_at
  BEFORE UPDATE ON tipos_turno
  FOR EACH ROW
  EXECUTE FUNCTION update_tipos_turno_updated_at();

-- ============================================================
-- TRIGGER: updated_at para asignaciones_turno
-- ============================================================
CREATE OR REPLACE FUNCTION update_asignaciones_turno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asignaciones_turno_updated_at ON asignaciones_turno;
CREATE TRIGGER trg_asignaciones_turno_updated_at
  BEFORE UPDATE ON asignaciones_turno
  FOR EACH ROW
  EXECUTE FUNCTION update_asignaciones_turno_updated_at();

-- ============================================================
-- TRIGGER: updated_at para registro_asistencia_turno
-- ============================================================
CREATE OR REPLACE FUNCTION update_asistencia_turno_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asistencia_turno_updated_at ON registro_asistencia_turno;
CREATE TRIGGER trg_asistencia_turno_updated_at
  BEFORE UPDATE ON registro_asistencia_turno
  FOR EACH ROW
  EXECUTE FUNCTION update_asistencia_turno_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE tipos_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_asistencia_turno ENABLE ROW LEVEL SECURITY;

-- tipos_turno: todos pueden leer, solo admin escribe
DROP POLICY IF EXISTS "Tipos turno read all" ON tipos_turno;
CREATE POLICY "Tipos turno read all"
  ON tipos_turno FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Tipos turno admin write" ON tipos_turno;
CREATE POLICY "Tipos turno admin write"
  ON tipos_turno FOR INSERT
  TO authenticated
  WITH CHECK (es_admin());

DROP POLICY IF EXISTS "Tipos turno admin update" ON tipos_turno;
CREATE POLICY "Tipos turno admin update"
  ON tipos_turno FOR UPDATE
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

DROP POLICY IF EXISTS "Tipos turno admin delete" ON tipos_turno;
CREATE POLICY "Tipos turno admin delete"
  ON tipos_turno FOR DELETE
  TO authenticated
  USING (es_admin());

-- asignaciones_turno: todos pueden leer, solo admin escribe
DROP POLICY IF EXISTS "Asignaciones turno read all" ON asignaciones_turno;
CREATE POLICY "Asignaciones turno read all"
  ON asignaciones_turno FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Asignaciones turno admin write" ON asignaciones_turno;
CREATE POLICY "Asignaciones turno admin write"
  ON asignaciones_turno FOR INSERT
  TO authenticated
  WITH CHECK (es_admin());

DROP POLICY IF EXISTS "Asignaciones turno admin update" ON asignaciones_turno;
CREATE POLICY "Asignaciones turno admin update"
  ON asignaciones_turno FOR UPDATE
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

DROP POLICY IF EXISTS "Asignaciones turno admin delete" ON asignaciones_turno;
CREATE POLICY "Asignaciones turno admin delete"
  ON asignaciones_turno FOR DELETE
  TO authenticated
  USING (es_admin());

-- registro_asistencia_turno: todos pueden leer y escribir
DROP POLICY IF EXISTS "Asistencia read all" ON registro_asistencia_turno;
CREATE POLICY "Asistencia read all"
  ON registro_asistencia_turno FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Asistencia insert" ON registro_asistencia_turno;
CREATE POLICY "Asistencia insert"
  ON registro_asistencia_turno FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Asistencia update" ON registro_asistencia_turno;
CREATE POLICY "Asistencia update"
  ON registro_asistencia_turno FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- SEED DATA: Tipos de Turno (A, B, C)
-- ============================================================
INSERT INTO tipos_turno (codigo, nombre, hora_inicio, hora_fin, es_nocturno, descripcion) VALUES
  ('A', 'Turno A', '07:00', '15:00', false, 'Turno diurno de 7am a 3pm'),
  ('B', 'Turno B', '15:00', '23:00', false, 'Turno de tarde de 3pm a 11pm'),
  ('C', 'Turno C', '23:00', '07:00', true, 'Turno nocturno de 11pm a 7am del día siguiente')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- ACTUALIZAR / CREAR FRENTE SANTA ROSA
-- ============================================================
-- Asegurar que existe el frente Santa Rosa
INSERT INTO frentes_trabajo (codigo, nombre, ubicacion, ciudad, departamento, activo)
VALUES (
  'FT-SR',
  'Santa Rosa',
  'Vereda Santa Rosa',
  'Santa Rosa de Osos',
  'Antioquia',
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  activo = true,
  nombre = 'Santa Rosa';

-- Desactivar otros frentes que no sean Santa Rosa (opcional)
-- UPDATE frentes_trabajo SET activo = false WHERE codigo != 'FT-SR';
