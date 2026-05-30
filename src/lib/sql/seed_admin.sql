-- ============================================
-- SEED: Promover un usuario existente a admin
-- Reemplazar 'admin@serviequipos.com' con el email real
-- Ejecutar en Supabase SQL Editor DESPUÉS de que el usuario se haya registrado
-- ============================================

UPDATE perfiles
SET rol = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'camiloavellaneda77@gmail.com');