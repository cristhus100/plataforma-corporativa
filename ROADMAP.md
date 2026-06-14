# Roadmap: Plataforma Corporativa → ERP Integral

> Estado actual al 2026-06-14
> Empresa: Serviequipos Mantenimiento Ltda. (mantenimiento industrial, Santa Rosa)

---

## Leyenda

| Icono | Significado |
|-------|-------------|
| ✅ | Completado / Funcional |
| 🔶 | Parcial / Básico |
| ❌ | No iniciado |

---

## Módulos Existentes (15 implementados)

| # | Módulo | Rutas | Estado | Observaciones |
|---|--------|-------|--------|---------------|
| 1 | Login / Autenticación | `/login` | ✅ | Supabase Auth, roles admin/usuario |
| 2 | Dashboard | `/` | ✅ | Charts Recharts, stats cards, actividad reciente |
| 3 | Trabajadores (RRHH básico) | `/trabajadores/*` | ✅ | CRUD completo, historial, documentos, PDF |
| 4 | Maquinaria (Equipos) | `/maquinaria/*` | ✅ | CRUD completo, fotos, documentos, operador |
| 5 | Vehículos | `/vehiculos/*` | ✅ | CRUD completo, documentos, mantenimiento |
| 6 | Mantenimiento (Cambio Aceite) | `/mantenimiento/cambio-aceite/*` | ✅ | Formulario vía QR, horómetros diarios |
| 7 | Mantenimiento (Vehículos) | `/mantenimiento/vehiculo/*` | ✅ | Formulario vía QR, kilometraje diario |
| 8 | Órdenes de Mantenimiento | `/mantenimiento/ordenes/*` | ✅ | CRUD completo con códigos automáticos |
| 9 | Turnos (A/B/C) | `/turnos/*` | ✅ | Asignación semanal + asistencia diaria |
| 10 | Auditorías (Cumplimiento) | `/auditorias` | ✅ | Dashboard ponderado 100% (6 categorías) |
| 11 | Alertas | `/alertas` | ✅ | Documentos, maquinaria, vehículos + API |
| 12 | Ubicación (GPS) | `/ubicacion` | 🔶 | Solo simulado (datos aleatorios) |
| 13 | Calendario | `/calendario` | 🔶 | Eventos por año, no refiltra por mes |
| 14 | Anuncios / Comunicados | `/anuncios` | ✅ | CRUD completo con prioridades |
| 15 | Configuración | `/configuracion` | ✅ | Alertas email vía Resend |
| 16 | Facturación / Cartera | `/facturacion/*` | ✅ | Facturas, recibos, notas crédito/débito, cartera aging |
| 17 | Contabilidad | `/contabilidad/*` | ✅ | PUC, comprobantes, asientos, estados financieros |
| 18 | Nómina | `/nomina/*` | ✅ | Periodos, liquidación, seguridad social, prestaciones |

---

## Lo que falta para un ERP Corporativo Completo

### 🔴 PRIORIDAD ALTA — Núcleo financiero-contable

| Módulo | Descripción | Prioridad |
|--------|-------------|-----------|
| ✅ **Contabilidad** | Libro diario, plan de cuentas, asientos contables, estados financieros (balance, P&G) | 🔴 Alta |
| ✅ **Facturación / Cartera** | Facturas electrónicas, cuentas por cobrar, cuentas por pagar, conciliación | 🔴 Alta |
| ❌ **Presupuestos** | Presupuestos anuales por centro de costo, seguimiento de ejecución | 🔴 Alta |
| ✅ **Nomina / Payroll** | Liquidación de nómina, seguridad social, parafiscales, primas, cesantías, liquidación | 🔴 Alta |

### 🟡 PRIORIDAD MEDIA — Gestión comercial y de inventarios

| Módulo | Descripción | Prioridad |
|--------|-------------|-----------|
| ❌ **Inventario / Almacén** | Gestión de repuestos, consumibles, herramientas; entradas/salidas, mínimos/máximos | 🟡 Media |
| ❌ **Órdenes de Compra** | Solicitudes de compra, aprobaciones, recepción, vinculación con inventario | 🟡 Media |
| ❌ **Proveedores** | Catálogo de proveedores, evaluación, histórico de compras | 🟡 Media |
| ❌ **Clientes / Contratos** | Gestión de clientes, contratos de mantenimiento, términos, renovaciones | 🟡 Media |
| ❌ **Cotizaciones** | Generación de cotizaciones, aprobación, conversión a orden de trabajo | 🟡 Media |

### 🟢 PRIORIDAD BAJA — Expansión y especialización

| Módulo | Descripción | Prioridad |
|--------|-------------|-----------|
| ❌ **Gestión de Proyectos** | Planificación de obras/proyectos, hitos, cronogramas, asignación de recursos | 🟢 Baja |
| ❌ **SST Completo** | Seguridad y Salud en el Trabajo: matriz de riesgos, incidentes, EPPS, exámenes médicos | 🟢 Baja |
| ❌ **Capacitaciones** | Gestión de cursos, certificaciones, vencimientos, programación | 🟢 Baja |
| ❌ **Evaluación de Desempeño** | Evaluaciones periódicas de trabajadores, 360° | 🟢 Baja |
| ❌ **Indicadores / BI** | Tablero de indicadores clave (KPIs), reports avanzados, exportación Excel | 🟢 Baja |

---

## Mejoras a módulos existentes

| Módulo | Mejora pendiente | Prioridad |
|--------|------------------|-----------|
| ✅ Dashboard | Conectar cumplimiento real desde módulo Auditorías | 🟡 Media |
| 🔶 Dashboard | Conectar alertas reales al panel de actividad reciente | 🟢 Baja |
| ✅ Ubicación | GPS real con Geolocation API + tabla posiciones_maquinaria | 🟡 Media |
| ✅ Calendario | Refiltrar eventos al cambiar de mes (año como dependencia) | 🟢 Baja |
| 🔶 Auditorías | Implementar checklist diario (`checklist_diario` retorna `sin_dato`) | 🟢 Baja |
| 🔶 Auditorías | Generalizar a múltiples frentes (hoy hardcodeado a Santa Rosa) | 🟢 Baja |
| 🔶 Turnos | Generalizar a múltiples frentes (hoy hardcodeado a Santa Rosa) | 🟢 Baja |
| ✅ Seguridad | Migrar operaciones de escritura a Server Actions | 🟡 Media |
| ✅ Mobile | Sidebar como overlay drawer, MainLayout responsive, Ubicación mobile | 🟢 Baja |

---

## Resumen cuantitativo

| Métrica | Valor |
|---------|-------|
| Módulos funcionales | 21 |
| Módulos con mejoras pendientes | 5 (Ubicación, Calendario, Dashboard, Auditorías, Turnos) |
| Módulos por implementar (ERP completo) | ~8 |
| Archivos fuente | ~140+ |
| Páginas (page.js) | 60 |
| Scripts SQL | 18 migraciones |
| Dependencias técnicas | Supabase, Next.js 16, Tailwind 4, shadcn/ui, Recharts, Leaflet |

---

## Arquitectura técnica actual

```
plataforma-corporativa/
├── src/
│   ├── app/           → 15 módulos con App Router
│   ├── components/
│   │   └── layout/    → Sidebar, Header, MainLayout
│   ├── context/       → RoleContext (auth + roles)
│   ├── hooks/         → useAlertas, usePaginacion
│   └── lib/
│       ├── supabase/  → client.js, server.js, paginacion.js
│       │               auditoria.js, turnos.js
│       ├── utils/     → helpers por módulo
│       └── sql/       → migraciones SQL
```

## Recomendación estratégica

Para llegar a un ERP corporativo completo el orden recomendado es:

1. **Fase 1 (Corto plazo)**: Nómina + Contabilidad básica — son los módulos que generan el ROI más inmediato y son requisito legal en Colombia
2. **Fase 2 (Mediano plazo)**: Facturación + Cartera + Inventario — cierran el ciclo operativo-financiero
3. **Fase 3 (Largo plazo)**: Compras + Proveedores + Proyectos + SST — expansión vertical

El proyecto ya tiene una base técnica sólida: Next.js 16 + Supabase + Tailwind 4 + shadcn/ui. Los próximos módulos deberían seguir el mismo patrón de componentes compartidos (paginación server-side, hooks reutilizables) para mantener consistencia.
