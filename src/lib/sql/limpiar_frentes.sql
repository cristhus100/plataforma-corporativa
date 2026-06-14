-- ============================================================
-- MIGRACIÓN: Limpiar frentes de trabajo (solo Santa Rosa)
-- Fecha: 2026-06-14
-- Descripción: Elimina los frentes de prueba FT-001, FT-002
--              y FT-003 que vienen de auditorias_schema.sql.
--              El único frente real es Santa Rosa (FT-SR).
-- ============================================================

-- 1. Desvincular empleados y maquinaria de los frentes falsos
UPDATE trabajadores SET frente_trabajo_id = NULL WHERE frente_trabajo_id IN (
  SELECT id FROM frentes_trabajo WHERE codigo IN ('FT-001', 'FT-002', 'FT-003')
);

UPDATE maquinaria SET frente_trabajo_id = NULL WHERE frente_trabajo_id IN (
  SELECT id FROM frentes_trabajo WHERE codigo IN ('FT-001', 'FT-002', 'FT-003')
);

-- 2. Eliminar los frentes falsos
DELETE FROM frentes_trabajo WHERE codigo IN ('FT-001', 'FT-002', 'FT-003');

-- 3. Asegurar que Santa Rosa está activo y actualizado
INSERT INTO frentes_trabajo (codigo, nombre, ubicacion, ciudad, departamento, activo)
VALUES (
  'FT-SR',
  'Santa Rosa',
  'Vereda Santa Rosa, La Calera',
  'La Calera',
  'Cundinamarca',
  true
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = 'Santa Rosa',
  ubicacion = 'Vereda Santa Rosa, La Calera',
  ciudad = 'La Calera',
  departamento = 'Cundinamarca',
  activo = true;
