# OLA 2: Cuaderno Maestro de Prompts y Ejecución para Colaboradores

> [!IMPORTANT]
> **ESTADO DE LA OLA 1: COMPLETADA Y FUSIONADA EN `main`**
> La Ola 1 (`TASK-14`, `TASK-24` y `TASK-29`) fue revisada, aprobada por QA (`divdevu`) y fusionada en `main`.  
> Los colaboradores de la **Ola 2 (Santiago Valencia y Alejandro Rodríguez)** ya pueden actualizar su rama `main` con `git checkout main && git pull origin main` y arrancar sus 4 tareas concurrentes sin bloqueos.

---

## 📋 Resumen Operativo de la Ola 2

| Colaborador | Tarea Asignada | Issue | Comportamiento | Rama Git Obligatoria | Archivos Autorizados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Santiago Valencia Sandoval**<br/>*(UX Designer)* | `[TASK-13]` Consulta pública `/rastreo`, `TimelineTracker.tsx` y `RoleGuardBanner.tsx` | `#22` | `CMP-05` | `feat/TASK-13-rastreo-timeline-ux` | `src/app/rastreo/page.tsx`<br/>`src/components/rastreo/TimelineTracker.tsx`<br/>`src/components/nexo/RoleGuardBanner.tsx` |
| **Santiago Valencia Sandoval**<br/>*(UX Designer)* | `[TASK-30]` Advertencia legal colombiana (`CA-01.3`), etiqueta `"Temperatura Ambiente"` (`CA-01.4`) e Inspector Outbox (`CA-PWA.4`) | `#43` | `TRANSVERSAL` | `feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox` | `src/components/donaciones/DonacionWizard.tsx`<br/>`src/components/donaciones/DonacionCard.tsx`<br/>`src/components/nexo/MatchingView.tsx`<br/>`src/components/nexo/DonateView.tsx`<br/>`src/components/nexo/OutboxInspectorModal.tsx`<br/>`src/components/nexo/OfflineStatusBadge.tsx` |
| **Alejandro Rodríguez Cortés**<br/>*(Full-Stack Developer)* | `[TASK-25]` Panel de Impacto (`/impacto`), Módulo Admin de Usuarios (`/admin/usuarios`), exportación CSV y `src/middleware.ts` | `#38` | `CMP-05` | `feat/TASK-25-panel-admin-impacto-rbac` | `src/app/impacto/page.tsx`<br/>`src/app/admin/usuarios/page.tsx`<br/>`src/components/admin/MetricasDashboard.tsx`<br/>`src/components/admin/ExportarReporteCSV.tsx`<br/>`src/components/admin/UsuariosAdminTable.tsx`<br/>`src/middleware.ts` |
| **Alejandro Rodríguez Cortés**<br/>*(Full-Stack Developer)* | `[TASK-28]` Service Worker Offline-First (`public/sw.js`), App Shell Pre-caching, ruta `/~offline` y navegación SPA sin red | `#41` | `TRANSVERSAL` | `feat/TASK-28-pwa-service-worker-offline` | `public/sw.js`<br/>`src/lib/pwa/register-sw.ts`<br/>`src/app/~offline/page.tsx`<br/>`src/app/layout.tsx`<br/>`src/components/nexo/MenuBar.tsx` |

---

## 1. Prompts y Guía para Santiago Valencia Sandoval (UX Designer)

### Paso 1.1: Ejecutar `TASK-13` (Issue #22 · `CMP-05`)
```bash
# 1. Actualizar main con el código de la Ola 1 y crear la rama
git checkout main
git pull origin main
git checkout -b feat/TASK-13-rastreo-timeline-ux

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar compilación y pruebas
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #1
git add src/app/rastreo/page.tsx src/components/rastreo/TimelineTracker.tsx src/components/nexo/RoleGuardBanner.tsx
git commit -m "feat(rastreo): implementar consulta publica, TimelineTracker y RoleGuardBanner [#TASK-13]"
git push -u origin feat/TASK-13-rastreo-timeline-ux
```

#### Prompt para Copiar y Pegar (`TASK-13`):
```text
Actúa como Asistente Especializado en UI/UX y Visualización de Información para Santiago Valencia Sandoval (UX Designer / Soporte Frontend).
Proyecto: Nexo Rescate Alimentos (Next.js 14, Tailwind CSS, Lucide Icons).
Comportamiento Padre: CMP-05 (RBAC, Trazabilidad e Impacto Real - Sprint 3 - OLA 2).
Tarea Asignada: [TASK-13] Construir pantalla de consulta pública (/rastreo), componente visual de línea de tiempo (DON-XXX) y banner de confinamiento visual por rol.
Archivos Autorizados: src/app/rastreo/page.tsx, src/components/rastreo/TimelineTracker.tsx, src/components/nexo/RoleGuardBanner.tsx

Instrucciones Específicas de Implementación:
1. En src/app/rastreo/page.tsx:
   - Construye una barra de búsqueda destacada y accesible que acepte el código serial de la donación (ej. DON-101, DON-201 u OFFLINE-DON-...).
   - Incluye botón táctil (min-h-[48px]) "Rastrear Donación" y mensajes claros ante códigos inexistentes o en formato erróneo.
2. En src/components/rastreo/TimelineTracker.tsx:
   - Renderiza un componente visual vertical de línea de tiempo con 3 hitos secuenciales:
     * Hito 1: Publicación de la donación (Fecha/hora UTC formateada a hora Colombia es-CO, donante, tipo de alimento, etiqueta "Temperatura Ambiente" o "Requiere Refrigeración" y kg).
     * Hito 2: Asignación a voluntario logístico (Fecha/hora de toma, nombre del voluntario).
     * Hito 3: Entrega en Comedor Comunitario (Fecha/hora de entrega, nombre del comedor receptor, raciones beneficiadas).
   - Presenta insignias cromáticas de estado: DISPONIBLE (activo en hito 1), ASIGNADA (activo en hito 2), ENTREGADA (completado con check verde), EXPIRADA o CANCELADA.
3. En src/components/nexo/RoleGuardBanner.tsx:
   - Diseña un banner de alerta de acceso restringido (403 Forbidden) con estética Glassmorphism que explique al usuario con rol VOLUNTARIO que su cuenta está confinada exclusivamente a operaciones de rescate en campo (/donaciones, /ruta-activa, /entregas/[id]).
4. Cumple estrictamente WCAG 2.1 AA y guarda en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

### Paso 1.2: Ejecutar `TASK-30` (Issue #43 · `TRANSVERSAL`)
```bash
# 1. Regresar a main y crear la rama de la Tarea 30
git checkout main
git pull origin main
git checkout -b feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar compilación y pruebas
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #2
git add src/components/donaciones/DonacionWizard.tsx src/components/donaciones/DonacionCard.tsx src/components/nexo/MatchingView.tsx src/components/nexo/DonateView.tsx src/components/nexo/OutboxInspectorModal.tsx src/components/nexo/OfflineStatusBadge.tsx
git commit -m "feat(ux): resaltar aviso legal colombiano, fijar etiqueta Temperatura Ambiente e inspector Outbox [#TASK-30]"
git push -u origin feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox
```

#### Prompt para Copiar y Pegar (`TASK-30`):
```text
Actúa como Diseñador Senior UI/UX Especialista en Normativa y Experiencia Offline para Santiago Valencia Sandoval (UX Designer / Soporte Frontend).
Proyecto: Nexo Rescate Alimentos (Next.js 14, Tailwind CSS, Lucide Icons).
Ámbito Padre: TRANSVERSAL y Ajustes CMP-01 (Criterios CA-01.3, CA-01.4 y CA-PWA.4 - Sprint 3 - OLA 2).
Tarea Asignada: [TASK-30] Incorporar y resaltar advertencia legal colombiana (CA-01.3), unificar etiqueta "Temperatura Ambiente" (CA-01.4) y construir Inspector Visual de Cola Outbox (CA-PWA.4).
Archivos Autorizados: src/components/donaciones/DonacionWizard.tsx, src/components/donaciones/DonacionCard.tsx, src/components/nexo/MatchingView.tsx, src/components/nexo/DonateView.tsx, src/components/nexo/OutboxInspectorModal.tsx, src/components/nexo/OfflineStatusBadge.tsx

Instrucciones Específicas de Implementación:
1. Criterio CA-01.3 (Advertencia Legal Colombiana Resaltada en DonacionWizard.tsx y DonateView.tsx):
   - Diseña un bloque destacado de alta jerarquía visual (borde semántico ámbar/esmeralda, icono ShieldAlert / Scale y contraste >= 4.5:1 WCAG AA) que explicite la obligatoriedad de cumplir con:
     * Ley 1990 de 2019 (Política contra la pérdida y desperdicio de alimentos y exoneración de responsabilidad por buena fe).
     * Resolución 2674 de 2013 del Ministerio de Salud / INVIMA (Requisitos sanitarios de inocuidad en manipulación y transporte).
     * Ley 1581 de 2012 (Habeas Data y prohibición de captura de datos sensibles de beneficiarios).
   - Si el usuario intenta avanzar o publicar sin marcar la casilla, resalta el bloque con borde de alerta (ring-2 ring-red-500) y foco accesible.
2. Criterio CA-01.4 (Rediseño y Aclaración de Etiqueta "Temperatura Ambiente"):
   - Reemplaza en DonacionWizard.tsx, DonacionCard.tsx, MatchingView.tsx y DonateView.tsx cualquier aparición de "No (amb)", "NO (AMB.)" o "Ambiente (sin frío)" por la etiqueta explícita y formal: "Temperatura Ambiente" (acompañada de micro-copia: "Conservación segura sin cadena de frío").
3. Criterio CA-PWA.4 (Inspector Visual de Cola Outbox en OutboxInspectorModal.tsx y OfflineStatusBadge.tsx):
   - Crea un modal/drawer accesible que se abre al pulsar sobre OfflineStatusBadge.
   - Lista todos los registros en espera en IndexedDB (donaciones_offline y outbox_mutations) mostrando su código determinista (OFFLINE-DON-...), tipo de operación, hora de captura, estado ('Pendiente', 'Sincronizando', 'Sincronizado', 'Error') y botón manual "Sincronizar Ahora".
4. Guarda todos los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

## 2. Prompts y Guía para Alejandro Rodríguez Cortés (Full-Stack Developer)

### Paso 2.1: Ejecutar `TASK-25` (Issue #38 · `CMP-05`)
```bash
# 1. Actualizar main con el código de la Ola 1 y crear la rama
git checkout main
git pull origin main
git checkout -b feat/TASK-25-panel-admin-impacto-rbac

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar compilación y pruebas
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #1
git add src/app/impacto/page.tsx src/app/admin/usuarios/page.tsx src/components/admin/MetricasDashboard.tsx src/components/admin/ExportarReporteCSV.tsx src/components/admin/UsuariosAdminTable.tsx src/middleware.ts
git commit -m "feat(admin): implementar modulo de usuarios RBAC, panel de impacto y exportacion CSV [#TASK-25]"
git push -u origin feat/TASK-25-panel-admin-impacto-rbac
```

#### Prompt para Copiar y Pegar (`TASK-25`):
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

### Paso 2.2: Ejecutar `TASK-28` (Issue #41 · `TRANSVERSAL`)
```bash
# 1. Regresar a main y crear la rama de la Tarea 28
git checkout main
git pull origin main
git checkout -b feat/TASK-28-pwa-service-worker-offline

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar compilación y pruebas
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #2
git add public/sw.js src/lib/pwa/register-sw.ts "src/app/~offline/page.tsx" src/app/layout.tsx src/components/nexo/MenuBar.tsx
git commit -m "feat(pwa): implementar Service Worker offline-first, App Shell precaching y ruta ~offline [#TASK-28]"
git push -u origin feat/TASK-28-pwa-service-worker-offline
```

#### Prompt para Copiar y Pegar (`TASK-28`):
```text
Actúa como Especialista en Arquitectura Web Progresiva (PWA), Service Workers y Caché Estratégica para Alejandro Rodríguez Cortés (Full-Stack Developer).
Proyecto: Nexo Rescate Alimentos (Next.js 14 App Router, Service Workers, TypeScript).
Ámbito Padre: TRANSVERSAL (Arquitectura PWA Offline-First y Resiliencia de Red - Sprint 3 - OLA 2).
Tarea Asignada: [TASK-28] Implementar Service Worker Offline-First (public/sw.js), App Shell Pre-caching, ruta /~offline y registro resiliente.
Archivos Autorizados: public/sw.js, src/lib/pwa/register-sw.ts, src/app/~offline/page.tsx, src/app/layout.tsx, src/components/nexo/MenuBar.tsx

Instrucciones Específicas de Implementación:
1. En public/sw.js:
   - Implementa un Service Worker puro sin dependencias externas pesadas con versión estricta de caché (CACHE_NAME = 'nexo-pwa-v2').
   - Evento 'install': pre-cachea los activos esenciales del App Shell ('/', '/donaciones', '/rastreo', '/~offline', '/manifest.json').
   - Evento 'activate': purga automáticamente cachés anteriores.
   - Evento 'fetch': aplica estrategias diferenciadas:
     * Cache-First con fallback a red para recursos estáticos (_next/static, css, js, fuentes, imágenes).
     * Stale-While-Revalidate para navegación HTML del App Shell.
     * Network-First con fallback a IndexedDB/respuesta fuera de línea para peticiones de datos.
     * Si la red falla y no hay caché para una página nueva, sirve '/~offline'.
2. En src/lib/pwa/register-sw.ts y src/app/layout.tsx:
   - Registra el Service Worker en entorno cliente ('navigator.serviceWorker.register('/sw.js')') tras el evento 'load'.
3. En src/app/~offline/page.tsx:
   - Diseña una vista accesible y amigable de fuera de línea con botón "Reintentar Conexión" y enlaces a vistas cacheadas locales.
4. Guarda todos los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

## 3. Guía de Revisión y Cierre de la Ola 2 (Eduard Criollo + Felipe Charria)

Al finalizar la Ola 2, **Eduard Criollo Yule (Product Owner)** y **Felipe Charria Caicedo (QA Engineer)** se reúnen en GitHub Pull Requests para:
1. Revisar los **2 PRs de Santiago (`TASK-13` y `TASK-30`)** y los **2 PRs de Alejandro (`TASK-25` y `TASK-28`)**.
2. Verificar que los checks de CI estén en verde (`npm test`, `npm run lint`, `npm run build`).
3. Dejar revisión formal con dictamen técnico y dar clic en **Approve**.
4. Fusionar (**Merge pull request**) los 4 PRs hacia `main`.
5. Una vez fusionados, se habilita la **Ola 3**.
