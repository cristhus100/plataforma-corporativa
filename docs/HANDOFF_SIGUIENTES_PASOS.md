# Handoff — Plataforma Corporativa (próximos pasos)

**Fecha:** 2026-11-13
**Sesión actual:** revisión/auditoría final + fix de render del artefacto + propuesta comercial.
**Estado del repo:** última corrida buena fue `99f9c0e` (alertas fix + propuesta comercial). Hoy (2026-11-13) se añadió/limpió el artefacto de la propuesta y se actualizó la memoria.

---

## ✅ Lo que ya quedó hecho

1. **Fix alertas — pestaña de máquinas** (`src/app/alertas/page.js:550`): variable `loadingAceite` no definida → `ReferenceError` → "Algo salió mal". Corregido a `loading` (del `AlertContext`).
2. **Propuesta comercial actualizada**: precios (Básico $12.5M · Profesional $28M · Enterprise desde $48M · suscripción $790K/mes) + bloque "Valor real" (plataforma verificada: 186 pruebas, 47 rutas, RLS, seguridad).
3. **Fix de render del artefacto**:
   - Se creó `propuesta_artifact.html` (versión lista para el visor de Artifacts, sin duplicar `<!DOCTYPE>/<html>/<head>/<body>`).
   - Se añadió `<meta charset="utf-8">` al inicio porque el navegador mostraba los acentos y la ñ mal (mojibake).
   - Se verificó: el archivo era UTF-8 válido (`auditoría` → bytes correctos).
4. **Servidor local para verla**: `python -m http.server 8765 --directory "<ruta del proyecto>"` → abrir `http://localhost:8765/propuesta_artifact.html`. Servidor detenido después de usarlo.
5. **Verificación previa**: `npm test` → 186 tests OK; `npm run build` → 47 rutas, 0 errores. ESLint OK. Servidor dev OK.

---

## ❌ No se pudo hacer esta sesión

- **Publicar la propuesta como Artifact en claude.ai**: la sesión estaba autenticando con `ANTHROPIC_AUTH_TOKEN`, por lo que el `Artifact publish` fue rechazado ("Artifacts need a claude.ai login...").
  - **Para reintentar:** ejecutar `/login` y seleccionar *"Claude account with subscription"*; o desactivar `ANTHROPIC_AUTH_TOKEN`.

---

## 📋 Pasos a seguir — "con qué seguir" cuando vuelva

### A. Publicar la propuesta como Artifact (prioridad: alto)

1. `/login` (seleccionar Claude account con subscription) o desactivar `ANTHROPIC_AUTH_TOKEN`.
2. Publicar `propuesta_artifact.html` vía la herramienta `Artifact`:
   - `file_path`: `C:\Users\Administrator\.gemini\antigravity\scratch\plataforma-corporativa\propuesta_artifact.html`
   - `title`: `Propuesta Comercial`
   - `icon`: `document`
3. Compartir el link con el usuario para que la vea en el artefacto.

> ⚠️ **Nota:** el botón "Descargar propuesta en PDF" (`window.print()`) no funciona dentro del Artifact. El botón de contacto usa `mailto:` (inconsistente en viewer). Si se quiere, sustituir el PDF por un botón "Copiar resumen" o dejarlo fuera.

### B. Validaciones / deuda técnica pendiente (no bloqueante)

1. **Commit + push** de los cambios en working tree:
   - `docs/propuesta_comercial.html` (title → "Propuesta Comercial")
   - `propuesta_artifact.html` (nuevo, con charset)
   - ⚠️ El `git commit && git push origin main` fue **bloqueado por el auto-mode classifier** — no reintentar por código ahora, hacerlo manualmente (o con permiso).
2. **Migraciones SQL**: aplicar contra BD real cuando haya credenciales (`src/lib/sql/`: `crear_perfiles.sql`, `vehiculos_recrear.sql`, `migracion_filtro_aire.sql`).
3. **Validación en vivo**: `npm run dev` para probar rutas críticas (facturación, nómina, login, alertas).
4. **Deploy a producción**: no hay Vercel/Netlify CLI ni tokens en este entorno. Conectar el repo a Vercel manualmente.

### C. Cuando retome desarrollo nuevo (orden sugerido)

1. Revisar `docs/HANDOFF_SIGUIENTES_PASOS.md` y `MEMORY.md` (índice: `plataforma-corporativa-auditoria-estado`).
2. Correr `npm test` y `npm run build` antes de tocar nada nuevo.
3. Seguir las convenciones Next.js 16 (`src/proxy.js`, NO `middleware.js`).

---

## 🧾 Resumen de comandos útiles

```bash
# Ver propuesta localmente
python -m http.server 8765 --directory "C:\Users\Administrator\.gemini\antigravity\scratch\plataforma-corporativa"
# -> abrir http://localhost:8765/propuesta_artifact.html

# Tests / build
npm test
npm run build

# Tests (vitest)
npx vitest run
```
