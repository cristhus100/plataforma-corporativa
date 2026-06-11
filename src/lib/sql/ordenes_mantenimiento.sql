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
