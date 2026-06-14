-- ============================================================
-- SEED: Plan Único de Cuentas (PUC Colombiano)
-- Fecha: 2026-06-14
-- Basado en el PUC estándar colombiano para empresas comerciales
-- Niveles: 1=Clase, 2=Grupo, 3=Cuenta, 4=Subcuenta
-- ============================================================

-- ======================================================================
-- CLASE 1: ACTIVO
-- ======================================================================
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

-- ======================================================================
-- CLASE 2: PASIVO
-- ======================================================================
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

-- ======================================================================
-- CLASE 3: PATRIMONIO
-- ======================================================================
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

-- ======================================================================
-- CLASE 4: INGRESOS
-- ======================================================================
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

-- ======================================================================
-- CLASE 5: GASTOS
-- ======================================================================
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

-- ======================================================================
-- CLASE 6: COSTOS
-- ======================================================================
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

-- ======================================================================
-- CLASE 7: CUENTAS DE ORDEN DEUDORAS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('7', 'CUENTAS DE ORDEN DEUDORAS', 'cuenta_orden', 'debito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('71', 'CUENTAS DE ORDEN', 'cuenta_orden', 'debito', 2, false, '7') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('7105', 'ACTIVOS CASTIGADOS', 'cuenta_orden', 'debito', 3, false, '71') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('710505', 'Activos Castigados', 'cuenta_orden', 'debito', 4, true, '7105') ON CONFLICT DO NOTHING;

-- ======================================================================
-- CLASE 8: CUENTAS DE ORDEN ACREEDORAS
-- ======================================================================
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('8', 'CUENTAS DE ORDEN ACREEDORAS', 'cuenta_orden', 'credito', 1, false, NULL) ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('81', 'CUENTAS DE ORDEN', 'cuenta_orden', 'credito', 2, false, '8') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('8105', 'BIENES RECIBIDOS EN GARANTÍA', 'cuenta_orden', 'credito', 3, false, '81') ON CONFLICT DO NOTHING;
INSERT INTO plan_cuentas (codigo, nombre, tipo, naturaleza, nivel, acepta_movimiento, codigo_padre) VALUES
('810505', 'Bienes Recibidos en Garantía', 'cuenta_orden', 'credito', 4, true, '8105') ON CONFLICT DO NOTHING;
