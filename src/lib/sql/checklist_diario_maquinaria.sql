-- ============================================
-- MIGRACIÓN: Checklist diario en maquinaria
-- Agrega columna para tracking del último
-- checklist diario realizado por el operador.
-- ============================================

ALTER TABLE maquinaria
ADD COLUMN IF NOT EXISTS ultimo_checklist_diario DATE;
