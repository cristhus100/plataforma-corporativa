-- ════════════════════════════════════════════════════════════════
-- audit_log — Tabla de auditoría de cambios
-- ════════════════════════════════════════════════════════════════
-- Registra automáticamente INSERT / UPDATE / DELETE
-- en las tablas críticas del sistema.
-- ════════════════════════════════════════════════════════════════

-- 1. Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- 2. Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
BEGIN
  -- Intentar obtener el usuario desde la variable de sesión de Supabase
  _user_id := auth.uid();
  _user_email := (SELECT email FROM auth.users WHERE id = auth.uid());

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, operation, record_id, new_data, user_id, user_email)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, row_to_json(NEW)::jsonb, _user_id, _user_email);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, user_id, user_email)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, _user_id, _user_email);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, operation, record_id, old_data, user_id, user_email)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, row_to_json(OLD)::jsonb, _user_id, _user_email);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar triggers a tablas críticas
-- Tablas operativas
DROP TRIGGER IF EXISTS audit_maquinaria ON maquinaria;
CREATE TRIGGER audit_maquinaria
  AFTER INSERT OR UPDATE OR DELETE ON maquinaria
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_trabajadores ON trabajadores;
CREATE TRIGGER audit_trabajadores
  AFTER INSERT OR UPDATE OR DELETE ON trabajadores
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_vehiculos ON vehiculos;
CREATE TRIGGER audit_vehiculos
  AFTER INSERT OR UPDATE OR DELETE ON vehiculos
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Tablas financieras
DROP TRIGGER IF EXISTS audit_facturas ON facturas;
CREATE TRIGGER audit_facturas
  AFTER INSERT OR UPDATE OR DELETE ON facturas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_recibos_caja ON recibos_caja;
CREATE TRIGGER audit_recibos_caja
  AFTER INSERT OR UPDATE OR DELETE ON recibos_caja
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_comprobantes ON comprobantes;
CREATE TRIGGER audit_comprobantes
  AFTER INSERT OR UPDATE OR DELETE ON comprobantes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_asientos_contables ON asientos_contables;
CREATE TRIGGER audit_asientos_contables
  AFTER INSERT OR UPDATE OR DELETE ON asientos_contables
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Tablas de nómina
DROP TRIGGER IF EXISTS audit_nominas ON nominas;
CREATE TRIGGER audit_nominas
  AFTER INSERT OR UPDATE OR DELETE ON nominas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_novedades_nomina ON novedades_nomina;
CREATE TRIGGER audit_novedades_nomina
  AFTER INSERT OR UPDATE OR DELETE ON novedades_nomina
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Tablas de mantenimiento
DROP TRIGGER IF EXISTS audit_ordenes_mantenimiento ON ordenes_mantenimiento;
CREATE TRIGGER audit_ordenes_mantenimiento
  AFTER INSERT OR UPDATE OR DELETE ON ordenes_mantenimiento
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_historial_aceite ON historial_aceite;
CREATE TRIGGER audit_historial_aceite
  AFTER INSERT OR UPDATE OR DELETE ON historial_aceite
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_checklist_diario ON checklist_diario_maquinaria;
CREATE TRIGGER audit_checklist_diario
  AFTER INSERT OR UPDATE OR DELETE ON checklist_diario_maquinaria
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 4. RLS para audit_log (solo admin puede leer)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log admin select" ON audit_log;
CREATE POLICY "audit_log admin select"
  ON audit_log FOR SELECT
  TO authenticated
  USING (es_admin());

-- 5. Vista resumen para consultas rápidas
CREATE OR REPLACE VIEW vw_audit_resumen AS
SELECT
  id,
  table_name,
  operation,
  record_id,
  user_email,
  created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 500;
