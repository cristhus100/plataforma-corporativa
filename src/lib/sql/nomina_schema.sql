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
CREATE POLICY "Tipo novedades read all" ON tipo_novedades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tipo novedades admin write" ON tipo_novedades FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Tipo novedades admin update" ON tipo_novedades FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Tipo novedades admin delete" ON tipo_novedades FOR DELETE TO authenticated USING (es_admin());

-- Novedades nómina: lectura todos, inserción/actualización authenticated (como asistencia), admin delete
CREATE POLICY "Novedades nomina read all" ON novedades_nomina FOR SELECT TO authenticated USING (true);
CREATE POLICY "Novedades nomina insert" ON novedades_nomina FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Novedades nomina update" ON novedades_nomina FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Novedades nomina admin delete" ON novedades_nomina FOR DELETE TO authenticated USING (es_admin());

-- Periodos nómina: lectura todos, escritura admin
CREATE POLICY "Periodos nomina read all" ON periodos_nomina FOR SELECT TO authenticated USING (true);
CREATE POLICY "Periodos nomina admin write" ON periodos_nomina FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Periodos nomina admin update" ON periodos_nomina FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Periodos nomina admin delete" ON periodos_nomina FOR DELETE TO authenticated USING (es_admin());

-- Nóminas: lectura todos, escritura admin
CREATE POLICY "Nominas read all" ON nominas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Nominas admin write" ON nominas FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Nominas admin update" ON nominas FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Nominas admin delete" ON nominas FOR DELETE TO authenticated USING (es_admin());

-- Detalle nómina: lectura todos, escritura admin
CREATE POLICY "Detalle nomina read all" ON detalle_nomina FOR SELECT TO authenticated USING (true);
CREATE POLICY "Detalle nomina admin write" ON detalle_nomina FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Detalle nomina admin update" ON detalle_nomina FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "Detalle nomina admin delete" ON detalle_nomina FOR DELETE TO authenticated USING (es_admin());

-- Liquidación prestaciones: lectura todos, escritura admin
CREATE POLICY "Prestaciones read all" ON liquidacion_prestaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prestaciones admin write" ON liquidacion_prestaciones FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "Prestaciones admin update" ON liquidacion_prestaciones FOR UPDATE TO authenticated USING (es_admin()) WITH CHECK (es_admin());
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
