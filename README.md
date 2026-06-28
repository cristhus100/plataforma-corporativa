# 🏗️ Plataforma Corporativa - Serviequipos Mantenimiento Ltda

Sistema de gestión empresarial desarrollado para **Serviequipos Mantenimiento Ltda** (NIT 832005736-3).

## 🚀 Stack Tecnológico

- **Framework**: Next.js 16.2.4 (App Router)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Charts**: Recharts
- **Mapas**: Leaflet / React-Leaflet
- **PDF**: jsPDF + jspdf-autotable
- **Iconos**: Lucide React
- **Despliegue**: Vercel

## 🎨 Identidad Visual

- **Amarillo Corporativo**: `#FFC107`
- **Negro Profesional**: `#1A1A1A`
- **Grises**: `#212121` a `#F5F5F5`
- **Dark Mode**: Premium (inspirado en Linear.app/Vercel) con toggle persistente en Header

## 📦 Instalación Local

```bash
git clone https://github.com/tu-usuario/plataforma-corporativa.git
cd plataforma-corporativa
npm install
cp .env.example .env.local
# Editar .env.local con credenciales de Supabase
npm run dev
```

## 🔐 Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## 🛡️ Seguridad

| Componente | Descripción |
|------------|-------------|
| **Proxy de autenticación** | `proxy.js` protege todas las rutas, redirige a login con preservación de URL |
| **Security Headers** | HSTS (2 años), X-Frame-Options DENY, Content-Type nosniff, Referrer-Policy, Permissions-Policy |
| **Auditoría (audit_log)** | Triggers automáticos en 11 tablas críticas con trazabilidad de quién, qué, cuándo |
| **RLS (Row Level Security)** | Políticas de acceso a nivel de fila en Supabase |
| **Server Actions** | Todas las mutaciones del lado servidor (nunca desde el cliente) |
| **Zod Validation** | Esquemas de validación en los 18 módulos |
| **Roles** | Admin / Usuario con funciones de base de datos (`es_admin()`) |

## 📂 Módulos del Sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | Indicadores, charts, actividad reciente, próximos mantenimientos |
| Trabajadores | `/trabajadores/*` | CRUD completo, historial, documentos, PDF |
| Maquinaria | `/maquinaria/*` | CRUD completo, fotos, documentos, operador, horómetros, checklist diario |
| Vehículos | `/vehiculos/*` | CRUD completo, documentos, kilometraje |
| Mantenimiento | `/mantenimiento/*` | Cambio aceite (QR), ordenes de mantenimiento (OM-XXXX) |
| Turnos | `/turnos/*` | Turnos A/B/C, asignación semanal, asistencia diaria |
| Auditorías | `/auditorias` | Cumplimiento normativo ponderado (6 categorías) |
| Alertas | `/alertas` | Alertas de documentos, maquinaria y vehículos |
| Calendario | `/calendario` | Eventos, vencimientos, cumpleaños |
| Ubicación | `/ubicacion` | Mapa Leaflet con ubicación de equipos |
| Facturación / Cartera | `/facturacion/*` | Facturas, recibos de caja, notas crédito/débito, cartera aging |
| Contabilidad | `/contabilidad/*` | PUC colombiano, comprobantes, asientos, estados financieros |
| Nómina | `/nomina/*` | Periodos, liquidación, seguridad social, prestaciones sociales |
| Anuncios | `/anuncios` | Comunicados internos |
| Configuración | `/configuracion` | Notificaciones email vía Resend, frentes y tipos mtto |

## 👨‍💻 Desarrollador

**Cristhian Camilo Avellaneda Clavijo**

## 📄 Licencia

Proyecto privado © 2026 Serviequipos Mantenimiento Ltda. Todos los derechos reservados.

---

⚡ **Desarrollado con Next.js + Supabase**
