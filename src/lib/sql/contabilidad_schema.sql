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
