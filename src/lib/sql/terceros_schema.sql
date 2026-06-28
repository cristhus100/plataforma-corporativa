-- ============================================================
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
