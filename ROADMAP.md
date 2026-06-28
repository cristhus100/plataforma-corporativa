# Roadmap: Plataforma Corporativa — Serviequipos Mantenimiento Ltda

> Estado actual al 2026-06-28
> Empresa: Serviequipos Mantenimiento Ltda. (mantenimiento industrial, Santa Rosa)

---

## Leyenda

| Icono | Significado |
|-------|-------------|
| ✅ | Completado / Funcional |
| 🔶 | Parcial / Básico |

---

## Módulos Implementados (18 funcionales)

| # | Módulo | Rutas | Estado | Observaciones |
|---|--------|-------|--------|---------------|
| 1 | Login / Autenticación | `/login` | ✅ | Supabase Auth, roles admin/usuario |
| 2 | Dashboard | `/` | ✅ | Charts Recharts, stats cards, alertas reales en timeline, frentes generalizados |
| 3 | Trabajadores (RRHH básico) | `/trabajadores/*` | ✅ | CRUD completo, historial, documentos, PDF |
| 4 | Maquinaria (Equipos) | `/maquinaria/*` | ✅ | CRUD completo, fotos, documentos, operador, checklist diario |
| 5 | Vehículos | `/vehiculos/*` | ✅ | CRUD completo, documentos, mantenimiento |
| 6 | Mantenimiento (Cambio Aceite) | `/mantenimiento/cambio-aceite/*` | ✅ | Formulario vía QR, horómetros diarios |
| 7 | Mantenimiento (Vehículos) | `/mantenimiento/vehiculo/*` | ✅ | Formulario vía QR, kilometraje diario |
| 8 | Órdenes de Mantenimiento | `/mantenimiento/ordenes/*` | ✅ | CRUD completo con códigos automáticos OM-XXXX |
| 9 | Turnos (A/B/C) | `/turnos/*` | ✅ | Asignación semanal + asistencia diaria, frentes generalizados |
| 10 | Auditorías (Cumplimiento) | `/auditorias` | ✅ | Dashboard ponderado 100% (6 categorías), frentes generalizados |
| 11 | Alertas | `/alertas` | ✅ | Documentos, maquinaria, vehículos + API |
| 12 | Ubicación (GPS) | `/ubicacion` | 🔶 | Solo simulado (datos aleatorios) |
| 13 | Calendario | `/calendario` | ✅ | Eventos por año con filtros, cumpleaños |
| 14 | Anuncios / Comunicados | `/anuncios` | ✅ | CRUD completo con prioridades |
| 15 | Configuración | `/configuracion` | ✅ | Alertas email vía Resend, frentes y tipos de mtto configurables |
| 16 | Facturación / Cartera | `/facturacion/*` | ✅ | Facturas, recibos de caja, notas crédito/débito, cartera aging |
| 17 | Contabilidad | `/contabilidad/*` | ✅ | PUC colombiano, comprobantes, asientos, estados financieros |
| 18 | Nómina | `/nomina/*` | ✅ | Periodos, liquidación, seguridad social, prestaciones sociales |

---

## Mejoras aplicadas a módulos existentes

| Módulo | Mejora | Estado |
|--------|--------|--------|
| ✅ Dashboard | Alertas reales conectadas al timeline | ✅ |
| ✅ Dashboard | Frentes generalizados (sin hardcode Santa Rosa) | ✅ |
| ✅ Auditorías | Frentes generalizados (sin hardcode Santa Rosa) | ✅ |
| ✅ Turnos | Frentes generalizados (sin hardcode Santa Rosa) | ✅ |
| ✅ Maquinaria | Checklist Diario (15 items, historial, operador) | ✅ |
| ✅ Calendario | Refiltrado al cambiar de mes, sin límite de 500 | ✅ |
| ✅ Mobile | Sidebar overlay, responsive, safe-area | ✅ |
| ✅ Server Actions | Migración de operaciones de escritura | ✅ |
| ✅ Dark Mode | Premium (Linear.app/Vercel), toggle en Header, persistente | ✅ |
| ✅ Confirmaciones | Modal Tailwind en vez de window.confirm() | ✅ |
| ✅ Código defensivo | try/catch redundantes eliminados en toda la app | ✅ |
| ✅ Tests | Tests unitarios para aceite, maquinaria, facturación, nómina, auditoría, órdenes mtto | ✅ |
| ✅ Sin límites duros | .limit(100) removido de ubicación, anuncios y calendario | ✅ |
| ✅ Umbrales | Configurables por módulo con UI en Configuración | ✅ |
| ✅ Autenticación | proxy.js con protección de rutas + redirect post-login | ✅ |
| ✅ Seguridad HTTP | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | ✅ |
| ✅ Auditoría DB | audit_log con triggers automáticos en 11 tablas críticas + RLS solo admin | ✅ |
| ✅ Login | Suspense boundary, manejo de redirect params | ✅ |

---

## Estado del proyecto

| Métrica | Valor |
|---------|-------|
| Módulos funcionales | 18 |
| Mejoras aplicadas | 18 |
| Archivos fuente | ~160+ |
| Páginas (page.js) | 60+ |
| Scripts SQL | 19 migraciones |
| Tests unitarios | 6 suites |
| Componentes de seguridad | 4 (proxy, headers, audit_log, RLS policies) |

---

## Arquitectura técnica actual

```
plataforma-corporativa/
├── src/
│   ├── app/           → 18 módulos con App Router
│   ├── components/
│   │   ├── layout/    → Sidebar, Header, MainLayout
│   │   └── ui/        → StatsCard, ProgressRing, Pagination, etc.
│   ├── context/       → RoleContext, ThemeContext, AlertContext, ToastContext
│   ├── hooks/         → useAlertas, usePaginacion, useUmbrales
│   └── lib/
│       ├── supabase/  → client.js, server.js, paginacion.js
│       │               y módulos server actions
│       ├── utils/     → helpers por módulo
│       ├── validaciones/ → esquemas Zod por módulo
│       ├── __tests__/ → tests unitarios (Vitest)
│       └── sql/       → migraciones SQL
```

---

> Proyecto considerado completo en su alcance actual. No se contemplan nuevos módulos. Solo mantenimiento correctivo y mejoras menores sobre los existentes.
