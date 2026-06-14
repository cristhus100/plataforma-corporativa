-- ============================================
-- MIGRACIÓN: Columnas de umbrales
-- Agrega columnas de configuración de umbrales
-- de mantenimiento a la tabla existente.
-- ============================================

ALTER TABLE configuracion_alertas
ADD COLUMN IF NOT EXISTS horometro_maximo NUMERIC,
ADD COLUMN IF NOT EXISTS intervalo_cambio_aceite NUMERIC DEFAULT 300,
ADD COLUMN IF NOT EXISTS intervalo_cambio_filtros NUMERIC DEFAULT 120;
