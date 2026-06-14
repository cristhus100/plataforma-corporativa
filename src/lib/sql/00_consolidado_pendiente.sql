-- ============================================================
-- SCRIPT CONSOLIDADO - Datos Pendientes
-- Plataforma Serviequipos
-- Fecha: 2026-06-14
-- ============================================================
-- INSTRUCCIONES: Copia y pega TODO este archivo en el
-- SQL Editor de Supabase y ejecútalo UNA SOLA VEZ.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. DATOS SEMILLA: Frentes de Trabajo
-- ============================================================
INSERT INTO frentes_trabajo (codigo, nombre, ubicacion, ciudad, departamento) VALUES
  ('FT-001', 'Sede Principal', 'Cra 50 # 80-20', 'Medellín', 'Antioquia'),
  ('FT-002', 'Sede Norte', 'Autopista Norte # 100-50', 'Barranquilla', 'Atlántico'),
  ('FT-003', 'Planta de Producción', 'Zona Industrial Km 5', 'Bogotá', 'Cundinamarca')
ON CONFLICT (codigo) DO NOTHING;

-- Santa Rosa (usado por turnos)
INSERT INTO frentes_trabajo (codigo, nombre, ubicacion, ciudad, departamento) VALUES
  ('FT-SR', 'Santa Rosa', 'Vereda Santa Rosa', 'La Calera', 'Cundinamarca')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 2. DATOS SEMILLA: Tipos de Comprobantes (Contabilidad)
-- ============================================================
INSERT INTO tipo_comprobantes (codigo, nombre, prefijo, afecta, descripcion) VALUES
  ('CD', 'Comprobante Diario', 'CD', 'ambos', 'Comprobante de contabilidad general'),
  ('NC', 'Nota de Crédito', 'NC', 'credito', 'Nota de crédito contable'),
  ('ND', 'Nota de Débito', 'ND', 'debito', 'Nota de débito contable'),
  ('RC', 'Recibo de Caja', 'RC', 'debito', 'Recibo de ingreso de caja/banco'),
  ('EG', 'Egreso', 'EG', 'credito', 'Comprobante de egreso o transferencia'),
  ('NO', 'Nómina', 'NO', 'ambos', 'Asiento automático de nómina'),
  ('FC', 'Facturación', 'FC', 'credito', 'Asiento automático de facturación')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 3. DATOS SEMILLA: Tipos de Documentos de Factura
-- ============================================================
INSERT INTO tipo_documentos_factura (codigo, nombre, prefijo, consecutivo_actual, aplica_retencion_ica, aplica_retencion_fuente) VALUES
  ('FC', 'Factura de Venta', 'FCE', 0, true, true),
  ('NC', 'Nota Crédito', 'NCE', 0, false, false),
  ('ND', 'Nota Débito', 'NDE', 0, false, false)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 4. DATOS SEMILLA: Turnos (A/B/C)
-- ============================================================
INSERT INTO tipos_turno (codigo, nombre, hora_inicio, hora_fin, es_nocturno) VALUES
  ('A', 'Turno A (Diurno)', '07:00', '15:00', false),
  ('B', 'Turno B (Tarde)', '15:00', '23:00', false),
  ('C', 'Turno C (Nocturno)', '23:00', '07:00', true)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 5. DATOS SEMILLA: Tipos de Novedades de Nómina
-- ============================================================
INSERT INTO tipo_novedades (codigo, nombre, tipo, afecta_salud, afecta_pension, afecta_arl, afecta_parafiscales, afecta_prestaciones, descripcion) VALUES
  ('INC_GRAL', 'Incapacidad General', 'deduccion', true, true, true, true, true, 'Incapacidad de origen común (días no laborados)'),
  ('INC_LABORAL', 'Incapacidad Laboral', 'deduccion', true, true, true, true, true, 'Incapacidad de origen laboral'),
  ('LIC_MATERNIDAD', 'Licencia Maternidad', 'devengo', true, true, true, true, true, 'Licencia de maternidad (18 semanas)'),
  ('LIC_PATERNIDAD', 'Licencia Paternidad', 'devengo', true, true, true, true, true, 'Licencia de paternidad'),
  ('PERMISO_R', 'Permiso Remunerado', 'devengo', true, true, true, true, true, 'Permiso remunerado'),
  ('PERMISO_NR', 'Permiso No Remunerado', 'deduccion', false, false, false, false, false, 'Permiso sin sueldo'),
  ('BONO', 'Bonificación', 'devengo', false, false, false, false, true, 'Bonificación extralegal'),
  ('HORA_EXTRA_D', 'Hora Extra Diurna', 'devengo', true, true, true, true, true, 'Hora extra diurna (25% recargo)'),
  ('HORA_EXTRA_N', 'Hora Extra Nocturna', 'devengo', true, true, true, true, true, 'Hora extra nocturna (75% recargo)'),
  ('HORA_EXTRA_DOM', 'Hora Extra Dominical', 'devengo', true, true, true, true, true, 'Hora extra en domingo o festivo'),
  ('COMISION', 'Comisión', 'devengo', true, true, true, true, true, 'Comisiones por ventas o gestión'),
  ('EMBARGO', 'Embargo Judicial', 'deduccion', false, false, false, false, false, 'Embargo judicial'),
  ('LIBRANZA', 'Libranza', 'deduccion', false, false, false, false, false, 'Descuento por libranza'),
  ('APORTE_SALUD', 'Aporte a Salud (4%)', 'deduccion', false, false, false, false, false, 'Cotización del trabajador al sistema de salud'),
  ('APORTE_PENSION', 'Aporte a Pensión (4%)', 'deduccion', false, false, false, false, false, 'Cotización del trabajador al sistema de pensiones'),
  ('FONDO_SOLIDARIDAD', 'Fondo Solidaridad Pensional', 'deduccion', false, false, false, false, false, 'Aporte solidario (salarios > 4 SMMLV)')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 6. DATOS SEMILLA: Plan Único de Cuentas (PUC Colombiano)
-- ============================================================

-- CLASE 1: ACTIVO
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1', 'ACTIVO', 'activo', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('11', 'DISPONIBLE', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1105', 'CAJA', 'activo', 'debito', 3, false, '11') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('110505', 'Caja General', 'activo', 'debito', 4, true, '1105', false) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1110', 'BANCOS', 'activo', 'debito', 3, false, '11') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('111005', 'Bancos Moneda Nacional', 'activo', 'debito', 4, true, '1110', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('13', 'DEUDORES', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1305', 'CLIENTES', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('130505', 'Clientes Nacionales', 'activo', 'debito', 4, true, '1305', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1310', 'CUENTAS CORRIENTES COMERCIALES', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('131005', 'Cuentas Corrientes Comerciales', 'activo', 'debito', 4, true, '1310', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1365', 'CUENTAS POR COBRAR A TRABAJADORES', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('136505', 'Prestamos a Trabajadores', 'activo', 'debito', 4, true, '1365', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1372', 'ANTICIPOS DE IMPUESTOS', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('137205', 'Anticipo de Renta', 'activo', 'debito', 4, true, '1372') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('137210', 'Anticipo de IVA', 'activo', 'debito', 4, true, '1372') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1390', 'DEUDAS DE DIFÍCIL COBRO', 'activo', 'debito', 3, false, '13') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('139005', 'Deudas de Difícil Cobro', 'activo', 'debito', 4, true, '1390', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('15', 'PROPIEDADES, PLANTA Y EQUIPO', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1505', 'TERRENOS', 'activo', 'debito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('150505', 'Terrenos', 'activo', 'debito', 4, true, '1505') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1516', 'MAQUINARIA Y EQUIPO', 'activo', 'debito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('151605', 'Maquinaria y Equipo', 'activo', 'debito', 4, true, '1516') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('151610', 'Equipo de Transporte', 'activo', 'debito', 4, true, '1516') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1524', 'EQUIPO DE OFICINA', 'activo', 'debito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('152405', 'Muebles y Enseres', 'activo', 'debito', 4, true, '1524') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('152410', 'Equipo de Computación', 'activo', 'debito', 4, true, '1524') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1592', 'DEPRECIACIÓN ACUMULADA', 'activo', 'credito', 3, false, '15') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('159205', 'Depreciación Maquinaria y Equipo', 'activo', 'credito', 4, true, '1592') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('159210', 'Depreciación Equipo de Transporte', 'activo', 'credito', 4, true, '1592') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('17', 'DIFERIDOS', 'activo', 'debito', 2, false, '1') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('1705', 'GASTOS PAGADOS POR ANTICIPADO', 'activo', 'debito', 3, false, '17') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('170505', 'Seguros', 'activo', 'debito', 4, true, '1705') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('170510', 'Arriendos', 'activo', 'debito', 4, true, '1705') ON CONFLICT DO NOTHING;

-- CLASE 2: PASIVO
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2', 'PASIVO', 'pasivo', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('22', 'PROVEEDORES', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2205', 'PROVEEDORES NACIONALES', 'pasivo', 'credito', 3, false, '22') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('220505', 'Proveedores Nacionales', 'pasivo', 'credito', 4, true, '2205', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('23', 'CUENTAS POR PAGAR', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2305', 'CUENTAS CORRIENTES COMERCIALES', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('230505', 'Cuentas Corrientes Comerciales', 'pasivo', 'credito', 4, true, '2305', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2365', 'RETENCIONES Y APORTES DE NÓMINA', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236505', 'Aportes a EPS', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236510', 'Aportes a AFP', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236515', 'Aportes a ARL', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236520', 'Aportes Parafiscales', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236525', 'Embargos Judiciales', 'pasivo', 'credito', 4, true, '2365') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2367', 'RETENCIÓN EN LA FUENTE', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236705', 'Retención en la Fuente', 'pasivo', 'credito', 4, true, '2367') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2368', 'IMPUESTO SOBRE LAS VENTAS IVA', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236805', 'IVA Generado', 'pasivo', 'credito', 4, true, '2368') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('236810', 'IVA Descontable', 'pasivo', 'debito', 4, true, '2368') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2370', 'RETENCIÓN DE ICA', 'pasivo', 'credito', 3, false, '23') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('237005', 'Retención de ICA', 'pasivo', 'credito', 4, true, '2370') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('25', 'OBLIGACIONES LABORALES', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2505', 'SALARIOS POR PAGAR', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('250505', 'Salarios por Pagar', 'pasivo', 'credito', 4, true, '2505', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2510', 'CESANTÍAS', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('251005', 'Cesantías por Pagar', 'pasivo', 'credito', 4, true, '2510', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2515', 'INTERESES A LAS CESANTÍAS', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('251505', 'Intereses a las Cesantías por Pagar', 'pasivo', 'credito', 4, true, '2515', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2520', 'PRIMA DE SERVICIOS', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('252005', 'Prima de Servicios por Pagar', 'pasivo', 'credito', 4, true, '2520', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2525', 'VACACIONES', 'pasivo', 'credito', 3, false, '25') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('252505', 'Vacaciones por Pagar', 'pasivo', 'credito', 4, true, '2525', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('28', 'OTROS PASIVOS', 'pasivo', 'credito', 2, false, '2') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('2805', 'ANTICIPOS DE CLIENTES', 'pasivo', 'credito', 3, false, '28') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('280505', 'Anticipos de Clientes', 'pasivo', 'credito', 4, true, '2805', true) ON CONFLICT DO NOTHING;

-- CLASE 3: PATRIMONIO
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3', 'PATRIMONIO', 'patrimonio', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('31', 'CAPITAL SOCIAL', 'patrimonio', 'credito', 2, false, '3') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3105', 'CAPITAL SUSCRITO Y PAGADO', 'patrimonio', 'credito', 3, false, '31') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('310505', 'Capital Suscrito y Pagado', 'patrimonio', 'credito', 4, true, '3105') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('36', 'RESULTADOS DEL EJERCICIO', 'patrimonio', 'credito', 2, false, '3') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3605', 'UTILIDAD DEL EJERCICIO', 'patrimonio', 'credito', 3, false, '36') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('360505', 'Utilidad del Ejercicio', 'patrimonio', 'credito', 4, true, '3605') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('3610', 'PÉRDIDA DEL EJERCICIO', 'patrimonio', 'debito', 3, false, '36') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('361005', 'Pérdida del Ejercicio', 'patrimonio', 'debito', 4, true, '3610') ON CONFLICT DO NOTHING;

-- CLASE 4: INGRESOS
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('4', 'INGRESOS', 'ingreso', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('41', 'INGRESOS OPERACIONALES', 'ingreso', 'credito', 2, false, '4') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('4105', 'SERVICIOS', 'ingreso', 'credito', 3, false, '41') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('410505', 'Servicios de Mantenimiento', 'ingreso', 'credito', 4, true, '4105', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('410510', 'Alquiler de Maquinaria', 'ingreso', 'credito', 4, true, '4105', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('42', 'INGRESOS NO OPERACIONALES', 'ingreso', 'credito', 2, false, '4') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('4205', 'OTROS INGRESOS', 'ingreso', 'credito', 3, false, '42') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('420505', 'Intereses Financieros', 'ingreso', 'credito', 4, true, '4205') ON CONFLICT DO NOTHING;

-- CLASE 5: GASTOS
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5', 'GASTOS', 'gasto', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('51', 'GASTOS DE PERSONAL', 'gasto', 'debito', 2, false, '5') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5105', 'SALARIOS', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('510505', 'Sueldos', 'gasto', 'debito', 4, true, '5105', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5110', 'APORTES SEGURIDAD SOCIAL', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511005', 'Aportes EPS', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511010', 'Aportes AFP', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511015', 'Aportes ARL', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('511020', 'Aportes Parafiscales', 'gasto', 'debito', 4, true, '5110') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5115', 'PRESTACIONES SOCIALES', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511505', 'Cesantías', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511510', 'Intereses a las Cesantías', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511515', 'Prima de Servicios', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('511520', 'Vacaciones', 'gasto', 'debito', 4, true, '5115', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5120', 'HORAS EXTRAS Y RECARGOS', 'gasto', 'debito', 3, false, '51') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('512005', 'Horas Extras', 'gasto', 'debito', 4, true, '5120', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('512010', 'Recargos Nocturnos', 'gasto', 'debito', 4, true, '5120', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('512015', 'Recargos Dominicales', 'gasto', 'debito', 4, true, '5120', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('52', 'GASTOS GENERALES', 'gasto', 'debito', 2, false, '5') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5205', 'HONORARIOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('520505', 'Honorarios Profesionales', 'gasto', 'debito', 4, true, '5205', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5210', 'IMPUESTOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('521005', 'Impuesto de Industria y Comercio', 'gasto', 'debito', 4, true, '5210') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('521010', 'Impuesto al Valor Agregado (IVA)', 'gasto', 'debito', 4, true, '5210') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5215', 'ARRENDAMIENTOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('521505', 'Arrendamientos', 'gasto', 'debito', 4, true, '5215', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5220', 'SEGUROS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('522005', 'Seguros', 'gasto', 'debito', 4, true, '5220', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5230', 'SERVICIOS PÚBLICOS', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523005', 'Energía', 'gasto', 'debito', 4, true, '5230') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523010', 'Agua', 'gasto', 'debito', 4, true, '5230') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523015', 'Internet y Telefonía', 'gasto', 'debito', 4, true, '5230') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5235', 'GASTOS DE VIAJE', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523505', 'Transporte y Peajes', 'gasto', 'debito', 4, true, '5235') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('523510', 'Alojamiento', 'gasto', 'debito', 4, true, '5235') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5240', 'MANTENIMIENTO Y REPARACIONES', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('524005', 'Mantenimiento Maquinaria', 'gasto', 'debito', 4, true, '5240', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('524010', 'Mantenimiento Vehículos', 'gasto', 'debito', 4, true, '5240', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('524015', 'Mantenimiento Equipo de Oficina', 'gasto', 'debito', 4, true, '5240', true) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5250', 'GASTOS LEGALES', 'gasto', 'debito', 3, false, '52') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('525005', 'Gastos Notariales', 'gasto', 'debito', 4, true, '5250') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('525010', 'Registro Mercantil', 'gasto', 'debito', 4, true, '5250') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('53', 'GASTOS NO OPERACIONALES', 'gasto', 'debito', 2, false, '5') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5305', 'GASTOS FINANCIEROS', 'gasto', 'debito', 3, false, '53') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('530505', 'Intereses Bancarios', 'gasto', 'debito', 4, true, '5305') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('530510', 'Comisiones Bancarias', 'gasto', 'debito', 4, true, '5305') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('5310', 'GASTOS EXTRAORDINARIOS', 'gasto', 'debito', 3, false, '53') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('531005', 'Multas y Sanciones', 'gasto', 'debito', 4, true, '5310') ON CONFLICT DO NOTHING;

-- CLASE 6: COSTOS
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('6', 'COSTOS', 'costo', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('61', 'COSTO DE SERVICIOS', 'costo', 'debito', 2, false, '6') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('6105', 'MATERIALES Y REPUESTOS', 'costo', 'debito', 3, false, '61') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('610505', 'Materiales Directos', 'costo', 'debito', 4, true, '6105') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('6110', 'MANO DE OBRA DIRECTA', 'costo', 'debito', 3, false, '61') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre, pide_tercero) VALUES
('611005', 'Mano de Obra Directa', 'costo', 'debito', 4, true, '6110', true) ON CONFLICT DO NOTHING;

-- CLASE 7: CUENTAS DE ORDEN DEUDORAS
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('7', 'CUENTAS DE ORDEN DEUDORAS', 'cuenta_orden', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('71', 'CUENTAS DE ORDEN', 'cuenta_orden', 'debito', 2, false, '7') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('7105', 'ACTIVOS CASTIGADOS', 'cuenta_orden', 'debito', 3, false, '71') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('710505', 'Activos Castigados', 'cuenta_orden', 'debito', 4, true, '7105') ON CONFLICT DO NOTHING;

-- CLASE 8: CUENTAS DE ORDEN ACREEDORAS
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('8', 'CUENTAS DE ORDEN ACREEDORAS', 'cuenta_orden', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('81', 'CUENTAS DE ORDEN', 'cuenta_orden', 'credito', 2, false, '8') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('8105', 'BIENES RECIBIDOS EN GARANTÍA', 'cuenta_orden', 'credito', 3, false, '81') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('810505', 'Bienes Recibidos en Garantía', 'cuenta_orden', 'credito', 4, true, '8105') ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. MIGRACIÓN: Umbrales de Mantenimiento
-- Agrega columnas a la tabla configuracion_alertas
-- ============================================================
ALTER TABLE configuracion_alertas
ADD COLUMN IF NOT EXISTS horometro_maximo NUMERIC,
ADD COLUMN IF NOT EXISTS intervalo_cambio_aceite NUMERIC DEFAULT 300,
ADD COLUMN IF NOT EXISTS intervalo_cambio_filtros NUMERIC DEFAULT 120;

-- ============================================================
-- 8. MIGRACIÓN: Checklist Diario Maquinaria
-- ============================================================
ALTER TABLE maquinaria
ADD COLUMN IF NOT EXISTS ultimo_checklist_diario DATE;

-- ============================================================
-- 9. MIGRACIÓN: Tipos de Documentos de Empleados
-- ============================================================
UPDATE tipos_documentos_trabajador SET activo = false WHERE nombre IN ('Certificado EPS', 'CCF', 'AFP');
INSERT INTO tipos_documentos_trabajador (nombre, requiere_vencimiento, activo) VALUES
  ('Aportes en la empresa', true, true),
  ('Certificado curso de seguridad', true, true),
  ('Autorización prueba de alcoholemia', false, true),
  ('Certificación bancaria', true, true),
  ('Certificados', false, true)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 10. USUARIO ADMIN
-- ============================================================
-- Asignar rol admin al usuario principal
UPDATE perfiles SET rol = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'camiloavellaneda77@gmail.com');

-- Si el usuario no existe en perfiles, crearlo
INSERT INTO perfiles (user_id, rol, nombre_mostrar)
SELECT id, 'admin', email
FROM auth.users
WHERE email = 'camiloavellaneda77@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.users.id);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT '✅ Script completado exitosamente' AS resultado;

SELECT 'Frentes de Trabajo: ' || count(*) AS registros FROM frentes_trabajo
UNION ALL
SELECT 'Tipos Comprobantes: ' || count(*) FROM tipo_comprobantes
UNION ALL
SELECT 'Tipos Doc. Factura: ' || count(*) FROM tipo_documentos_factura
UNION ALL
SELECT 'Turnos: ' || count(*) FROM tipos_turno
UNION ALL
SELECT 'Tipos Novedades: ' || count(*) FROM tipo_novedades
UNION ALL
SELECT 'PUC (Plan Cuentas): ' || count(*) FROM plan_cuentas
UNION ALL
SELECT 'Tipos Doc. Trabajador: ' || count(*) FROM tipos_documentos_trabajador
ORDER BY 1;

COMMIT;
