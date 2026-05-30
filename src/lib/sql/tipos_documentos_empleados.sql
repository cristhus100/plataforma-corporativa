-- Reemplazar tipos de documentos de empleados
-- 1. Desactivar tipos antiguos
UPDATE tipos_documentos_trabajador SET activo = false WHERE nombre IN ('Certificado EPS', 'CCF', 'AFP');

-- 2. Agregar nuevos tipos
INSERT INTO tipos_documentos_trabajador (nombre, requiere_vencimiento, activo) VALUES
  ('Aportes en la empresa', true, true),
  ('Certificado curso de seguridad', true, true),
  ('Autorización prueba de alcoholemia', false, true),
  ('Certificación bancaria', true, true),
  ('Certificados', false, true);
