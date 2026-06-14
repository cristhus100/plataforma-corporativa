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
CREATE POLICY "Tipo documentos factura read all"
  ON tipo_documentos_factura FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tipo documentos factura admin write"
  ON tipo_documentos_factura FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Tipo documentos factura admin update"
  ON tipo_documentos_factura FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Tipo documentos factura admin delete"
  ON tipo_documentos_factura FOR DELETE TO authenticated USING (es_admin());

-- Facturas: lectura todos, escritura admin
CREATE POLICY "Facturas read all"
  ON facturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Facturas admin write"
  ON facturas FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Facturas admin update"
  ON facturas FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Facturas admin delete"
  ON facturas FOR DELETE TO authenticated USING (es_admin());

-- Items factura: lectura todos, escritura admin
CREATE POLICY "Items factura read all"
  ON items_factura FOR SELECT TO authenticated USING (true);
CREATE POLICY "Items factura admin write"
  ON items_factura FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Items factura admin update"
  ON items_factura FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Items factura admin delete"
  ON items_factura FOR DELETE TO authenticated USING (es_admin());

-- Recibos caja: lectura todos, escritura admin
CREATE POLICY "Recibos caja read all"
  ON recibos_caja FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recibos caja admin write"
  ON recibos_caja FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Recibos caja admin update"
  ON recibos_caja FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Recibos caja admin delete"
  ON recibos_caja FOR DELETE TO authenticated USING (es_admin());

-- Notas crédito: lectura todos, escritura admin
CREATE POLICY "Notas credito read all"
  ON notas_credito FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notas credito admin write"
  ON notas_credito FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Notas credito admin update"
  ON notas_credito FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Notas credito admin delete"
  ON notas_credito FOR DELETE TO authenticated USING (es_admin());

-- Notas débito: lectura todos, escritura admin
CREATE POLICY "Notas debito read all"
  ON notas_debito FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notas debito admin write"
  ON notas_debito FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Notas debito admin update"
  ON notas_debito FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
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
