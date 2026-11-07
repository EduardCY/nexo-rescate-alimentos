# Cuaderno de Ejecución: Juan Camilo Peña Sandoval (DevOps Engineer)

> [!IMPORTANT]
> **INSTRUCCIONES DE EJECUCIÓN Y ORDEN DE OLA (LEER ANTES DE EMPEZAR):**
> - **Tú perteneces a la OLA 3 (Blindaje DevOps, Cabeceras de Seguridad RBAC, Iconos PWA y Compuertas CI/CD).**
> - **¿Cuándo debes empezar?** Espera a que **Eduard Criollo Yule (Product Owner)** te confirme por mensaje que las **Olas 1 y 2** ya fueron fusionadas en `main` (porque tu script `verify-rbac-routes.mjs` y el build estricto sin `ignoreBuildErrors` verifican los archivos que tus compañeros crearon en las Olas 1 y 2). En cuanto Eduard te avise, haz `git checkout main && git pull origin main` y ejecuta tus 2 tareas.
> - Tienes asignadas **2 tareas pendientes de cierre**:
>   1. **Tarea 1 (`TASK-27` — `CMP-05`):** Cabeceras HTTP de seguridad RBAC y script verificador de rutas protegidas en CI (`scripts/verify-rbac-routes.mjs`).
>   2. **Tarea 2 (`TASK-31` — `TRANSVERSAL`):** Endurecimiento de `next.config.mjs` (eliminando `ignoreBuildErrors`), generación de iconos PWA instalables (`192x192` y `512x512`) y compuerta PWA en `.github/workflows/ci.yml`.
> - **Regla obligatoria de GitHub:** Sube cada tarea en su propia rama desde **tu cuenta personal de GitHub** y abre **2 Pull Requests** asignando como revisores a **Eduard Criollo Yule (PO)** y **Felipe Charria Caicedo (QA)**. **Está prohibido hacer auto-merge.**

---

## 🔵 OLA 3 · Paso 1: Ejecutar `TASK-27` (`CMP-05` · Cabeceras de Seguridad RBAC y Verificador CI)

* **Rama Git que debes crear:** `ci/TASK-27-devops-rbac-security-headers`
* **Archivos que debes crear/modificar únicamente:**
  - `scripts/verify-rbac-routes.mjs`
  - `next.config.mjs` (sección `headers()`)

### 1.1. Comandos de Terminal para tu `TASK-27`:
```bash
# 1. Verifica que Git tenga tu nombre y correo de tu cuenta de GitHub
git config user.name
git config user.email

# 2. Baja los cambios fusionados de las Olas 1 y 2 y crea tu rama de la Tarea 27
git checkout main
git pull origin main
git checkout -b ci/TASK-27-devops-rbac-security-headers

# 3. Pega el Prompt de TASK-27 en tu IA / Editor e implementa los cambios

# 4. Verifica que el script y el build pasen en verde
node scripts/verify-rbac-routes.mjs
npm run lint
npm test
npm run build

# 5. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #1 en GitHub
git add scripts/verify-rbac-routes.mjs next.config.mjs
git commit -m "ci(security): configurar cabeceras HTTP y verificador automatizado de rutas RBAC [#TASK-27]"
git push -u origin ci/TASK-27-devops-rbac-security-headers
```

### 1.2. Prompt para copiar y pegar (`TASK-27` — `CMP-05`):
```text
Actúa como Especialista en DevOps y DevSecOps Cloud para Juan Camilo Peña Sandoval (DevOps Engineer).
Proyecto: Nexo Rescate Alimentos (Next.js 14, GitHub Actions, Vercel).
Comportamiento Padre: CMP-05 (RBAC, Gestión de Usuarios y Seguridad Corporativa - Sprint 3 - OLA 3).
Tarea Asignada: [TASK-27] Configurar cabeceras de seguridad HTTP y script de verificación de rutas protegidas RBAC en CI.
Archivos Autorizados: scripts/verify-rbac-routes.mjs, next.config.mjs

Instrucciones Específicas de Implementación:
1. En scripts/verify-rbac-routes.mjs:
   - Construye un script ejecutable con Node.js para CI que verifique:
     a) Que existen src/lib/rbac/permisos.ts y src/middleware.ts.
     b) Que la matriz RBAC restringe explícitamente '/admin/usuarios' e '/impacto' para el rol 'VOLUNTARIO'.
     c) Que no existen llaves privadas (SUPABASE_SERVICE_ROLE_KEY) hardcodeadas en src/.
   - Si todas las comprobaciones pasan, imprime reporte en verde y sale con código 0; si falla alguna, sale con código 1.
2. En next.config.mjs:
   - Configura async headers() devolviendo cabeceras de seguridad ('X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy: strict-origin-when-cross-origin') para '/(.*)' y 'Cache-Control: no-store, max-age=0' para '/admin/:path*'.
3. Guarda los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

## 🔵 OLA 3 · Paso 2: Ejecutar `TASK-31` (`TRANSVERSAL` · Endurecer `next.config.mjs`, Iconos PWA y CI/CD)

* **Rama Git que debes crear:** `ci/TASK-31-pwa-build-hardening-icons`
* **Archivos que debes crear/modificar únicamente:**
  - `next.config.mjs`
  - `public/manifest.json`
  - `public/icons/icon-192x192.png`
  - `public/icons/icon-512x512.png`
  - `.github/workflows/ci.yml`

### 2.1. Comandos de Terminal para tu `TASK-31`:
```bash
# 1. Vuelve a main y crea la rama de la Tarea 31
git checkout main
git pull origin main
git checkout -b ci/TASK-31-pwa-build-hardening-icons

# 2. Pega el Prompt de TASK-31 en tu IA / Editor e implementa los cambios

# 3. Verifica compilación estricta, tipos y pruebas
npx tsc --noEmit
npm run lint
npm test
npm run build

# 4. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #2 en GitHub
git add next.config.mjs public/manifest.json public/icons/ .github/workflows/ci.yml
git commit -m "ci(pwa): eliminar ignoreBuildErrors, configurar iconos manifest y endurecer pipeline CI [#TASK-31]"
git push -u origin ci/TASK-31-pwa-build-hardening-icons
```

### 2.2. Prompt para copiar y pegar (`TASK-31` — `TRANSVERSAL`):
```text
Actúa como Especialista en Infraestructura Cloud, PWA Packaging y DevOps para Juan Camilo Peña Sandoval (DevOps Engineer).
Proyecto: Nexo Rescate Alimentos (Next.js 14, GitHub Actions, Vercel, Supabase).
Ámbito Padre: TRANSVERSAL (Calidad de Compilación, Instalabilidad PWA y Sostenibilidad $0 USD/mes - Sprint 3 - OLA 3).
Tarea Asignada: [TASK-31] Endurecer next.config.mjs, generar activos de iconos PWA instalables y actualizar el pipeline CI/CD.
Archivos Autorizados: next.config.mjs, public/manifest.json, public/icons/icon-192x192.png, public/icons/icon-512x512.png, .github/workflows/ci.yml

Instrucciones Específicas de Implementación:
1. En next.config.mjs:
   - Elimina ignoreBuildErrors: true e ignoreDuringBuilds: true para que cualquier error de TypeScript o ESLint detenga el build de manera estricta.
   - Añade cabeceras para '/sw.js' ('Cache-Control: no-cache, no-store, must-revalidate', 'Service-Worker-Allowed: /').
2. En public/manifest.json y public/icons/:
   - Genera físicamente public/icons/icon-192x192.png y public/icons/icon-512x512.png (PNGs válidos con identidad visual de Nexo) y referéncialos en public/manifest.json junto con start_url: '/', scope: '/', display: 'standalone' para evitar errores 404 al instalar la PWA.
3. En .github/workflows/ci.yml:
   - Asegura la ejecución de las 4 compuertas (type-check, lint, test, build) y añade un paso que ejecute node scripts/verify-rbac-routes.mjs y verifique la existencia de public/sw.js y public/manifest.json.
4. Guarda todos los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

<details>
<summary>📂 Histórico de Tareas Ya Completadas en Sprints Anteriores (NO EJECUTAR — Solo Referencia)</summary>

- `TASK-15`: Configuración base del pipeline `.github/workflows/ci.yml` y monitoreo de cuotas Free Tier `\$0 USD/mes` (`Terminado`).

</details>
