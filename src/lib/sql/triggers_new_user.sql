-- ============================================
-- TRIGGER: Crear perfil automáticamente al registrarse
-- Cada nuevo usuario en auth.users recibe rol 'usuario'
-- Debe ejecutarse en Supabase SQL Editor
-- ============================================

-- Función que se ejecuta cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, rol, nombre_mostrar)
  VALUES (NEW.id, 'usuario', COALESCE(NEW.email, 'Usuario'));
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();