-- ============================================
-- SCRIPT CONSOLIDADO — PLATAFORMA SERVIEQUIPOS
-- ============================================
-- Fecha: 2026-11-21
-- Descripción: Cambios de esquema y datos para la plataforma.
--              Copiar TODO este archivo en el Supabase SQL Editor
--              y ejecutarlo UNA SOLA VEZ.
-- INSTRUCCIONES:
--   1. Pegar el contenido completo en el editor SQL.
--   2. Ejecutar.
--   3. Todos los scripts fuente son idempotentes.
-- NOTA: El script está envuelto en BEGIN/COMMIT.
-- ============================================

BEGIN;

-- ============================================
-- SECCIÓN 1: PERFILES Y ROLES
-- ============================================
-- ============================================
-- CREAR TABLA PERFILES Y FUNCIÓN es_admin()
-- ============================================

-- 1. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS perfiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'usuario')) DEFAULT 'usuario',
  nombre_mostrar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 2. FUNCIÓN HELPER: es_admin()
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE user_id = auth.uid() AND rol = 'admin'
  );
END;
$$;
-- ============================================
-- POLÍTICAS RLS CON ROLES (ADMIN / USUARIO)
-- Admin: CRUD total en todas las tablas
-- Usuario: Solo SELECT (lectura)
-- ============================================

-- ============================================
-- 1. TABLA DE PERFILES (vincula auth.users con rol)
-- ============================================
CREATE TABLE IF NOT EXISTS perfiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'usuario')) DEFAULT 'usuario',
  nombre_mostrar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede ver su propio perfil
DROP POLICY IF EXISTS "perfiles_select_own" ON perfiles;
CREATE POLICY "perfiles_select_own" ON perfiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Solo admins pueden modificar perfiles
DROP POLICY IF EXISTS "perfiles_update_admin" ON perfiles;
CREATE POLICY "perfiles_update_admin" ON perfiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin'));

-- Solo admins pueden insertar perfiles manualmente
DROP POLICY IF EXISTS "perfiles_insert_admin" ON perfiles;
CREATE POLICY "perfiles_insert_admin" ON perfiles
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND rol = 'admin'));

-- ============================================
-- 2. FUNCIÓN HELPER: es_admin()
-- ============================================
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE user_id = auth.uid() AND rol = 'admin'
  );
END;
$$;

-- ============================================
-- 3. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
DO $$ BEGIN
  -- TABLAS PRINCIPALES
  EXECUTE 'ALTER TABLE IF EXISTS maquinaria ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS trabajadores ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS vehiculos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS registros_horometro ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS registros_vehiculos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS mantenimientos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS mantenimientos_vehiculos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS documentos_trabajadores ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS documentos_vehiculos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS configuracion_alertas ENABLE ROW LEVEL SECURITY';

  -- TABLAS DE CATÁLOGO
  EXECUTE 'ALTER TABLE IF EXISTS cargos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS departamentos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS tipos_maquinaria ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS tipos_documentos_trabajador ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS tipos_documentos_vehiculo ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS comunicados ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS historial_trabajadores ENABLE ROW LEVEL SECURITY';
END $$;

-- ============================================
-- 4. POLÍTICAS RLS POR TABLA
-- Patrón: SELECT para todos, INSERT/UPDATE/DELETE solo admin
-- ============================================

-- 4.1 MAQUINARIA
DROP POLICY IF EXISTS "select_maquinaria" ON maquinaria;
CREATE POLICY "select_maquinaria" ON maquinaria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_maquinaria" ON maquinaria;
CREATE POLICY "insert_maquinaria" ON maquinaria FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "update_maquinaria" ON maquinaria;
CREATE POLICY "update_maquinaria" ON maquinaria FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_maquinaria" ON maquinaria;
CREATE POLICY "delete_maquinaria" ON maquinaria FOR DELETE TO authenticated USING (es_admin());

-- 4.2 TRABAJADORES
DROP POLICY IF EXISTS "select_trabajadores" ON trabajadores;
CREATE POLICY "select_trabajadores" ON trabajadores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_trabajadores" ON trabajadores;
CREATE POLICY "insert_trabajadores" ON trabajadores FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "update_trabajadores" ON trabajadores;
CREATE POLICY "update_trabajadores" ON trabajadores FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_trabajadores" ON trabajadores;
CREATE POLICY "delete_trabajadores" ON trabajadores FOR DELETE TO authenticated USING (es_admin());

-- 4.3 VEHÍCULOS
DROP POLICY IF EXISTS "select_vehiculos" ON vehiculos;
CREATE POLICY "select_vehiculos" ON vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_vehiculos" ON vehiculos;
CREATE POLICY "insert_vehiculos" ON vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "update_vehiculos" ON vehiculos;
CREATE POLICY "update_vehiculos" ON vehiculos FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_vehiculos" ON vehiculos;
CREATE POLICY "delete_vehiculos" ON vehiculos FOR DELETE TO authenticated USING (es_admin());

-- 4.4 REGISTROS HORÓMETRO (control diario maquinaria)
DROP POLICY IF EXISTS "select_registros_horometro" ON registros_horometro;
CREATE POLICY "select_registros_horometro" ON registros_horometro FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_registros_horometro" ON registros_horometro;
CREATE POLICY "insert_registros_horometro" ON registros_horometro FOR INSERT TO authenticated WITH CHECK (es_admin());

-- 4.5 REGISTROS VEHÍCULOS (control diario vehículos)
DROP POLICY IF EXISTS "select_registros_vehiculos" ON registros_vehiculos;
CREATE POLICY "select_registros_vehiculos" ON registros_vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_registros_vehiculos" ON registros_vehiculos;
CREATE POLICY "insert_registros_vehiculos" ON registros_vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());

-- 4.6 MANTENIMIENTOS (maquinaria)
DROP POLICY IF EXISTS "select_mantenimientos" ON mantenimientos;
CREATE POLICY "select_mantenimientos" ON mantenimientos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_mantenimientos" ON mantenimientos;
CREATE POLICY "insert_mantenimientos" ON mantenimientos FOR INSERT TO authenticated WITH CHECK (es_admin());

-- 4.7 MANTENIMIENTOS VEHÍCULOS
DROP POLICY IF EXISTS "select_mantenimientos_vehiculos" ON mantenimientos_vehiculos;
CREATE POLICY "select_mantenimientos_vehiculos" ON mantenimientos_vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_mantenimientos_vehiculos" ON mantenimientos_vehiculos;
CREATE POLICY "insert_mantenimientos_vehiculos" ON mantenimientos_vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());

-- 4.8 DOCUMENTOS TRABAJADORES
DROP POLICY IF EXISTS "select_documentos_trabajadores" ON documentos_trabajadores;
CREATE POLICY "select_documentos_trabajadores" ON documentos_trabajadores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_documentos_trabajadores" ON documentos_trabajadores;
CREATE POLICY "insert_documentos_trabajadores" ON documentos_trabajadores FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_documentos_trabajadores" ON documentos_trabajadores;
CREATE POLICY "delete_documentos_trabajadores" ON documentos_trabajadores FOR DELETE TO authenticated USING (es_admin());

-- 4.9 DOCUMENTOS VEHÍCULOS
DROP POLICY IF EXISTS "select_documentos_vehiculos" ON documentos_vehiculos;
CREATE POLICY "select_documentos_vehiculos" ON documentos_vehiculos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_documentos_vehiculos" ON documentos_vehiculos;
CREATE POLICY "insert_documentos_vehiculos" ON documentos_vehiculos FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_documentos_vehiculos" ON documentos_vehiculos;
CREATE POLICY "delete_documentos_vehiculos" ON documentos_vehiculos FOR DELETE TO authenticated USING (es_admin());

-- 4.10 CONFIGURACIÓN ALERTAS
DROP POLICY IF EXISTS "select_configuracion_alertas" ON configuracion_alertas;
CREATE POLICY "select_configuracion_alertas" ON configuracion_alertas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_configuracion_alertas" ON configuracion_alertas;
CREATE POLICY "insert_configuracion_alertas" ON configuracion_alertas FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "update_configuracion_alertas" ON configuracion_alertas;
CREATE POLICY "update_configuracion_alertas" ON configuracion_alertas FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- 4.11 CATÁLOGOS (solo lectura para authenticated)
DROP POLICY IF EXISTS "select_cargos" ON cargos;
CREATE POLICY "select_cargos" ON cargos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "select_departamentos" ON departamentos;
CREATE POLICY "select_departamentos" ON departamentos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "select_tipos_maquinaria" ON tipos_maquinaria;
CREATE POLICY "select_tipos_maquinaria" ON tipos_maquinaria FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "select_tipos_documentos_trabajador" ON tipos_documentos_trabajador;
CREATE POLICY "select_tipos_documentos_trabajador" ON tipos_documentos_trabajador FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "select_tipos_documentos_vehiculo" ON tipos_documentos_vehiculo;
CREATE POLICY "select_tipos_documentos_vehiculo" ON tipos_documentos_vehiculo FOR SELECT TO authenticated USING (true);

-- 4.12 COMUNICADOS
DROP POLICY IF EXISTS "select_comunicados" ON comunicados;
CREATE POLICY "select_comunicados" ON comunicados FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_comunicados" ON comunicados;
CREATE POLICY "insert_comunicados" ON comunicados FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "update_comunicados" ON comunicados;
CREATE POLICY "update_comunicados" ON comunicados FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "delete_comunicados" ON comunicados;
CREATE POLICY "delete_comunicados" ON comunicados FOR DELETE TO authenticated USING (es_admin());

-- 4.13 HISTORIAL TRABAJADORES
DROP POLICY IF EXISTS "select_historial_trabajadores" ON historial_trabajadores;
CREATE POLICY "select_historial_trabajadores" ON historial_trabajadores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_historial_trabajadores" ON historial_trabajadores;
CREATE POLICY "insert_historial_trabajadores" ON historial_trabajadores FOR INSERT TO authenticated WITH CHECK (es_admin());-- ============================================================
-- TABLA COMPARTIDA: TERCEROS
-- Fecha: 2026-06-14
-- Descripción: Catálogo unificado de personas/empresas
--              (clientes, proveedores, empleados, otros).
-- Dependencias: ninguna (ejecutar primero)
-- ============================================================

-----------------------------------------------
-- 1. TERCEROS
-----------------------------------------------
CREATE TABLE IF NOT EXISTS terceros (
  id BIGSERIAL PRIMARY KEY,
  tipo_documento TEXT NOT NULL DEFAULT 'NIT' CHECK (tipo_documento IN ('NIT', 'CC', 'CE', 'PA', 'TI')),
  numero_documento TEXT NOT NULL UNIQUE,
  digito_verificacion INTEGER DEFAULT NULL,
  nombre_completo TEXT NOT NULL,
  nombre_comercial TEXT,
  direccion TEXT,
  ciudad TEXT,
  departamento TEXT,
  telefono TEXT,
  email TEXT,
  regimen_iva TEXT DEFAULT 'comun' CHECK (regimen_iva IN ('comun', 'simplificado', 'no_responsable')),
  regimen_tributario TEXT DEFAULT 'ordinario' CHECK (regimen_tributario IN ('ordinario', 'especial')),
  autorretenedor BOOLEAN DEFAULT false,
  gran_contribuyente BOOLEAN DEFAULT false,
  auto_retenedor_renta BOOLEAN DEFAULT false,
  auto_retenedor_iva BOOLEAN DEFAULT false,
  tipo_tercero TEXT DEFAULT 'cliente',
  plazo_credito_dias INTEGER DEFAULT 30,
  cupo_credito NUMERIC(15,2) DEFAULT 0,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_terceros_documento ON terceros(tipo_documento, numero_documento);
CREATE INDEX IF NOT EXISTS idx_terceros_tipo ON terceros(tipo_tercero);
CREATE INDEX IF NOT EXISTS idx_terceros_activo ON terceros(activo);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE terceros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Terceros read all" ON terceros;
CREATE POLICY "Terceros read all" ON terceros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Terceros admin write" ON terceros;
CREATE POLICY "Terceros admin write" ON terceros FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Terceros admin update" ON terceros;
CREATE POLICY "Terceros admin update" ON terceros FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Terceros admin delete" ON terceros;
CREATE POLICY "Terceros admin delete" ON terceros FOR DELETE TO authenticated USING (es_admin());

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_terceros_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_terceros_updated_at ON terceros;
CREATE TRIGGER trg_terceros_updated_at BEFORE UPDATE ON terceros FOR EACH ROW EXECUTE FUNCTION update_terceros_updated_at();
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
DROP POLICY IF EXISTS "Admin full access frentes_trabajo" ON frentes_trabajo;
CREATE POLICY "Admin full access frentes_trabajo"
  ON frentes_trabajo
  FOR ALL
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

-- Usuario: read-only
DROP POLICY IF EXISTS "Usuario read frentes_trabajo" ON frentes_trabajo;
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
-- ============================================================
-- MÓDULO: FACTURACIÓN / CARTERA
-- Fecha: 2026-06-14
-- Descripción: Tablas para facturación electrónica DIAN,
--              cartera (cuentas por cobrar), recibos de caja,
--              notas crédito y notas débito.
-- Dependencias: terceros (definido en terceros_schema.sql)
-- ============================================================

-----------------------------------------------
-- 1. TIPO DE DOCUMENTOS DE FACTURA
-----------------------------------------------
CREATE TABLE IF NOT EXISTS tipo_documentos_factura (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,           -- FC, NC, ND
  nombre TEXT NOT NULL,
  prefijo TEXT NOT NULL,                 -- FCE, NCE, NDE
  resolucion_dian TEXT,                  -- Número de resolución de facturación
  resolucion_fecha DATE,
  rango_inicio INTEGER,
  rango_fin INTEGER,
  consecutivo_actual INTEGER DEFAULT 0,
  aplica_retencion_ica BOOLEAN DEFAULT false,
  aplica_retencion_fuente BOOLEAN DEFAULT false,
  aplica_retencion_iva BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 2. FACTURAS (cabecera)
-----------------------------------------------
CREATE TABLE IF NOT EXISTS facturas (
  id BIGSERIAL PRIMARY KEY,
  tipo_documento_id BIGINT NOT NULL REFERENCES tipo_documentos_factura(id) ON DELETE RESTRICT,
  numero_factura TEXT NOT NULL UNIQUE,
  prefijo TEXT NOT NULL,
  consecutivo INTEGER NOT NULL,
  tercero_id BIGINT NOT NULL REFERENCES terceros(id) ON DELETE RESTRICT,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(15,2) DEFAULT 0,
  base_iva NUMERIC(15,2) DEFAULT 0,
  iva NUMERIC(15,2) DEFAULT 0,
  base_retencion_fuente NUMERIC(15,2) DEFAULT 0,
  retencion_fuente NUMERIC(15,2) DEFAULT 0,
  retencion_ica NUMERIC(15,2) DEFAULT 0,
  retencion_iva NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'vencida', 'anulada', 'parcial')),
  notas TEXT,
  orden_servicio TEXT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comprobante_contable_id BIGINT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 3. ITEMS DE FACTURA
-----------------------------------------------
CREATE TABLE IF NOT EXISTS items_factura (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  codigo_item TEXT,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  unidad TEXT DEFAULT 'UNIDAD',
  valor_unitario NUMERIC(15,2) NOT NULL DEFAULT 0,
  descuento_item NUMERIC(15,2) DEFAULT 0,
  porcentaje_iva NUMERIC(5,2) DEFAULT 0,
  iva_item NUMERIC(15,2) DEFAULT 0,
  orden_mantenimiento_id BIGINT,
  maquinaria_id BIGINT,
  trabajador_id BIGINT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 4. RECIBOS DE CAJA (pagos/abonos)
-----------------------------------------------
CREATE TABLE IF NOT EXISTS recibos_caja (
  id BIGSERIAL PRIMARY KEY,
  numero_recibo TEXT NOT NULL UNIQUE,
  factura_id BIGINT NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  tercero_id BIGINT NOT NULL REFERENCES terceros(id) ON DELETE RESTRICT,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  valor_pagado NUMERIC(15,2) NOT NULL,
  valor_aplicado NUMERIC(15,2) NOT NULL,
  forma_pago TEXT NOT NULL CHECK (forma_pago IN ('efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito', 'consignacion')),
  numero_comprobante_transaccion TEXT,
  banco_origen TEXT,
  notas TEXT,
  comprobante_contable_id BIGINT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 5. NOTAS CRÉDITO
-----------------------------------------------
CREATE TABLE IF NOT EXISTS notas_credito (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  tipo_documento_id BIGINT NOT NULL REFERENCES tipo_documentos_factura(id) ON DELETE RESTRICT,
  numero_nota TEXT NOT NULL UNIQUE,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT NOT NULL,
  subtotal NUMERIC(15,2) DEFAULT 0,
  iva NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'aplicada', 'anulada')),
  comprobante_contable_id BIGINT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 6. NOTAS DÉBITO
-----------------------------------------------
CREATE TABLE IF NOT EXISTS notas_debito (
  id BIGSERIAL PRIMARY KEY,
  factura_id BIGINT NOT NULL REFERENCES facturas(id) ON DELETE RESTRICT,
  tipo_documento_id BIGINT NOT NULL REFERENCES tipo_documentos_factura(id) ON DELETE RESTRICT,
  numero_nota TEXT NOT NULL UNIQUE,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo TEXT NOT NULL,
  subtotal NUMERIC(15,2) DEFAULT 0,
  iva NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'aplicada', 'anulada')),
  comprobante_contable_id BIGINT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_facturas_tercero ON facturas(tercero_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas(fecha_emision, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_items_factura ON items_factura(factura_id);
CREATE INDEX IF NOT EXISTS idx_recibos_factura ON recibos_caja(factura_id);
CREATE INDEX IF NOT EXISTS idx_recibos_tercero ON recibos_caja(tercero_id);
CREATE INDEX IF NOT EXISTS idx_recibos_fecha ON recibos_caja(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_notas_credito_factura ON notas_credito(factura_id);
CREATE INDEX IF NOT EXISTS idx_notas_debito_factura ON notas_debito(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_vencimiento ON facturas(fecha_vencimiento) WHERE estado IN ('pendiente', 'parcial');

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE tipo_documentos_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_factura ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_debito ENABLE ROW LEVEL SECURITY;

-- Tipo documentos: lectura para todos, escritura admin
DROP POLICY IF EXISTS "Tipo documentos factura read all" ON tipo_documentos_factura;
CREATE POLICY "Tipo documentos factura read all"
  ON tipo_documentos_factura FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Tipo documentos factura admin write" ON tipo_documentos_factura;
CREATE POLICY "Tipo documentos factura admin write"
  ON tipo_documentos_factura FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Tipo documentos factura admin update" ON tipo_documentos_factura;
CREATE POLICY "Tipo documentos factura admin update"
  ON tipo_documentos_factura FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Tipo documentos factura admin delete" ON tipo_documentos_factura;
CREATE POLICY "Tipo documentos factura admin delete"
  ON tipo_documentos_factura FOR DELETE TO authenticated USING (es_admin());

-- Facturas: lectura todos, escritura admin
DROP POLICY IF EXISTS "Facturas read all" ON facturas;
CREATE POLICY "Facturas read all"
  ON facturas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Facturas admin write" ON facturas;
CREATE POLICY "Facturas admin write"
  ON facturas FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Facturas admin update" ON facturas;
CREATE POLICY "Facturas admin update"
  ON facturas FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Facturas admin delete" ON facturas;
CREATE POLICY "Facturas admin delete"
  ON facturas FOR DELETE TO authenticated USING (es_admin());

-- Items factura: lectura todos, escritura admin
DROP POLICY IF EXISTS "Items factura read all" ON items_factura;
CREATE POLICY "Items factura read all"
  ON items_factura FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Items factura admin write" ON items_factura;
CREATE POLICY "Items factura admin write"
  ON items_factura FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Items factura admin update" ON items_factura;
CREATE POLICY "Items factura admin update"
  ON items_factura FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Items factura admin delete" ON items_factura;
CREATE POLICY "Items factura admin delete"
  ON items_factura FOR DELETE TO authenticated USING (es_admin());

-- Recibos caja: lectura todos, escritura admin
DROP POLICY IF EXISTS "Recibos caja read all" ON recibos_caja;
CREATE POLICY "Recibos caja read all"
  ON recibos_caja FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Recibos caja admin write" ON recibos_caja;
CREATE POLICY "Recibos caja admin write"
  ON recibos_caja FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Recibos caja admin update" ON recibos_caja;
CREATE POLICY "Recibos caja admin update"
  ON recibos_caja FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Recibos caja admin delete" ON recibos_caja;
CREATE POLICY "Recibos caja admin delete"
  ON recibos_caja FOR DELETE TO authenticated USING (es_admin());

-- Notas crédito: lectura todos, escritura admin
DROP POLICY IF EXISTS "Notas credito read all" ON notas_credito;
CREATE POLICY "Notas credito read all"
  ON notas_credito FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Notas credito admin write" ON notas_credito;
CREATE POLICY "Notas credito admin write"
  ON notas_credito FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Notas credito admin update" ON notas_credito;
CREATE POLICY "Notas credito admin update"
  ON notas_credito FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Notas credito admin delete" ON notas_credito;
CREATE POLICY "Notas credito admin delete"
  ON notas_credito FOR DELETE TO authenticated USING (es_admin());

-- Notas débito: lectura todos, escritura admin
DROP POLICY IF EXISTS "Notas debito read all" ON notas_debito;
CREATE POLICY "Notas debito read all"
  ON notas_debito FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Notas debito admin write" ON notas_debito;
CREATE POLICY "Notas debito admin write"
  ON notas_debito FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Notas debito admin update" ON notas_debito;
CREATE POLICY "Notas debito admin update"
  ON notas_debito FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Notas debito admin delete" ON notas_debito;
CREATE POLICY "Notas debito admin delete"
  ON notas_debito FOR DELETE TO authenticated USING (es_admin());

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_tipo_documentos_factura_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tipo_documentos_factura_updated_at ON tipo_documentos_factura;
CREATE TRIGGER trg_tipo_documentos_factura_updated_at
  BEFORE UPDATE ON tipo_documentos_factura FOR EACH ROW EXECUTE FUNCTION update_tipo_documentos_factura_updated_at();

CREATE OR REPLACE FUNCTION update_facturas_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_facturas_updated_at ON facturas;
CREATE TRIGGER trg_facturas_updated_at
  BEFORE UPDATE ON facturas FOR EACH ROW EXECUTE FUNCTION update_facturas_updated_at();

CREATE OR REPLACE FUNCTION update_recibos_caja_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_recibos_caja_updated_at ON recibos_caja;
CREATE TRIGGER trg_recibos_caja_updated_at
  BEFORE UPDATE ON recibos_caja FOR EACH ROW EXECUTE FUNCTION update_recibos_caja_updated_at();

CREATE OR REPLACE FUNCTION update_notas_credito_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_notas_credito_updated_at ON notas_credito;
CREATE TRIGGER trg_notas_credito_updated_at
  BEFORE UPDATE ON notas_credito FOR EACH ROW EXECUTE FUNCTION update_notas_credito_updated_at();

CREATE OR REPLACE FUNCTION update_notas_debito_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_notas_debito_updated_at ON notas_debito;
CREATE TRIGGER trg_notas_debito_updated_at
  BEFORE UPDATE ON notas_debito FOR EACH ROW EXECUTE FUNCTION update_notas_debito_updated_at();

-- ============================================================
-- SEED DATA: tipos de documentos
-- ============================================================
INSERT INTO tipo_documentos_factura (codigo, nombre, prefijo, consecutivo_actual, aplica_retencion_ica, aplica_retencion_fuente) VALUES
  ('FC', 'Factura de Venta', 'FCE', 0, true, true),
  ('NC', 'Nota Crédito', 'NCE', 0, false, false),
  ('ND', 'Nota Débito', 'NDE', 0, false, false)
ON CONFLICT (codigo) DO NOTHING;
-- ============================================================
-- MÓDULO: CONTABILIDAD (Plan Único de Cuentas - PUC)
-- Fecha: 2026-06-14
-- Descripción: Plan de cuentas colombiano, tipos de comprobantes,
--              comprobantes contables y asientos contables (partida doble).
-- NOTA: tabla terceros está definida en terceros_schema.sql
-- ============================================================

-----------------------------------------------
-- 1. PLAN DE CUENTAS (PUC Colombiano)
-- NOTA: tabla terceros está definida en terceros_schema.sql
-----------------------------------------------
CREATE TABLE IF NOT EXISTS plan_cuentas (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,            -- Ej: 110505, 220505
  nombre TEXT NOT NULL,                    -- Nombre de la cuenta
  tipo TEXT NOT NULL CHECK (tipo IN ('activo', 'pasivo', 'patrimonio', 'ingreso', 'gasto', 'costo', 'cuenta_orden')),
  naturaleza TEXT NOT NULL CHECK (naturaleza IN ('debito', 'credito')),
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 8),
  codigo_padre TEXT REFERENCES plan_cuentas(codigo) ON DELETE SET NULL,
  activa BOOLEAN DEFAULT true,
  acepta_movimiento BOOLEAN DEFAULT true,
  descripcion TEXT,
  pide_tercero BOOLEAN DEFAULT false,
  pide_centro_costo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 3. TIPO DE COMPROBANTES
-----------------------------------------------
CREATE TABLE IF NOT EXISTS tipo_comprobantes (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  prefijo TEXT NOT NULL,                    -- Ej: CD, NC, ND, RC, EG
  descripcion TEXT,
  afecta TEXT NOT NULL CHECK (afecta IN ('ambos', 'debito', 'credito')),
  numeracion_automatica BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 4. COMPROBANTES (cabecera del asiento contable)
-----------------------------------------------
CREATE TABLE IF NOT EXISTS comprobantes (
  id BIGSERIAL PRIMARY KEY,
  tipo_comprobante_id BIGINT NOT NULL REFERENCES tipo_comprobantes(id) ON DELETE RESTRICT,
  numero_comprobante TEXT NOT NULL UNIQUE,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concepto TEXT NOT NULL,
  origen TEXT DEFAULT 'manual' CHECK (origen IN ('manual', 'nomina', 'facturacion', 'tesoreria', 'automatico')),
  referencia_origen_id BIGINT,
  referencia_origen_tipo TEXT,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado')),
  total_debito NUMERIC(15,2) DEFAULT 0,
  total_credito NUMERIC(15,2) DEFAULT 0,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anulado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_anulacion TIMESTAMPTZ,
  motivo_anulacion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 5. ASIENTOS CONTABLES (detalle / líneas del comprobante)
-----------------------------------------------
CREATE TABLE IF NOT EXISTS asientos_contables (
  id BIGSERIAL PRIMARY KEY,
  comprobante_id BIGINT NOT NULL REFERENCES comprobantes(id) ON DELETE CASCADE,
  cuenta_id BIGINT NOT NULL REFERENCES plan_cuentas(id) ON DELETE RESTRICT,
  tercero_id BIGINT REFERENCES terceros(id) ON DELETE SET NULL,
  descripcion TEXT,
  naturaleza TEXT NOT NULL CHECK (naturaleza IN ('debito', 'credito')),
  valor NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_codigo ON plan_cuentas(codigo);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_padre ON plan_cuentas(codigo_padre);
CREATE INDEX IF NOT EXISTS idx_plan_cuentas_tipo ON plan_cuentas(tipo);
CREATE INDEX IF NOT EXISTS idx_comprobantes_fecha ON comprobantes(fecha);
CREATE INDEX IF NOT EXISTS idx_comprobantes_tipo ON comprobantes(tipo_comprobante_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_origen ON comprobantes(origen, referencia_origen_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_numero ON comprobantes(numero_comprobante);
CREATE INDEX IF NOT EXISTS idx_asientos_comprobante ON asientos_contables(comprobante_id);
CREATE INDEX IF NOT EXISTS idx_asientos_cuenta ON asientos_contables(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_asientos_tercero ON asientos_contables(tercero_id);
-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE plan_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asientos_contables ENABLE ROW LEVEL SECURITY;

-- Plan cuentas: lectura todos, escritura admin
DROP POLICY IF EXISTS "Plan cuentas read all" ON plan_cuentas;
CREATE POLICY "Plan cuentas read all" ON plan_cuentas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Plan cuentas admin write" ON plan_cuentas;
CREATE POLICY "Plan cuentas admin write" ON plan_cuentas FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Plan cuentas admin update" ON plan_cuentas;
CREATE POLICY "Plan cuentas admin update" ON plan_cuentas FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Plan cuentas admin delete" ON plan_cuentas;
CREATE POLICY "Plan cuentas admin delete" ON plan_cuentas FOR DELETE TO authenticated USING (es_admin());

-- Tipo comprobantes: lectura todos, escritura admin
DROP POLICY IF EXISTS "Tipo comprobantes read all" ON tipo_comprobantes;
CREATE POLICY "Tipo comprobantes read all" ON tipo_comprobantes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Tipo comprobantes admin write" ON tipo_comprobantes;
CREATE POLICY "Tipo comprobantes admin write" ON tipo_comprobantes FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Tipo comprobantes admin update" ON tipo_comprobantes;
CREATE POLICY "Tipo comprobantes admin update" ON tipo_comprobantes FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Tipo comprobantes admin delete" ON tipo_comprobantes;
CREATE POLICY "Tipo comprobantes admin delete" ON tipo_comprobantes FOR DELETE TO authenticated USING (es_admin());

-- Comprobantes: lectura todos, escritura admin
DROP POLICY IF EXISTS "Comprobantes read all" ON comprobantes;
CREATE POLICY "Comprobantes read all" ON comprobantes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Comprobantes admin write" ON comprobantes;
CREATE POLICY "Comprobantes admin write" ON comprobantes FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Comprobantes admin update" ON comprobantes;
CREATE POLICY "Comprobantes admin update" ON comprobantes FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Comprobantes admin delete" ON comprobantes;
CREATE POLICY "Comprobantes admin delete" ON comprobantes FOR DELETE TO authenticated USING (es_admin());

-- Asientos: lectura todos, escritura admin
DROP POLICY IF EXISTS "Asientos read all" ON asientos_contables;
CREATE POLICY "Asientos read all" ON asientos_contables FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Asientos admin write" ON asientos_contables;
CREATE POLICY "Asientos admin write" ON asientos_contables FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Asientos admin update" ON asientos_contables;
CREATE POLICY "Asientos admin update" ON asientos_contables FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Asientos admin delete" ON asientos_contables;
CREATE POLICY "Asientos admin delete" ON asientos_contables FOR DELETE TO authenticated USING (es_admin());

-- ============================================================
-- TRIGGERS updated_at
-- NOTA: trigger de terceros está en terceros_schema.sql
-- ============================================================
CREATE OR REPLACE FUNCTION update_plan_cuentas_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_plan_cuentas_updated_at ON plan_cuentas;
CREATE TRIGGER trg_plan_cuentas_updated_at BEFORE UPDATE ON plan_cuentas FOR EACH ROW EXECUTE FUNCTION update_plan_cuentas_updated_at();

CREATE OR REPLACE FUNCTION update_tipo_comprobantes_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tipo_comprobantes_updated_at ON tipo_comprobantes;
CREATE TRIGGER trg_tipo_comprobantes_updated_at BEFORE UPDATE ON tipo_comprobantes FOR EACH ROW EXECUTE FUNCTION update_tipo_comprobantes_updated_at();

CREATE OR REPLACE FUNCTION update_comprobantes_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_comprobantes_updated_at ON comprobantes;
CREATE TRIGGER trg_comprobantes_updated_at BEFORE UPDATE ON comprobantes FOR EACH ROW EXECUTE FUNCTION update_comprobantes_updated_at();

-- ============================================================
-- SEED DATA: Tipo de comprobantes
-- ============================================================
INSERT INTO tipo_comprobantes (codigo, nombre, prefijo, afecta, descripcion) VALUES
  ('CD', 'Comprobante Diario', 'CD', 'ambos', 'Comprobante de contabilidad general'),
  ('NC', 'Nota de Crédito', 'NC', 'credito', 'Nota de crédito contable'),
  ('ND', 'Nota de Débito', 'ND', 'debito', 'Nota de débito contable'),
  ('RC', 'Recibo de Caja', 'RC', 'debito', 'Recibo de ingreso de caja/banco'),
  ('EG', 'Egreso', 'EG', 'credito', 'Comprobante de egreso o transferencia'),
  ('NO', 'Nómina', 'NO', 'ambos', 'Asiento automático de nómina'),
  ('FC', 'Facturación', 'FC', 'credito', 'Asiento automático de facturación')
ON CONFLICT (codigo) DO NOTHING;
-- ============================================================
-- MÓDULO: NÓMINA (Liquidación de nómina colombiana)
-- Fecha: 2026-06-14
-- Descripción: Tipos de novedades, períodos de nómina,
--              liquidación de nómina con devengos, deducciones
--              y aportes empleador, detalle itemizado, y
--              liquidación de prestaciones sociales (prima,
--              cesantías, intereses, vacaciones).
-- Dependencias: trabajadores (existente)
-- ============================================================

-----------------------------------------------
-- 1. CATÁLOGO: tipo_novedades
-----------------------------------------------
CREATE TABLE IF NOT EXISTS tipo_novedades (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('devengo', 'deduccion', 'otro')),
  afecta_salud BOOLEAN DEFAULT false,
  afecta_pension BOOLEAN DEFAULT false,
  afecta_arl BOOLEAN DEFAULT false,
  afecta_parafiscales BOOLEAN DEFAULT false,
  afecta_prestaciones BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 2. NOVEDADES DE NÓMINA
-----------------------------------------------
CREATE TABLE IF NOT EXISTS novedades_nomina (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo_novedad_id BIGINT NOT NULL REFERENCES tipo_novedades(id) ON DELETE RESTRICT,
  periodo_nomina_id BIGINT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  dias INTEGER,
  valor NUMERIC(15,2) DEFAULT 0,
  descripcion TEXT,
  documento_soporte TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha_aprobacion TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 3. PERIODOS DE NÓMINA
-----------------------------------------------
CREATE TABLE IF NOT EXISTS periodos_nomina (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'quincenal' CHECK (tipo IN ('semanal', 'decadual', 'quincenal', 'mensual')),
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  numero_periodo INTEGER NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_pago DATE,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'liquidado', 'anulado')),
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observaciones TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ano, mes, numero_periodo)
);

-----------------------------------------------
-- 4. NÓMINAS (cabecera de liquidación por trabajador)
-----------------------------------------------
CREATE TABLE IF NOT EXISTS nominas (
  id BIGSERIAL PRIMARY KEY,
  periodo_nomina_id BIGINT NOT NULL REFERENCES periodos_nomina(id) ON DELETE RESTRICT,
  trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE RESTRICT,
  codigo_nomina TEXT NOT NULL UNIQUE,
  salario_base NUMERIC(15,2) NOT NULL,
  dias_laborados INTEGER NOT NULL DEFAULT 30,
  -- Devengos
  sueldo_basico NUMERIC(15,2) DEFAULT 0,
  auxilio_transporte NUMERIC(15,2) DEFAULT 0,
  horas_extras_diurnas NUMERIC(15,2) DEFAULT 0,
  horas_extras_nocturnas NUMERIC(15,2) DEFAULT 0,
  horas_extras_dominicales NUMERIC(15,2) DEFAULT 0,
  horas_recargo_nocturno NUMERIC(15,2) DEFAULT 0,
  horas_recargo_dominical NUMERIC(15,2) DEFAULT 0,
  comisiones NUMERIC(15,2) DEFAULT 0,
  bonificaciones NUMERIC(15,2) DEFAULT 0,
  otros_devengos NUMERIC(15,2) DEFAULT 0,
  -- Deducciones
  deduccion_salud NUMERIC(15,2) DEFAULT 0,
  deduccion_pension NUMERIC(15,2) DEFAULT 0,
  deduccion_arl NUMERIC(15,2) DEFAULT 0,
  deduccion_fondo_solidaridad NUMERIC(15,2) DEFAULT 0,
  deduccion_fondo_subsistencia NUMERIC(15,2) DEFAULT 0,
  embargos NUMERIC(15,2) DEFAULT 0,
  libranzas NUMERIC(15,2) DEFAULT 0,
  otras_deducciones NUMERIC(15,2) DEFAULT 0,
  -- Aportes empleador
  aporte_salud_empleador NUMERIC(15,2) DEFAULT 0,
  aporte_pension_empleador NUMERIC(15,2) DEFAULT 0,
  aporte_arl_empleador NUMERIC(15,2) DEFAULT 0,
  aporte_caja_compensacion NUMERIC(15,2) DEFAULT 0,
  aporte_sena NUMERIC(15,2) DEFAULT 0,
  aporte_icbf NUMERIC(15,2) DEFAULT 0,
  -- Pagado
  pagado BOOLEAN DEFAULT false,
  fecha_pago TIMESTAMPTZ,
  medio_pago TEXT CHECK (medio_pago IN ('transferencia', 'cheque', 'efectivo', 'consignacion')),
  numero_comprobante TEXT,
  comprobante_contable_id BIGINT,
  observaciones TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 5. DETALLE DE NÓMINA (itemizado)
-----------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_nomina (
  id BIGSERIAL PRIMARY KEY,
  nomina_id BIGINT NOT NULL REFERENCES nominas(id) ON DELETE CASCADE,
  tipo_registro TEXT NOT NULL CHECK (tipo_registro IN ('devengo', 'deduccion', 'aporte_empleador')),
  concepto TEXT NOT NULL,
  referencia_tipo_novedad_id BIGINT REFERENCES tipo_novedades(id) ON DELETE SET NULL,
  dias INTEGER,
  horas NUMERIC(8,2),
  porcentaje NUMERIC(5,2),
  base_calculo NUMERIC(15,2),
  valor NUMERIC(15,2) NOT NULL,
  formula TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-----------------------------------------------
-- 6. LIQUIDACIÓN DE PRESTACIONES SOCIALES
-----------------------------------------------
CREATE TABLE IF NOT EXISTS liquidacion_prestaciones (
  id BIGSERIAL PRIMARY KEY,
  trabajador_id BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  tipo_liquidacion TEXT NOT NULL CHECK (tipo_liquidacion IN ('prima', 'cesantias', 'intereses_cesantias', 'vacaciones', 'retiro_total', 'liquidacion_anual')),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  salario_base NUMERIC(15,2) NOT NULL,
  auxilio_transporte_base NUMERIC(15,2) DEFAULT 0,
  dias_trabajados INTEGER NOT NULL,
  valor_calculado NUMERIC(15,2) NOT NULL,
  valor_pagado NUMERIC(15,2) DEFAULT 0,
  fecha_pago DATE,
  pagado BOOLEAN DEFAULT false,
  comprobante_contable_id BIGINT,
  observaciones TEXT,
  nomina_id BIGINT REFERENCES nominas(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FK DIFERIDA: periodo_nomina_id es FK después de crear periodos_nomina
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'novedades_nomina_periodo_nomina_id_fkey'
  ) THEN
    ALTER TABLE novedades_nomina
      ADD CONSTRAINT novedades_nomina_periodo_nomina_id_fkey
      FOREIGN KEY (periodo_nomina_id) REFERENCES periodos_nomina(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_nominas_periodo ON nominas(periodo_nomina_id);
CREATE INDEX IF NOT EXISTS idx_nominas_trabajador ON nominas(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_nominas_pagado ON nominas(pagado) WHERE pagado = false;
CREATE INDEX IF NOT EXISTS idx_novedades_trabajador ON novedades_nomina(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_novedades_periodo ON novedades_nomina(periodo_nomina_id);
CREATE INDEX IF NOT EXISTS idx_novedades_estado ON novedades_nomina(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_nomina ON detalle_nomina(nomina_id);
CREATE INDEX IF NOT EXISTS idx_prestaciones_trabajador ON liquidacion_prestaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_prestaciones_tipo ON liquidacion_prestaciones(tipo_liquidacion);
CREATE INDEX IF NOT EXISTS idx_periodos_nomina_fechas ON periodos_nomina(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_periodos_nomina_estado ON periodos_nomina(estado);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE tipo_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE novedades_nomina ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodos_nomina ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_nomina ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidacion_prestaciones ENABLE ROW LEVEL SECURITY;

-- Tipo novedades: lectura todos, escritura admin
DROP POLICY IF EXISTS "Tipo novedades read all" ON tipo_novedades;
CREATE POLICY "Tipo novedades read all" ON tipo_novedades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Tipo novedades admin write" ON tipo_novedades;
CREATE POLICY "Tipo novedades admin write" ON tipo_novedades FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Tipo novedades admin update" ON tipo_novedades;
CREATE POLICY "Tipo novedades admin update" ON tipo_novedades FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Tipo novedades admin delete" ON tipo_novedades;
CREATE POLICY "Tipo novedades admin delete" ON tipo_novedades FOR DELETE TO authenticated USING (es_admin());

-- Novedades nómina: lectura todos, inserción/actualización authenticated (como asistencia), admin delete
DROP POLICY IF EXISTS "Novedades nomina read all" ON novedades_nomina;
CREATE POLICY "Novedades nomina read all" ON novedades_nomina FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Novedades nomina insert" ON novedades_nomina;
CREATE POLICY "Novedades nomina insert" ON novedades_nomina FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Novedades nomina update" ON novedades_nomina;
CREATE POLICY "Novedades nomina update" ON novedades_nomina FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Novedades nomina admin delete" ON novedades_nomina;
CREATE POLICY "Novedades nomina admin delete" ON novedades_nomina FOR DELETE TO authenticated USING (es_admin());

-- Periodos nómina: lectura todos, escritura admin
DROP POLICY IF EXISTS "Periodos nomina read all" ON periodos_nomina;
CREATE POLICY "Periodos nomina read all" ON periodos_nomina FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Periodos nomina admin write" ON periodos_nomina;
CREATE POLICY "Periodos nomina admin write" ON periodos_nomina FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Periodos nomina admin update" ON periodos_nomina;
CREATE POLICY "Periodos nomina admin update" ON periodos_nomina FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Periodos nomina admin delete" ON periodos_nomina;
CREATE POLICY "Periodos nomina admin delete" ON periodos_nomina FOR DELETE TO authenticated USING (es_admin());

-- Nóminas: lectura todos, escritura admin
DROP POLICY IF EXISTS "Nominas read all" ON nominas;
CREATE POLICY "Nominas read all" ON nominas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Nominas admin write" ON nominas;
CREATE POLICY "Nominas admin write" ON nominas FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Nominas admin update" ON nominas;
CREATE POLICY "Nominas admin update" ON nominas FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Nominas admin delete" ON nominas;
CREATE POLICY "Nominas admin delete" ON nominas FOR DELETE TO authenticated USING (es_admin());

-- Detalle nómina: lectura todos, escritura admin
DROP POLICY IF EXISTS "Detalle nomina read all" ON detalle_nomina;
CREATE POLICY "Detalle nomina read all" ON detalle_nomina FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Detalle nomina admin write" ON detalle_nomina;
CREATE POLICY "Detalle nomina admin write" ON detalle_nomina FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Detalle nomina admin update" ON detalle_nomina;
CREATE POLICY "Detalle nomina admin update" ON detalle_nomina FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Detalle nomina admin delete" ON detalle_nomina;
CREATE POLICY "Detalle nomina admin delete" ON detalle_nomina FOR DELETE TO authenticated USING (es_admin());

-- Liquidación prestaciones: lectura todos, escritura admin
DROP POLICY IF EXISTS "Prestaciones read all" ON liquidacion_prestaciones;
CREATE POLICY "Prestaciones read all" ON liquidacion_prestaciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Prestaciones admin write" ON liquidacion_prestaciones;
CREATE POLICY "Prestaciones admin write" ON liquidacion_prestaciones FOR INSERT TO authenticated WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Prestaciones admin update" ON liquidacion_prestaciones;
CREATE POLICY "Prestaciones admin update" ON liquidacion_prestaciones FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
DROP POLICY IF EXISTS "Prestaciones admin delete" ON liquidacion_prestaciones;
CREATE POLICY "Prestaciones admin delete" ON liquidacion_prestaciones FOR DELETE TO authenticated USING (es_admin());

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_tipo_novedades_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tipo_novedades_updated_at ON tipo_novedades;
CREATE TRIGGER trg_tipo_novedades_updated_at BEFORE UPDATE ON tipo_novedades FOR EACH ROW EXECUTE FUNCTION update_tipo_novedades_updated_at();

CREATE OR REPLACE FUNCTION update_novedades_nomina_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_novedades_nomina_updated_at ON novedades_nomina;
CREATE TRIGGER trg_novedades_nomina_updated_at BEFORE UPDATE ON novedades_nomina FOR EACH ROW EXECUTE FUNCTION update_novedades_nomina_updated_at();

CREATE OR REPLACE FUNCTION update_periodos_nomina_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_periodos_nomina_updated_at ON periodos_nomina;
CREATE TRIGGER trg_periodos_nomina_updated_at BEFORE UPDATE ON periodos_nomina FOR EACH ROW EXECUTE FUNCTION update_periodos_nomina_updated_at();

CREATE OR REPLACE FUNCTION update_nominas_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_nominas_updated_at ON nominas;
CREATE TRIGGER trg_nominas_updated_at BEFORE UPDATE ON nominas FOR EACH ROW EXECUTE FUNCTION update_nominas_updated_at();

CREATE OR REPLACE FUNCTION update_liquidacion_prestaciones_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_liquidacion_prestaciones_updated_at ON liquidacion_prestaciones;
CREATE TRIGGER trg_liquidacion_prestaciones_updated_at BEFORE UPDATE ON liquidacion_prestaciones FOR EACH ROW EXECUTE FUNCTION update_liquidacion_prestaciones_updated_at();

-- ============================================================
-- SEED DATA: Tipos de novedades estándar colombianos
-- ============================================================
INSERT INTO tipo_novedades (codigo, nombre, tipo, afecta_salud, afecta_pension, afecta_arl, afecta_parafiscales, afecta_prestaciones, descripcion) VALUES
  ('INC_GRAL', 'Incapacidad General', 'deduccion', true, true, true, true, true, 'Incapacidad de origen común (días no laborados)'),
  ('INC_LABORAL', 'Incapacidad Laboral', 'deduccion', true, true, true, true, true, 'Incapacidad de origen laboral'),
  ('LIC_MATERNIDAD', 'Licencia Maternidad', 'devengo', true, true, true, true, true, 'Licencia de maternidad (18 semanas)'),
  ('LIC_PATERNIDAD', 'Licencia Paternidad', 'devengo', true, true, true, true, true, 'Licencia de paternidad'),
  ('PERMISO_R', 'Permiso Remunerado', 'devengo', true, true, true, true, true, 'Permiso remunerado'),
  ('PERMISO_NR', 'Permiso No Remunerado', 'deduccion', false, false, false, false, false, 'Permiso sin sueldo'),
  ('BONO', 'Bonificación', 'devengo', false, false, false, false, true, 'Bonificación extralegal'),
  ('HORA_EXTRA_D', 'Hora Extra Diurna', 'devengo', true, true, true, true, true, 'Hora extra diurna (25% recargo)'),
  ('HORA_EXTRA_N', 'Hora Extra Nocturna', 'devengo', true, true, true, true, true, 'Hora extra nocturna (75% recargo)'),
  ('HORA_EXTRA_DOM', 'Hora Extra Dominical', 'devengo', true, true, true, true, true, 'Hora extra en domingo o festivo'),
  ('COMISION', 'Comisión', 'devengo', true, true, true, true, true, 'Comisiones por ventas o gestión'),
  ('EMBARGO', 'Embargo Judicial', 'deduccion', false, false, false, false, false, 'Embargo judicial'),
  ('LIBRANZA', 'Libranza', 'deduccion', false, false, false, false, false, 'Descuento por libranza'),
  ('APORTE_SALUD', 'Aporte a Salud (4%)', 'deduccion', false, false, false, false, false, 'Cotización del trabajador al sistema de salud'),
  ('APORTE_PENSION', 'Aporte a Pensión (4%)', 'deduccion', false, false, false, false, false, 'Cotización del trabajador al sistema de pensiones'),
  ('FONDO_SOLIDARIDAD', 'Fondo Solidaridad Pensional', 'deduccion', false, false, false, false, false, 'Aporte solidario (salarios > 4 SMMLV)')
ON CONFLICT (codigo) DO NOTHING;
-- ============================================
-- MÓDULO: ÓRDENES DE MANTENIMIENTO
-- ============================================

CREATE TABLE IF NOT EXISTS ordenes_mantenimiento (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descripcion TEXT,

  maquinaria_id BIGINT REFERENCES maquinaria(id) ON DELETE SET NULL,
  vehiculo_id BIGINT REFERENCES vehiculos(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL DEFAULT 'preventivo'
    CHECK (tipo IN ('preventivo', 'correctivo', 'predictivo')),

  prioridad TEXT NOT NULL DEFAULT 'media'
    CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),

  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_proceso', 'completado', 'cancelado')),

  frente_trabajo_id BIGINT REFERENCES frentes_trabajo(id) ON DELETE SET NULL,
  responsable_id BIGINT REFERENCES trabajadores(id) ON DELETE SET NULL,

  fecha_programada DATE NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,

  horometro_actual NUMERIC(10,1),
  costo_estimado NUMERIC(12,0),
  costo_real NUMERIC(12,0),

  observaciones TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_mantenimiento(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_maquinaria ON ordenes_mantenimiento(maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_frente ON ordenes_mantenimiento(frente_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_programada ON ordenes_mantenimiento(fecha_programada);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_ordenes_mantenimiento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ordenes_mantenimiento_updated_at ON ordenes_mantenimiento;
CREATE TRIGGER trg_ordenes_mantenimiento_updated_at
  BEFORE UPDATE ON ordenes_mantenimiento
  FOR EACH ROW
  EXECUTE FUNCTION update_ordenes_mantenimiento_updated_at();

-- Función para auto-generar código de orden
CREATE OR REPLACE FUNCTION generar_codigo_orden_mantenimiento()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(REGEXP_REPLACE(codigo, '[^0-9]', '', 'g')::INTEGER), 0) + 1
  INTO next_num
  FROM ordenes_mantenimiento;
  NEW.codigo := 'OM-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ordenes_mantenimiento_codigo ON ordenes_mantenimiento;
CREATE TRIGGER trg_ordenes_mantenimiento_codigo
  BEFORE INSERT ON ordenes_mantenimiento
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL OR NEW.codigo = '')
  EXECUTE FUNCTION generar_codigo_orden_mantenimiento();
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
-- ============================================
-- MIGRACIÓN: Filtros de Aire - Maquinaria
-- Agrega seguimiento de cambio de filtros de aire
-- con alertas basadas en condición del operador
-- ============================================

-- 1. Columnas en maquinaria para tracking de filtro de aire
ALTER TABLE maquinaria
ADD COLUMN IF NOT EXISTS ultimo_cambio_filtro_aire_horometro NUMERIC,
ADD COLUMN IF NOT EXISTS ultimo_cambio_filtro_aire_fecha DATE,
ADD COLUMN IF NOT EXISTS ultima_condicion_filtro_aire TEXT
  CHECK (ultima_condicion_filtro_aire IN ('buena', 'regular', 'critica'));

-- 2. Columna en registros_horometro para condición reportada por operador
ALTER TABLE registros_horometro
ADD COLUMN IF NOT EXISTS condicion_filtro_aire TEXT
  CHECK (condicion_filtro_aire IN ('buena', 'regular', 'critica'));
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
-- ============================================================
-- MIGRACIÓN: Posiciones GPS de Maquinaria
-- Fecha: 2026-06-14
-- Descripción: Tabla para almacenar posiciones GPS reales
--              de maquinaria, reemplazando la simulación
--              client-side en la página de ubicación.
-- ============================================================

-- 1. Crear tabla de posiciones
CREATE TABLE IF NOT EXISTS posiciones_maquinaria (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  maquinaria_id BIGINT NOT NULL REFERENCES maquinaria(id) ON DELETE CASCADE,
  latitud DOUBLE PRECISION NOT NULL,
  longitud DOUBLE PRECISION NOT NULL,
  velocidad DOUBLE PRECISION DEFAULT 0,          -- km/h
  bateria DOUBLE PRECISION DEFAULT 100,           -- porcentaje 0-100
  precision DOUBLE PRECISION DEFAULT 0,           -- metros
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fuente TEXT DEFAULT 'gps',                      -- 'gps', 'manual', 'browser'
  usuario_id UUID REFERENCES auth.users(id)
);

-- 2. Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_posiciones_maquinaria_id
  ON posiciones_maquinaria(maquinaria_id);

CREATE INDEX IF NOT EXISTS idx_posiciones_timestamp
  ON posiciones_maquinaria(timestamp DESC);

-- 3. Vista: Última posición de cada máquina
CREATE OR REPLACE VIEW vw_ultimas_posiciones AS
SELECT DISTINCT ON (p.maquinaria_id)
  p.id,
  p.maquinaria_id,
  p.latitud,
  p.longitud,
  p.velocidad,
  p.bateria,
  p.precision,
  p.timestamp,
  p.fuente,
  m.codigo_interno,
  m.nombre AS maquina_nombre,
  m.estado,
  m.marca,
  m.modelo,
  m.placa,
  mt.nombre AS tipo_maquinaria
FROM posiciones_maquinaria p
JOIN maquinaria m ON m.id = p.maquinaria_id
LEFT JOIN tipos_maquinaria mt ON mt.id = m.tipo_maquinaria_id
WHERE m.activo = true
ORDER BY p.maquinaria_id, p.timestamp DESC;

-- 4. RLS
ALTER TABLE posiciones_maquinaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer posiciones" ON posiciones_maquinaria;
CREATE POLICY "Usuarios autenticados pueden leer posiciones"
  ON posiciones_maquinaria FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar posiciones" ON posiciones_maquinaria;
CREATE POLICY "Usuarios autenticados pueden insertar posiciones"
  ON posiciones_maquinaria FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Solo admin puede actualizar/eliminar posiciones" ON posiciones_maquinaria;
CREATE POLICY "Solo admin puede actualizar/eliminar posiciones"
  ON posiciones_maquinaria FOR UPDATE
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

DROP POLICY IF EXISTS "Solo admin puede eliminar posiciones" ON posiciones_maquinaria;
CREATE POLICY "Solo admin puede eliminar posiciones"
  ON posiciones_maquinaria FOR DELETE
  TO authenticated
  USING (es_admin());
-- ════════════════════════════════════════════════════════════════
-- audit_log — Tabla de auditoría de cambios
-- ════════════════════════════════════════════════════════════════
-- Registra automáticamente INSERT / UPDATE / DELETE
-- en las tablas críticas del sistema.
-- ════════════════════════════════════════════════════════════════

-- 1. Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- 2. Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
BEGIN
  -- Intentar obtener el usuario desde la variable de sesión de Supabase
  _user_id := auth.uid();
  _user_email := (SELECT email FROM auth.users WHERE id = auth.uid());

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, record_id, new_data, user_id, user_email)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, row_to_json(NEW)::jsonb, _user_id, _user_email);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, user_id, user_email)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, _user_id, _user_email);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, user_id, user_email)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, row_to_json(OLD)::jsonb, _user_id, _user_email);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar triggers a tablas críticas
-- Tablas operativas
DROP TRIGGER IF EXISTS audit_maquinaria ON maquinaria;
CREATE TRIGGER audit_maquinaria
  AFTER INSERT OR UPDATE OR DELETE ON maquinaria
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_trabajadores ON trabajadores;
CREATE TRIGGER audit_trabajadores
  AFTER INSERT OR UPDATE OR DELETE ON trabajadores
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_vehiculos ON vehiculos;
CREATE TRIGGER audit_vehiculos
  AFTER INSERT OR UPDATE OR DELETE ON vehiculos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Tablas financieras
DROP TRIGGER IF EXISTS audit_facturas ON facturas;
CREATE TRIGGER audit_facturas
  AFTER INSERT OR UPDATE OR DELETE ON facturas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_recibos_caja ON recibos_caja;
CREATE TRIGGER audit_recibos_caja
  AFTER INSERT OR UPDATE OR DELETE ON recibos_caja
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_comprobantes ON comprobantes;
CREATE TRIGGER audit_comprobantes
  AFTER INSERT OR UPDATE OR DELETE ON comprobantes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_asientos_contables ON asientos_contables;
CREATE TRIGGER audit_asientos_contables
  AFTER INSERT OR UPDATE OR DELETE ON asientos_contables
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Tablas de nómina
DROP TRIGGER IF EXISTS audit_nominas ON nominas;
CREATE TRIGGER audit_nominas
  AFTER INSERT OR UPDATE OR DELETE ON nominas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_novedades_nomina ON novedades_nomina;
CREATE TRIGGER audit_novedades_nomina
  AFTER INSERT OR UPDATE OR DELETE ON novedades_nomina
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Tablas de mantenimiento
DROP TRIGGER IF EXISTS audit_ordenes_mantenimiento ON ordenes_mantenimiento;
CREATE TRIGGER audit_ordenes_mantenimiento
  AFTER INSERT OR UPDATE OR DELETE ON ordenes_mantenimiento
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_checklist_diario ON checklist_diario_maquinaria;
CREATE TRIGGER audit_checklist_diario
  AFTER INSERT OR UPDATE OR DELETE ON checklist_diario_maquinaria
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 4. RLS para audit_log (solo admin puede leer)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log admin select" ON audit_log;
CREATE POLICY "audit_log admin select"
  ON audit_log FOR SELECT
  TO authenticated
  USING (es_admin());

-- 5. Vista resumen para consultas rápidas
CREATE OR REPLACE VIEW vw_audit_resumen AS
SELECT
  id,
  table_name,
  operation,
  record_id,
  user_email,
  created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 500;
-- Reemplazar tipos de documentos de empleados
-- 1. Desactivar tipos antiguos
UPDATE tipos_documentos_trabajador SET activo = false WHERE nombre IN ('Certificado EPS', 'CCF', 'AFP');

-- 2. Agregar nuevos tipos
INSERT INTO tipos_documentos_trabajador (nombre, requiere_vencimiento, activo) VALUES
  ('Aportes en la empresa', true, true),
  ('Certificado curso de seguridad', true, true),
  ('Autorización prueba de alcoholemia', false, true),
  ('Certificación bancaria', true, true),
  ('Certificados', false, true)
ON CONFLICT (nombre) DO NOTHING;
-- ============================================
-- MIGRACIÓN: Columnas de umbrales
-- Agrega columnas de configuración de umbrales
-- de mantenimiento a la tabla existente.
-- ============================================

ALTER TABLE configuracion_alertas
ADD COLUMN IF NOT EXISTS horometro_maximo NUMERIC,
ADD COLUMN IF NOT EXISTS intervalo_cambio_aceite NUMERIC DEFAULT 300,
ADD COLUMN IF NOT EXISTS intervalo_cambio_filtros NUMERIC DEFAULT 120;
-- ============================================================
-- SEED: Plan Único de Cuentas (PUC Colombiano)
-- Fecha: 2026-06-14
-- Basado en el PUC estándar colombiano para empresas comerciales
-- Niveles: 1=Clase, 2=Grupo, 3=Cuenta, 4=Subcuenta
-- ============================================================

-- ======================================================================
-- CLASE 1: ACTIVO
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1', 'ACTIVO', 'activo', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('11', 'DISPONIBLE', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1105', 'CAJA', 'activo', 'debito', 3, false, '11') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('110505', 'Caja General', 'activo', 'debito', 4, true, '1105', false) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1110', 'BANCOS', 'activo', 'debito', 3, false, '11') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('111005', 'Bancos Moneda Nacional', 'activo', 'debito', 4, true, '1110', true) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('13', 'DEUDORES', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1305', 'CLIENTES', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('130505', 'Clientes Nacionales', 'activo', 'debito', 4, true, '1305', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1310', 'CUENTAS CORRIENTES COMERCIALES', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('131005', 'Cuentas Corrientes Comerciales', 'activo', 'debito', 4, true, '1310', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1365', 'CUENTAS POR COBRAR A TRABAJADORES', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('136505', 'Prestamos a Trabajadores', 'activo', 'debito', 4, true, '1365', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1372', 'ANTICIPOS DE IMPUESTOS', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('137205', 'Anticipo de Renta', 'activo', 'debito', 4, true, '1372') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('137210', 'Anticipo de IVA', 'activo', 'debito', 4, true, '1372') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1390', 'DEUDAS DE DIFÍCIL COBRO', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('139005', 'Deudas de Difícil Cobro', 'activo', 'debito', 4, true, '1390', true) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('15', 'PROPIEDADES, PLANTA Y EQUIPO', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1505', 'TERRENOS', 'activo', 'debito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('150505', 'Terrenos', 'activo', 'debito', 4, true, '1505') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1516', 'MAQUINARIA Y EQUIPO', 'activo', 'debito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('151605', 'Maquinaria y Equipo', 'activo', 'debito', 4, true, '1516') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('151610', 'Equipo de Transporte', 'activo', 'debito', 4, true, '1516') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1524', 'EQUIPO DE OFICINA', 'activo', 'debito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('152405', 'Muebles y Enseres', 'activo', 'debito', 4, true, '1524') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('152410', 'Equipo de Computación', 'activo', 'debito', 4, true, '1524') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1592', 'DEPRECIACIÓN ACUMULADA', 'activo', 'credito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('159205', 'Depreciación Maquinaria y Equipo', 'activo', 'credito', 4, true, '1592') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('159210', 'Depreciación Equipo de Transporte', 'activo', 'credito', 4, true, '1592') ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('17', 'DIFERIDOS', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1705', 'GASTOS PAGADOS POR ANTICIPADO', 'activo', 'debito', 3, false, '17') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('170505', 'Seguros', 'activo', 'debito', 4, true, '1705') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('170510', 'Arriendos', 'activo', 'debito', 4, true, '1705') ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 2: PASIVO
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2', 'PASIVO', 'pasivo', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('22', 'PROVEEDORES', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2205', 'PROVEEDORES NACIONALES', 'pasivo', 'credito', 3, false, '22') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('220505', 'Proveedores Nacionales', 'pasivo', 'credito', 4, true, '2205', true) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('23', 'CUENTAS POR PAGAR', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2305', 'CUENTAS CORRIENTES COMERCIALES', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('230505', 'Cuentas Corrientes Comerciales', 'pasivo', 'credito', 4, true, '2305', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2365', 'RETENCIONES Y APORTES DE NÓMINA', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236505', 'Aportes a EPS', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236510', 'Aportes a AFP', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236515', 'Aportes a ARL', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236520', 'Aportes Parafiscales', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236525', 'Embargos Judiciales', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2367', 'RETENCIÓN EN LA FUENTE', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236705', 'Retención en la Fuente', 'pasivo', 'credito', 4, true, '2367') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2368', 'IMPUESTO SOBRE LAS VENTAS IVA', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236805', 'IVA Generado', 'pasivo', 'credito', 4, true, '2368') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236810', 'IVA Descontable', 'pasivo', 'debito', 4, true, '2368') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2370', 'RETENCIÓN DE ICA', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('237005', 'Retención de ICA', 'pasivo', 'credito', 4, true, '2370') ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('25', 'OBLIGACIONES LABORALES', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2505', 'SALARIOS POR PAGAR', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('250505', 'Salarios por Pagar', 'pasivo', 'credito', 4, true, '2505', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2510', 'CESANTÍAS', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('251005', 'Cesantías por Pagar', 'pasivo', 'credito', 4, true, '2510', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2515', 'INTERESES A LAS CESANTÍAS', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('251505', 'Intereses a las Cesantías por Pagar', 'pasivo', 'credito', 4, true, '2515', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2520', 'PRIMA DE SERVICIOS', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('252005', 'Prima de Servicios por Pagar', 'pasivo', 'credito', 4, true, '2520', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2525', 'VACACIONES', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('252505', 'Vacaciones por Pagar', 'pasivo', 'credito', 4, true, '2525', true) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('28', 'OTROS PASIVOS', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2805', 'ANTICIPOS DE CLIENTES', 'pasivo', 'credito', 3, false, '28') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('280505', 'Anticipos de Clientes', 'pasivo', 'credito', 4, true, '2805', true) ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 3: PATRIMONIO
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3', 'PATRIMONIO', 'patrimonio', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('31', 'CAPITAL SOCIAL', 'patrimonio', 'credito', 2, false, '3') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3105', 'CAPITAL SUSCRITO Y PAGADO', 'patrimonio', 'credito', 3, false, '31') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('310505', 'Capital Suscrito y Pagado', 'patrimonio', 'credito', 4, true, '3105') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('36', 'RESULTADOS DEL EJERCICIO', 'patrimonio', 'credito', 2, false, '3') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3605', 'UTILIDAD DEL EJERCICIO', 'patrimonio', 'credito', 3, false, '36') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('360505', 'Utilidad del Ejercicio', 'patrimonio', 'credito', 4, true, '3605') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3610', 'PÉRDIDA DEL EJERCICIO', 'patrimonio', 'debito', 3, false, '36') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('361005', 'Pérdida del Ejercicio', 'patrimonio', 'debito', 4, true, '3610') ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 4: INGRESOS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('4', 'INGRESOS', 'ingreso', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('41', 'INGRESOS OPERACIONALES', 'ingreso', 'credito', 2, false, '4') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('4105', 'SERVICIOS', 'ingreso', 'credito', 3, false, '41') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('410505', 'Servicios de Mantenimiento', 'ingreso', 'credito', 4, true, '4105', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('410510', 'Alquiler de Maquinaria', 'ingreso', 'credito', 4, true, '4105', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('42', 'INGRESOS NO OPERACIONALES', 'ingreso', 'credito', 2, false, '4') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('4205', 'OTROS INGRESOS', 'ingreso', 'credito', 3, false, '42') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('420505', 'Intereses Financieros', 'ingreso', 'credito', 4, true, '4205') ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 5: GASTOS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5', 'GASTOS', 'gasto', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('51', 'GASTOS DE PERSONAL', 'gasto', 'debito', 2, false, '5') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5105', 'SALARIOS', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('510505', 'Sueldos', 'gasto', 'debito', 4, true, '5105', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5110', 'APORTES SEGURIDAD SOCIAL', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511005', 'Aportes EPS', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511010', 'Aportes AFP', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511015', 'Aportes ARL', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511020', 'Aportes Parafiscales', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5115', 'PRESTACIONES SOCIALES', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511505', 'Cesantías', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511510', 'Intereses a las Cesantías', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511515', 'Prima de Servicios', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511520', 'Vacaciones', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5120', 'HORAS EXTRAS Y RECARGOS', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('512005', 'Horas Extras', 'gasto', 'debito', 4, true, '5120', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('512010', 'Recargos Nocturnos', 'gasto', 'debito', 4, true, '5120', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('512015', 'Recargos Dominicales', 'gasto', 'debito', 4, true, '5120', true) ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('52', 'GASTOS GENERALES', 'gasto', 'debito', 2, false, '5') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5205', 'HONORARIOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('520505', 'Honorarios Profesionales', 'gasto', 'debito', 4, true, '5205', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5210', 'IMPUESTOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('521005', 'Impuesto de Industria y Comercio', 'gasto', 'debito', 4, true, '5210') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('521010', 'Impuesto al Valor Agregado (IVA)', 'gasto', 'debito', 4, true, '5210') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5215', 'ARRENDAMIENTOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('521505', 'Arrendamientos', 'gasto', 'debito', 4, true, '5215', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5220', 'SEGUROS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('522005', 'Seguros', 'gasto', 'debito', 4, true, '5220', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5230', 'SERVICIOS PÚBLICOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523005', 'Energía', 'gasto', 'debito', 4, true, '5230') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523010', 'Agua', 'gasto', 'debito', 4, true, '5230') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523015', 'Internet y Telefonía', 'gasto', 'debito', 4, true, '5230') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5235', 'GASTOS DE VIAJE', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523505', 'Transporte y Peajes', 'gasto', 'debito', 4, true, '5235') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523510', 'Alojamiento', 'gasto', 'debito', 4, true, '5235') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5240', 'MANTENIMIENTO Y REPARACIONES', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('524005', 'Mantenimiento Maquinaria', 'gasto', 'debito', 4, true, '5240', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('524010', 'Mantenimiento Vehículos', 'gasto', 'debito', 4, true, '5240', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('524015', 'Mantenimiento Equipo de Oficina', 'gasto', 'debito', 4, true, '5240', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5250', 'GASTOS LEGALES', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('525005', 'Gastos Notariales', 'gasto', 'debito', 4, true, '5250') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('525010', 'Registro Mercantil', 'gasto', 'debito', 4, true, '5250') ON CONFLICT DO NOTHING;

INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('53', 'GASTOS NO OPERACIONALES', 'gasto', 'debito', 2, false, '5') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5305', 'GASTOS FINANCIEROS', 'gasto', 'debito', 3, false, '53') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('530505', 'Intereses Bancarios', 'gasto', 'debito', 4, true, '5305') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('530510', 'Comisiones Bancarias', 'gasto', 'debito', 4, true, '5305') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5310', 'GASTOS EXTRAORDINARIOS', 'gasto', 'debito', 3, false, '53') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('531005', 'Multas y Sanciones', 'gasto', 'debito', 4, true, '5310') ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 6: COSTOS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('6', 'COSTOS', 'costo', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('61', 'COSTO DE SERVICIOS', 'costo', 'debito', 2, false, '6') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('6105', 'MATERIALES Y REPUESTOS', 'costo', 'debito', 3, false, '61') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('610505', 'Materiales Directos', 'costo', 'debito', 4, true, '6105') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('6110', 'MANO DE OBRA DIRECTA', 'costo', 'debito', 3, false, '61') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('611005', 'Mano de Obra Directa', 'costo', 'debito', 4, true, '6110', true) ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 7: CUENTAS DE ORDEN DEUDORAS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('7', 'CUENTAS DE ORDEN DEUDORAS', 'cuenta_orden', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('71', 'CUENTAS DE ORDEN', 'cuenta_orden', 'debito', 2, false, '7') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('7105', 'ACTIVOS CASTIGADOS', 'cuenta_orden', 'debito', 3, false, '71') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('710505', 'Activos Castigados', 'cuenta_orden', 'debito', 4, true, '7105') ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 8: CUENTAS DE ORDEN ACREEDORAS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('8', 'CUENTAS DE ORDEN ACREEDORAS', 'cuenta_orden', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('81', 'CUENTAS DE ORDEN', 'cuenta_orden', 'credito', 2, false, '8') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('8105', 'BIENES RECIBIDOS EN GARANTÍA', 'cuenta_orden', 'credito', 3, false, '81') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('810505', 'Bienes Recibidos en Garantía', 'cuenta_orden', 'credito', 4, true, '8105') ON CONFLICT DO NOTHING;
-- ============================================
-- SEED: Promover un usuario existente a admin
-- Reemplazar 'admin@serviequipos.com' con el email real
-- Ejecutar en Supabase SQL Editor DESPUÉS de que el usuario se haya registrado
-- ============================================

UPDATE perfiles
SET rol = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'camiloavellaneda77@gmail.com');-- ============================================
-- BACKFILL: Crear perfiles para usuarios existentes
-- Útil si ya hay usuarios en auth.users sin perfil
-- Ejecutar en Supabase SQL Editor después de crear la tabla perfiles
-- ============================================

INSERT INTO perfiles (user_id, rol, nombre_mostrar)
SELECT id, 'usuario', email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM perfiles)
ON CONFLICT (user_id) DO NOTHING;-- ============================================
-- TRIGGER: Crear perfil automáticamente al registrarse
-- Cada nuevo usuario en auth.users recibe rol 'usuario'
-- Debe ejecutarse en Supabase SQL Editor
-- ============================================

-- Función que se ejecuta cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, rol, nombre_mostrar)
  VALUES (NEW.id, 'usuario', COALESCE(NEW.email, 'Usuario'));
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();-- ============================================================
-- MIGRACIÓN: Limpiar frentes de trabajo (solo Santa Rosa)
-- Fecha: 2026-06-14
-- Descripción: Elimina los frentes de prueba FT-001, FT-002
--              y FT-003 que vienen de auditorias_schema.sql.
--              El único frente real es Santa Rosa (FT-SR).
-- ============================================================

-- 1. Desvincular empleados y maquinaria de los frentes falsos
UPDATE trabajadores SET frente_trabajo_id = NULL WHERE frente_trabajo_id IN (
  SELECT id FROM frentes_trabajo WHERE codigo IN ('FT-001', 'FT-002', 'FT-003')
);

UPDATE maquinaria SET frente_trabajo_id = NULL WHERE frente_trabajo_id IN (
  SELECT id FROM frentes_trabajo WHERE codigo IN ('FT-001', 'FT-002', 'FT-003')
);

-- 2. Eliminar los frentes falsos
DELETE FROM frentes_trabajo WHERE codigo IN ('FT-001', 'FT-002', 'FT-003');

-- 3. Asegurar que Santa Rosa está activo y actualizado
INSERT INTO frentes_trabajo (codigo, nombre, ubicacion, ciudad, departamento, activo)
VALUES (
  'FT-SR',
  'Santa Rosa',
  'Vereda Santa Rosa, La Calera',
  'La Calera',
  'Cundinamarca',
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = 'Santa Rosa',
  ubicacion = 'Vereda Santa Rosa, La Calera',
  ciudad = 'La Calera',
  departamento = 'Cundinamarca',
  activo = true;

COMMIT;

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT '✅ Script consolidado completado exitosamente' AS resultado;

SELECT 'Frentes de Trabajo: ' || count(*) AS registros FROM frentes_trabajo
UNION ALL
SELECT 'Tipos Comprobantes: ' || count(*) FROM tipo_comprobantes
UNION ALL
SELECT 'Tipos Doc. Factura: ' || count(*) FROM tipo_documentos_factura
UNION ALL
SELECT 'Turnos: ' || count(*) FROM tipos_turno
UNION ALL
SELECT 'Tipos Novedades: ' || count(*) FROM tipo_novedades
UNION ALL
SELECT 'PUC (Plan Cuentas): ' || count(*) FROM plan_cuentas
UNION ALL
SELECT 'Tipos Doc. Trabajador: ' || count(*) FROM tipos_documentos_trabajador
ORDER BY 1;
