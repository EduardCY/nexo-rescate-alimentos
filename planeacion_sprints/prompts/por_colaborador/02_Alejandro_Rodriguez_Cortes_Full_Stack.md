# Cuaderno de Ejecución: Alejandro Rodríguez Cortés (Full-Stack Developer)

> [!IMPORTANT]
> **INSTRUCCIONES DE EJECUCIÓN Y ORDEN DE OLA (LEER ANTES DE EMPEZAR):**
> - **Tú perteneces a la OLA 2 (Panel Admin/Impacto RBAC y Service Worker PWA Offline-First).**
> - **¿Cuándo debes empezar?** Espera a que **Eduard Criollo Yule (Product Owner)** te confirme por mensaje que la **Ola 1** (donde Eduard y Juan Sebastián crearon `obtenerMetricasImpactoReal`, `src/lib/rbac/permisos.ts` y `src/actions/usuarios-admin.ts`) ya fue fusionada en `main`. En cuanto te avise, haz `git checkout main && git pull origin main` y ejecuta tus 2 tareas.
> - Tienes asignadas **2 tareas pendientes de cierre**:
>   1. **Tarea 1 (`TASK-25` — `CMP-05`):** Panel de Impacto (`/impacto`), Módulo de Administración de Usuarios (`/admin/usuarios`), exportación CSV y middleware RBAC (`src/middleware.ts`).
>   2. **Tarea 2 (`TASK-28` — `TRANSVERSAL`):** Service Worker Offline-First (`public/sw.js`), App Shell Pre-caching, ruta `/~offline` y navegación SPA sin red.
> - **Regla obligatoria de GitHub:** Sube cada tarea en su propia rama desde **tu cuenta personal de GitHub** y abre **2 Pull Requests** asignando como revisores a **Eduard Criollo Yule (PO)** y **Felipe Charria Caicedo (QA)**. **Está prohibido hacer auto-merge.**

---

## 🟡 OLA 2 · Paso 1: Ejecutar `TASK-25` (`CMP-05` · Panel de Impacto, Módulo Admin de Usuarios y Middleware RBAC)

* **Rama Git que debes crear:** `feat/TASK-25-panel-admin-impacto-rbac`
* **Archivos que debes crear/modificar únicamente:**
  - `src/app/impacto/page.tsx`
  - `src/app/admin/usuarios/page.tsx`
  - `src/components/admin/MetricasDashboard.tsx`
  - `src/components/admin/ExportarReporteCSV.tsx`
  - `src/components/admin/UsuariosAdminTable.tsx`
  - `src/middleware.ts`

### 1.1. Comandos de Terminal para tu `TASK-25`:
```bash
# 1. Verifica que Git tenga tu nombre y correo de tu cuenta de GitHub
git config user.name
git config user.email

# 2. Baja los cambios fusionados de la Ola 1 y crea tu rama de la Tarea 25
git checkout main
git pull origin main
git checkout -b feat/TASK-25-panel-admin-impacto-rbac

# 3. Pega el Prompt de TASK-25 en tu IA / Editor e implementa los cambios

# 4. Verifica que todo compile y pase pruebas
npm run lint
npm test
npm run build

# 5. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #1 en GitHub
git add src/app/impacto/page.tsx src/app/admin/usuarios/page.tsx src/components/admin/MetricasDashboard.tsx src/components/admin/ExportarReporteCSV.tsx src/components/admin/UsuariosAdminTable.tsx src/middleware.ts
git commit -m "feat(admin): implementar modulo de usuarios RBAC, panel de impacto y exportacion CSV [#TASK-25]"
git push -u origin feat/TASK-25-panel-admin-impacto-rbac
```

### 1.2. Prompt para copiar y pegar (`TASK-25` — `CMP-05`):
```text
Actúa como Asistente Técnico Especializado en Frontend Full-Stack y Control de Acceso para Alejandro Rodríguez Cortés (Full-Stack Developer).
Proyecto: Nexo Rescate Alimentos (Next.js 14 App Router, Tailwind CSS, TypeScript).
Comportamiento Padre: CMP-05 (RBAC, Gestión de Usuarios, Trazabilidad e Impacto Real - Sprint 3 - OLA 2).
Tarea Asignada: [TASK-25] Implementar Panel de Impacto (/impacto), Módulo de Administración de Usuarios (/admin/usuarios), exportación CSV y middleware RBAC.
Archivos Autorizados: src/app/impacto/page.tsx, src/app/admin/usuarios/page.tsx, src/components/admin/MetricasDashboard.tsx, src/components/admin/ExportarReporteCSV.tsx, src/components/admin/UsuariosAdminTable.tsx, src/middleware.ts

Instrucciones Específicas de Implementación:
1. En src/middleware.ts (y guarda de cliente conexa con puedeAccederRuta de src/lib/rbac/permisos.ts y validarSesionRBACOffline):
   - Intercepta el acceso a '/admin/usuarios', '/impacto' y '/configuracion'.
   - Si el rol activo es 'VOLUNTARIO', bloquea el acceso (HTTP 403 o vista restringida) garantizando confinamiento estricto a sus rutas operativas ('/donaciones', '/ruta-activa', '/entregas/[id]', '/rastreo').
2. En src/app/admin/usuarios/page.tsx y src/components/admin/UsuariosAdminTable.tsx:
   - Construye la consola exclusiva del Administrador del Sistema (ADMIN): listado de usuarios con rol, zona de Cali, vehículo y estado ('ACTIVO' | 'SUSPENDIDO'), formulario modal para crear usuario, selector para editar rol/permisos y botón de suspensión inmediata con motivo de auditoría consumiendo src/actions/usuarios-admin.ts.
3. En src/app/impacto/page.tsx, src/components/admin/MetricasDashboard.tsx y src/components/admin/ExportarReporteCSV.tsx:
   - Conecta con obtenerMetricasImpactoReal() (src/actions/metricas.ts) mostrando Kilogramos Rescatados, Raciones Servidas, CO2 Evitado y Entregas Completadas.
   - Implementa descarga nativa mediante Blob (UTF-8) del archivo CSV con columnas: Codigo,FechaRegistro,FechaEntrega,Donante,ComedorReceptor,Kilogramos,RacionesEstimadas.
4. Guarda todos los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

## 🟡 OLA 2 · Paso 2: Ejecutar `TASK-28` (`TRANSVERSAL` · Service Worker Offline-First y Navegación SPA sin Red)

* **Rama Git que debes crear:** `feat/TASK-28-pwa-service-worker-offline`
* **Archivos que debes crear/modificar únicamente:**
  - `public/sw.js`
  - `src/lib/pwa/register-sw.ts`
  - `src/app/~offline/page.tsx`
  - `src/app/layout.tsx`
  - `src/components/nexo/MenuBar.tsx`

### 2.1. Comandos de Terminal para tu `TASK-28`:
```bash
# 1. Vuelve a main y crea la rama de la Tarea 28
git checkout main
git pull origin main
git checkout -b feat/TASK-28-pwa-service-worker-offline

# 2. Pega el Prompt de TASK-28 en tu IA / Editor e implementa los cambios

# 3. Verifica que todo compile y pase pruebas
npm run lint
npm test
npm run build

# 4. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #2 en GitHub
git add public/sw.js src/lib/pwa/register-sw.ts "src/app/~offline/page.tsx" src/app/layout.tsx src/components/nexo/MenuBar.tsx
git commit -m "feat(pwa): implementar Service Worker offline-first, App Shell precaching y ruta ~offline [#TASK-28]"
git push -u origin feat/TASK-28-pwa-service-worker-offline
```

### 2.2. Prompt para copiar y pegar (`TASK-28` — `TRANSVERSAL`):
```text
Actúa como Arquitecto Especialista en Progressive Web Apps (PWAs) Offline-First para Alejandro Rodríguez Cortés (Full-Stack Developer).
Proyecto: Nexo Rescate Alimentos (Next.js 14 App Router, Service Workers, CacheStorage).
Ámbito Padre: TRANSVERSAL (Arquitectura PWA Offline-First Estricta - Sprint 3 - OLA 2).
Tarea Asignada: [TASK-28] Implementar Service Worker Offline-First (public/sw.js), App Shell Pre-caching, página /~offline y navegación SPA resiliente.
Archivos Autorizados: public/sw.js, src/lib/pwa/register-sw.ts, src/app/~offline/page.tsx, src/app/layout.tsx, src/components/nexo/MenuBar.tsx

Instrucciones Específicas de Implementación:
1. En public/sw.js:
   - Implementa un Service Worker de producción con caches versionadas (nexo-app-shell-v2, nexo-static-v2, nexo-data-v2):
     * Evento install: pre-cachea las rutas del App Shell ('/', '/donar', '/donaciones', '/ruta-activa', '/rastreo', '/~offline', '/manifest.json') y ejecuta self.skipWaiting().
     * Evento activate: purga cachés antiguas y ejecuta self.clients.claim().
     * Evento fetch:
       a) Peticiones de navegación (request.mode === 'navigate') y RSC: estrategia Stale-While-Revalidate / Network-First con timeout rápido que resuelve contra el App Shell cacheado o '/~offline', garantizando que F5 o pull-to-refresh sin red jamás muestre el dinosaurio del navegador.
       b) Activos estáticos ('/_next/static/*', iconos, fuentes, CSS/JS): estrategia Cache-First.
       c) Datos/API: estrategia Network-First con fallback controlado JSON offline.
2. En src/lib/pwa/register-sw.ts y src/app/layout.tsx:
   - Registra '/sw.js' con scope '/' al montar la aplicación en el cliente y realiza warm-up de las rutas operativas en segundo plano.
3. En src/app/~offline/page.tsx:
   - Construye la vista de respaldo offline del App Shell con acceso directo a la cola local de IndexedDB y navegación hacia '/donar' y '/donaciones' cacheados.
4. En src/components/nexo/MenuBar.tsx:
   - Asegura que todas las transiciones internas utilicen <Link prefetch={true}> de next/link y oculta enlaces de '/admin/usuarios' e '/impacto' cuando el rol activo sea 'VOLUNTARIO'.
5. Guarda todos los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

<details>
<summary>📂 Histórico de Tareas Ya Completadas en Sprints Anteriores (NO EJECUTAR — Solo Referencia)</summary>

- `TASK-03` y `TASK-04`: Validaciones de ventana y casilla Ley 1990 (`Terminado`).
- `TASK-06`: Catálogo reactivo móvil (`Terminado`).
- `TASK-09`: Modal de conflicto HTTP 409 (`Terminado`).
- `TASK-11`: Confirmación de entrega en comedor (`Terminado`).
- `TASK-19`, `TASK-20`, `TASK-22`: Mapas OpenStreetMap `RadarMap`, `LocationPickerMap` y `fitBounds` (`Terminado`).

</details>
