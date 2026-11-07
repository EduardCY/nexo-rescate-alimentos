# OLA 3 Y CIERRE FINAL: Cuaderno Maestro de Prompts y Ejecución para Colaboradores

> [!IMPORTANT]
> **PRERREQUISITO DE INICIO DE LA OLA 3:**
> La Ola 3 arranca inmediatamente después de que **Eduard Criollo Yule (Product Owner)** y **Felipe Charria Caicedo (QA Engineer)** hayan revisado y fusionado (`Merged`) en `main` los 4 Pull Requests de la **Ola 2** (Santiago Valencia y Alejandro Rodríguez).

---

## 📋 Resumen Operativo de la Ola 3 y Cierre Final

| Colaborador | Tarea Asignada | Issue | Comportamiento | Rama Git Obligatoria | Archivos Autorizados |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Juan Camilo Peña Sandoval**<br/>*(DevOps Engineer)* | `[TASK-27]` Auditoría de rutas protegidas RBAC en CI y cabeceras de seguridad | `#40` | `CMP-05` | `ci/TASK-27-devops-rbac-security-headers` | `scripts/verify-rbac-routes.mjs`<br/>`next.config.mjs`<br/>`.github/workflows/ci.yml` |
| **Juan Camilo Peña Sandoval**<br/>*(DevOps Engineer)* | `[TASK-31]` Endurecer `next.config.mjs`, iconos PWA y compuertas CI/CD Free Tier | `#44` | `TRANSVERSAL` | `ci/TASK-31-pwa-build-hardening-icons` | `next.config.mjs`<br/>`public/icons/`<br/>`public/manifest.json`<br/>`.github/workflows/ci.yml` |
| **Felipe Charria Caicedo**<br/>*(QA Engineer)* | `[TASK-26]` Suites BDD de Trazabilidad, Cero Datos Inventados, confinamiento RBAC y sesión offline | `#39` | `CMP-05` | `test/TASK-26-qa-bdd-cmp05-rbac` | `tests/unit/cmp-05-trazabilidad-impacto.test.ts`<br/>`tests/unit/cmp-05-rbac-usuarios.test.ts` |
| **Felipe Charria Caicedo**<br/>*(QA Engineer)* | `[TASK-32]` Suite de pruebas transversales PWA Offline-First, Outbox, catálogo offline y algoritmo C1 | `#45` | `TRANSVERSAL` | `test/TASK-32-qa-pwa-offline-c1` | `tests/integration/offline-pwa-outbox.test.ts`<br/>`tests/integration/offline-flow.test.ts`<br/>`tests/unit/cmp-01-validacion-donacion.test.ts` |
| **Eduard Criollo Yule**<br/>*(Product Owner)* | `[TASK-33]` Revisión Transversal Final 360°, auditoría y merge de PRs junto a QA, validación de Gobierno y cierre DoD en `main` | `#46` | `TRANSVERSAL` | `docs/TASK-33-cierre-transversal-dod` | `docs/spec/comportamientos.md`<br/>`docs/spec/requisitos.md`<br/>`docs/spec/plan-tecnico.md`<br/>`docs/spec/tablero-github-projects.md`<br/>`README.md` |

---

## 1. Prompts y Guía para Juan Camilo Peña Sandoval (DevOps Engineer)

### Paso 1.1: Ejecutar `TASK-27` (Issue #40 · `CMP-05`)
```bash
# 1. Actualizar main con el código de la Ola 2 y crear la rama
git checkout main
git pull origin main
git checkout -b ci/TASK-27-devops-rbac-security-headers

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar compilación y script de verificación
node scripts/verify-rbac-routes.mjs
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #1
git add scripts/verify-rbac-routes.mjs next.config.mjs .github/workflows/ci.yml
git commit -m "ci(rbac): configurar auditoria automatizada de rutas y cabeceras de seguridad [#TASK-27]"
git push -u origin ci/TASK-27-devops-rbac-security-headers
```

#### Prompt para Copiar y Pegar (`TASK-27`):
```text
Actúa como Ingeniero Senior DevOps y Especialista en Seguridad Cloud para Juan Camilo Peña Sandoval (DevOps Engineer).
Proyecto: Nexo Rescate Alimentos (Next.js 14, GitHub Actions CI/CD, Vercel Free Tier).
Comportamiento Padre: CMP-05 (RBAC, Auditoría y Seguridad de Rutas - Sprint 3 - OLA 3).
Tarea Asignada: [TASK-27] Configurar políticas de seguridad RBAC en despliegue, auditoría de rutas protegidas en CI y verificación de cabeceras.
Archivos Autorizados: scripts/verify-rbac-routes.mjs, next.config.mjs, .github/workflows/ci.yml

Instrucciones Específicas de Implementación:
1. Crea scripts/verify-rbac-routes.mjs:
   - Script ejecutable en Node.js para el pipeline de CI que analiza estáticamente src/lib/rbac/permisos.ts y src/middleware.ts.
   - Comprueba mediante aserciones estrictas que:
     * El rol VOLUNTARIO tenga estrictamente prohibido el acceso a '/admin/usuarios', '/impacto' y '/configuracion'.
     * Las rutas protegidas devuelvan 403 Forbidden o redirección con confinamiento.
     * Salga con código de salida 0 si pasa la auditoría o 1 si detecta desprotección.
2. En next.config.mjs:
   - Configura en headers():
     * X-Frame-Options: DENY (prevención de Clickjacking).
     * X-Content-Type-Options: nosniff (prevención de MIME-sniffing).
     * Referrer-Policy: strict-origin-when-cross-origin.
     * Service-Worker-Allowed: '/' (garantiza alcance global del Service Worker).
3. En .github/workflows/ci.yml:
   - Agrega un paso de ejecución: 'node scripts/verify-rbac-routes.mjs' antes de la compilación de producción.
4. Guarda en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

### Paso 1.2: Ejecutar `TASK-31` (Issue #44 · `TRANSVERSAL`)
```bash
# 1. Regresar a main y crear la rama de la Tarea 31
git checkout main
git pull origin main
git checkout -b ci/TASK-31-pwa-build-hardening-icons

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar compilación estricta y pruebas
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #2
git add next.config.mjs public/icons/ public/manifest.json .github/workflows/ci.yml
git commit -m "ci(pwa): endurecer compilacion estricta, generar iconos PWA y auditar free tier [#TASK-31]"
git push -u origin ci/TASK-31-pwa-build-hardening-icons
```

#### Prompt para Copiar y Pegar (`TASK-31`):
```text
Actúa como Especialista en CI/CD, Optimización Web e Infraestructura de Costo Cero para Juan Camilo Peña Sandoval (DevOps Engineer).
Proyecto: Nexo Rescate Alimentos (Next.js 14, GitHub Actions CI/CD, PWA).
Ámbito Padre: TRANSVERSAL (Endurecimiento de Build, PWA Instalable y Auditoría Free Tier - Sprint 3 - OLA 3).
Tarea Asignada: [TASK-31] Endurecer next.config.mjs (eliminar ignoreBuildErrors), generar iconos PWA reales y actualizar compuertas CI/CD y Free Tier.
Archivos Autorizados: next.config.mjs, public/icons/, public/manifest.json, .github/workflows/ci.yml

Instrucciones Específicas de Implementación:
1. En next.config.mjs:
   - Elimina formalmente 'ignoreBuildErrors: true' dentro de typescript y 'ignoreDuringBuilds: true' dentro de eslint si existieran, garantizando compilación con tipado estricto al 100%.
2. En public/icons/ y public/manifest.json:
   - Genera los iconos PNG requeridos por la especificación PWA (icon-192x192.png, icon-512x512.png, icon-maskable-512x512.png, apple-touch-icon.png y favicon.ico) con la paleta oficial (esmeralda #10b981 y ámbar #f59e0b).
   - Asegura que public/manifest.json apunte correctamente a estos iconos con display: 'standalone', background_color: '#090d16' y theme_color: '#10b981'.
3. En .github/workflows/ci.yml:
   - Valida que el pipeline verifique la existencia de public/sw.js y los iconos antes del paso 'npm run build'.
4. Guarda en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

## 2. Prompts y Guía para Felipe Charria Caicedo (QA Engineer)

### Paso 2.1: Ejecutar `TASK-26` (Issue #39 · `CMP-05`)
```bash
# 1. Actualizar main con el código de la Ola 2 y crear la rama
git checkout main
git pull origin main
git checkout -b test/TASK-26-qa-bdd-cmp05-rbac

# 2. Implementar los cambios con el prompt de abajo

# 3. Ejecutar las pruebas unitarias
npx vitest run tests/unit/cmp-05-trazabilidad-impacto.test.ts tests/unit/cmp-05-rbac-usuarios.test.ts
npm test

# 4. Commit y push a GitHub para abrir PR #1
git add tests/unit/cmp-05-trazabilidad-impacto.test.ts tests/unit/cmp-05-rbac-usuarios.test.ts
git commit -m "test(cmp-05): agregar suites BDD de trazabilidad, impacto real y seguridad RBAC [#TASK-26]"
git push -u origin test/TASK-26-qa-bdd-cmp05-rbac
```

#### Prompt para Copiar y Pegar (`TASK-26`):
```text
Actúa como Asistente Técnico Especializado en QA Testing, Seguridad RBAC y Aseguramiento de Datos para Felipe Charria Caicedo (QA Engineer).
Proyecto: Nexo Rescate Alimentos (Vitest, TypeScript).
Comportamiento Padre: CMP-05 (RBAC, Gestión de Usuarios, Trazabilidad e Impacto Real - Sprint 3 - OLA 3).
Tarea Asignada: [TASK-26] Diseñar suite de pruebas BDD para CMP-05 (CA-05.1 a CA-05.4).
Archivos Autorizados: tests/unit/cmp-05-trazabilidad-impacto.test.ts, tests/unit/cmp-05-rbac-usuarios.test.ts

Instrucciones Específicas de Implementación:
1. Crea tests/unit/cmp-05-trazabilidad-impacto.test.ts:
   - Certifica CA-05.4 (Rastreo y Cero Datos Inventados):
     * Con un dataset mixto (1 DISPONIBLE de 50 kg, 1 ASIGNADA de 30 kg, 1 EXPIRADA de 20 kg y 2 ENTREGADAS de 40 kg y 60 kg), obtenerMetricasImpactoReal() retorna exactamente 100 kg.
     * Con colección vacía o sin entregas, retorna exactamente 0 en todas las métricas.
     * Valida el orden cronológico de los 3 hitos en la línea de tiempo (created_at <= asignada_at <= entregada_at).
2. Crea tests/unit/cmp-05-rbac-usuarios.test.ts:
   - Certifica CA-05.1 (Confinamiento VOLUNTARIO): verifica que puedeAccederRuta('VOLUNTARIO', '/admin/usuarios') y '/impacto' retornen false, y que invocar acciones administrativas con rol VOLUNTARIO devuelva código 403 Forbidden.
   - Certifica CA-05.2 (Módulo ADMIN): verifica creación, cambio de rol y suspensión de usuario ('SUSPENDIDO'), comprobando que un usuario suspendido no pueda tomar donaciones.
   - Certifica CA-05.3 (Sesión Offline Firmada): verifica que una sesión válida en sesion_rbac conserve sus permisos sin red, pero que si se altera el rol en almacenamiento local sin actualizar la firma HMAC o vence el TTL de 24h, la validación rechace la sesión.
3. Ejecuta npx vitest run y guarda los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

### Paso 2.2: Ejecutar `TASK-32` (Issue #45 · `TRANSVERSAL`)
```bash
# 1. Regresar a main y crear la rama de la Tarea 32
git checkout main
git pull origin main
git checkout -b test/TASK-32-qa-pwa-offline-c1

# 2. Implementar los cambios con el prompt de abajo

# 3. Ejecutar suite global de pruebas
npm test
npm run build

# 4. Commit y push a GitHub para abrir PR #2
git add tests/integration/offline-pwa-outbox.test.ts tests/integration/offline-flow.test.ts tests/unit/cmp-01-validacion-donacion.test.ts
git commit -m "test(pwa): certificar cola Outbox, catalogo offline y algoritmo determinista C1 [#TASK-32]"
git push -u origin test/TASK-32-qa-pwa-offline-c1
```

#### Prompt para Copiar y Pegar (`TASK-32`):
```text
Actúa como Ingeniero Principal de QA Automation y Auditor BDD para Felipe Charria Caicedo (QA Engineer).
Proyecto: Nexo Rescate Alimentos (Vitest, Fake-IndexedDB, TypeScript).
Ámbito Padre: TRANSVERSAL y Ajustes CMP-01 (Certificación Offline-First y Cierre de Calidad - Sprint 3 - OLA 3).
Tarea Asignada: [TASK-32] Construir suite de pruebas transversales para la arquitectura PWA Offline-First (CA-PWA.1 a CA-PWA.5) y los ajustes de CMP-01 (CA-01.3 a CA-01.5).
Archivos Autorizados: tests/integration/offline-pwa-outbox.test.ts, tests/integration/offline-flow.test.ts, tests/unit/cmp-01-validacion-donacion.test.ts

Instrucciones Específicas de Implementación:
1. Crea tests/integration/offline-pwa-outbox.test.ts:
   - Prueba CA-01.5 (Unicidad y Determinismo Offline): genera 1.000 códigos con generarCodigoDonacionOffline() y demuestra 0 colisiones, validando mediante expresión regular el patrón ^OFFLINE-DON-\d{6}-[A-F0-9]{4}-\d{3}-[A-Z0-9]{4}$ y la presencia de idempotencyKey UUID v4.
   - Prueba CA-PWA.4 (Outbox Pattern e Idempotencia): encola mutaciones offline en outbox_mutations (publicación, toma y entrega), simula reconexión con evento 'online' y verifica que un doble disparo simultáneo no duplique registros gracias al mutex y a idempotencyKey.
   - Prueba CA-PWA.5 (Catálogo Offline y Delta Sync): verifica consulta y filtrado por zona y cadena de frío desde IndexedDB sin red y actualización incremental por updated_at.
2. En tests/unit/cmp-01-validacion-donacion.test.ts:
   - Verifica el bloqueo por omisión de la casilla legal (CA-01.3) y la correspondencia de requiereFrio = false con la etiqueta canónica "Temperatura Ambiente" (CA-01.4).
3. Guarda todos los archivos en UTF-8 sin BOM. No modifiques archivos fuera de los autorizados.
```

---

## 3. Revisión y Aprobación de la Ola 3 (Eduard Criollo + Alejandro Rodríguez / Felipe Charria)

Al finalizar la Ola 3:
1. **Eduard Criollo Yule (PO)** y **Felipe Charria Caicedo (QA)** revisan y aprueban los 2 PRs de Juan Camilo Peña (`TASK-27` y `TASK-31`).
2. **Eduard Criollo Yule (PO)** y **Alejandro Rodríguez Cortés (Full-Stack)** revisan y aprueban los 2 PRs de Felipe Charria (`TASK-26` y `TASK-32`).
3. Se hace **Merge pull request** hacia `main` de los 4 PRs.

---

## 4. Cierre Final del Proyecto: `TASK-33` (Eduard Criollo Yule · Issue #46)

Tras fusionar las Olas 1, 2 y 3, **Eduard Criollo Yule** ejecuta la última tarea de gobernanza:

```bash
# 1. Bajar todo el código final integrado en main
git checkout main
git pull origin main
git checkout -b docs/TASK-33-cierre-transversal-dod

# 2. Implementar los cambios con el prompt de abajo

# 3. Validar todo el proyecto
npm run lint
npm test
npm run build

# 4. Commit y push a GitHub para el PR final
git add docs/spec/ README.md
git commit -m "docs(spec): completar revision transversal final 360 y cierre de DoD Sprint 3 [#TASK-33]"
git push -u origin docs/TASK-33-cierre-transversal-dod
```

#### Prompt para Copiar y Pegar (`TASK-33`):
```text
Actúa como Auditor Técnico Senior y Product Owner para Eduard Criollo Yule (Product Owner / Data Lead).
Proyecto: Nexo Rescate Alimentos (Gobernanza Ágil, GitHub Projects, UAO Módulo 3).
Ámbito Padre: TRANSVERSAL (Revisión Transversal Final del Proyecto y Cierre de Sprint 3).
Tarea Asignada: [TASK-33] Ejecutar la Revisión Transversal Final 360° y cerrar el 100% del DoD en la documentación oficial tras la fusión de las Olas 1, 2 y 3.
Archivos Autorizados: docs/spec/comportamientos.md, docs/spec/requisitos.md, docs/spec/plan-tecnico.md, docs/spec/tablero-github-projects.md, README.md

Instrucciones Específicas de Ejecución:
1. Verifica que todas las pruebas unitarias, de integración y de gobernanza (npm test) y el build de producción (npm run build) pasen al 100% en verde.
2. En docs/spec/comportamientos.md:
   - Marca como completadas ([x]) todas las casillas de la Definición de Terminado (DoD) de CMP-05 y de CMP-PWA (TRANSVERSAL).
3. En docs/spec/tablero-github-projects.md:
   - Actualiza el campo Status de Issue 5 (CMP-05), Issue 6 (TRANSVERSAL) y de todas las tareas restantes a 'Terminado'.
4. En README.md:
   - Verifica que estén listadas las nuevas rutas operativas (/rastreo, /impacto, /admin/usuarios, /~offline) y el resumen de la arquitectura PWA Offline-First y RBAC. Guarda en UTF-8 sin BOM.
```

5. **Felipe Charria Caicedo (QA)** aprueba el PR de `TASK-33` y se fusiona a `main`.  
Con esto concluye formalmente la construcción ágil del MVP del proyecto.
