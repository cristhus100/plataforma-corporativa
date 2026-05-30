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
CREATE POLICY "insert_historial_trabajadores" ON historial_trabajadores FOR INSERT TO authenticated WITH CHECK (es_admin());