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
