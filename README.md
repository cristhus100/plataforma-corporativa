# 🏗️ Plataforma Corporativa - Serviequipos Mantenimiento Ltda

Sistema integral de gestión empresarial desarrollado para **Serviequipos Mantenimiento Ltda** (NIT 832005736-3), ubicado en La Calera, Cundinamarca.

## 🎯 Descripción

Plataforma web corporativa que centraliza la gestión de:
- 👷 **Trabajadores**: Hojas de vida, documentos y seguridad social
- 🚜 **Maquinaria**: Inventario, mantenimiento y operadores
- 📋 **Cotizaciones**: Propuestas comerciales
- 🔔 **Alertas**: Notificaciones de vencimientos
- 📊 **Dashboard**: Indicadores clave de gestión

## 🚀 Stack Tecnológico

- **Framework**: Next.js 16.2.4
- **UI**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Storage)
- **Iconos**: Lucide React
- **Deploy**: Vercel

## 🎨 Identidad Visual

- **Amarillo Corporativo**: `#FFC107`
- **Negro Profesional**: `#1A1A1A`
- **Grises**: `#212121` a `#F5F5F5`

## 📦 Instalación Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/plataforma-corporativa.git
cd plataforma-corporativa

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev

```

## 🔐 Variables de Entorno

Crear archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## 📂 Estructura del Proyecto

```
src/
├── app/                    # Rutas Next.js (App Router)
│   ├── dashboard/         # Panel principal
│   ├── trabajadores/      # Módulo de trabajadores
│   ├── maquinaria/        # Módulo de maquinaria
│   ├── cotizaciones/      # Módulo de cotizaciones
│   └── alertas/           # Módulo de alertas
├── components/            # Componentes reutilizables
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Sidebar, Header, etc.
└── lib/                  # Utilidades
    └── supabase/         # Cliente Supabase
```

## ✨ Funcionalidades Implementadas

### ✅ Módulo Trabajadores
- CRUD completo con validaciones
- Gestión de documentos (PDF, imágenes)
- Soft Delete y Hard Delete
- Historial de cambios
- Alertas de vencimientos

### ✅ Módulo Maquinaria
- Inventario completo
- 5 tabs de detalle (Info, Documentos, Fotos, Operador, Historial)
- Estados: operativa, mantenimiento, reparación, fuera de servicio

### ✅ Sistema de Alertas
- Vencimientos de documentos
- Notificaciones visuales
- Resumen ejecutivo

### ✅ Dashboard
- Indicadores en tiempo real
- Resumen de trabajadores y maquinaria
- Estado de cotizaciones

## 🗺️ Roadmap

- [ ] Autenticación con Supabase Auth
- [ ] Roles y permisos (Admin, Gerente, Operador)
- [ ] Reportes PDF automatizados
- [ ] Módulo de clientes
- [ ] Gráficos avanzados con Recharts
- [ ] Notificaciones por email

## 👨‍💻 Desarrollador

**Cristhian Camilo Avellaneda Clavijo**

## 📄 Licencia

Proyecto privado © 2025 Serviequipos Mantenimiento Ltda. Todos los derechos reservados.

---

⚡ **Desarrollado con Next.js + Supabase**

