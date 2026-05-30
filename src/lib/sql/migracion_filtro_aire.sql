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
