-- ============================================
-- CREAR TABLA PERFILES Y FUNCIÓN es_admin()
-- ============================================

-- 1. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS perfiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'usuario')) DEFAULT 'usuario',
  nombre_mostrar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- 2. FUNCIÓN HELPER: es_admin()
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles
    WHERE user_id = auth.uid() AND rol = 'admin'
  );
END;
$$;
