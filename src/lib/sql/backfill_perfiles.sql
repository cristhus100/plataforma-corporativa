-- ============================================
-- BACKFILL: Crear perfiles para usuarios existentes
-- Útil si ya hay usuarios en auth.users sin perfil
-- Ejecutar en Supabase SQL Editor después de crear la tabla perfiles
-- ============================================

INSERT INTO perfiles (user_id, rol, nombre_mostrar)
SELECT id, 'usuario', email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM perfiles)
ON CONFLICT (user_id) DO NOTHING;