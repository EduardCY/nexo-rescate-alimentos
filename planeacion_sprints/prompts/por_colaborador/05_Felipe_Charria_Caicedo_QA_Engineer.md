# Cuaderno de Ejecución: Felipe Charria Caicedo (QA Engineer & Co-Revisor de PRs)

> [!IMPORTANT]
> **INSTRUCCIONES DE EJECUCIÓN, CO-REVISIÓN Y ORDEN DE OLA (LEER ANTES DE EMPEZAR):**
> 1. **Rol de Co-Revisor junto a Eduard Criollo Yule (En Olas 1, 2, 3 y Cierre Final):**
>    - Tú eres el compañero designado para asistir a **Eduard Criollo Yule (Product Owner)** en la revisión y aprobación (`Approve`) de los Pull Requests de todo el equipo al final de cada Ola.
> 2. **Tus 2 Tareas de Código de Pruebas pertenecen a la OLA 3:**
>    - **¿Cuándo debes ejecutar tus 2 tareas (`TASK-26` y `TASK-32`)?** Espera a que tú y Eduard hayan fusionado en `main` los PRs de las **Olas 1 y 2**. En ese momento, haz `git checkout main && git pull origin main` y ejecuta tus 2 tareas de pruebas automatizadas.
>    - **Tarea 1 (`TASK-26` — `CMP-05`):** Suite BDD de pruebas para Trazabilidad, Cero Datos Inventados, confinamiento RBAC y sesión offline (`tests/unit/cmp-05-trazabilidad-impacto.test.ts` y `tests/unit/cmp-05-rbac-usuarios.test.ts`).
>    - **Tarea 2 (`TASK-32` — `TRANSVERSAL`):** Suite de pruebas transversales PWA Offline-First, cola Outbox, catálogo offline y algoritmo determinista de código `OFFLINE-DON` (`tests/integration/offline-pwa-outbox.test.ts` y `tests/unit/cmp-01-validacion-donacion.test.ts`).
> - **Regla obligatoria de GitHub:** Sube cada tarea en su propia rama desde **tu cuenta personal de GitHub** y abre **2 Pull Requests** asignando como revisores a **Eduard Criollo Yule (PO)** y **Alejandro Rodríguez Cortés**. **Está prohibido hacer auto-merge.**

---

## 🔵 OLA 3 · Paso 1: Ejecutar `TASK-26` (`CMP-05` · Suites BDD de Trazabilidad, Impacto Real y RBAC)

* **Rama Git que debes crear:** `test/TASK-26-qa-bdd-cmp05-rbac`
* **Archivos que debes crear/modificar únicamente:**
  - `tests/unit/cmp-05-trazabilidad-impacto.test.ts`
  - `tests/unit/cmp-05-rbac-usuarios.test.ts`

### 1.1. Comandos de Terminal para tu `TASK-26`:
```bash
# 1. Verifica que Git tenga tu nombre y correo de tu cuenta de GitHub
git config user.name
git config user.email

# 2. Baja los cambios fusionados de las Olas 1 y 2 y crea tu rama de la Tarea 26
git checkout main
git pull origin main
git checkout -b test/TASK-26-qa-bdd-cmp05-rbac

# 3. Pega el Prompt de TASK-26 en tu IA / Editor e implementa las pruebas

# 4. Ejecuta las suites en Vitest y verifica 100% en verde
npx vitest run tests/unit/cmp-05-trazabilidad-impacto.test.ts tests/unit/cmp-05-rbac-usuarios.test.ts
npm test

# 5. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #1 en GitHub
git add tests/unit/cmp-05-trazabilidad-impacto.test.ts tests/unit/cmp-05-rbac-usuarios.test.ts
git commit -m "test(cmp-05): agregar suites BDD de trazabilidad, impacto real y seguridad RBAC [#TASK-26]"
git push -u origin test/TASK-26-qa-bdd-cmp05-rbac
```

### 1.2. Prompt para copiar y pegar (`TASK-26` — `CMP-05`):
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

## 🔵 OLA 3 · Paso 2: Ejecutar `TASK-32` (`TRANSVERSAL` · Pruebas PWA Offline-First, Outbox y Algoritmo C1)

* **Rama Git que debes crear:** `test/TASK-32-qa-pwa-offline-c1`
* **Archivos que debes crear/modificar únicamente:**
  - `tests/integration/offline-pwa-outbox.test.ts`
  - `tests/integration/offline-flow.test.ts`
  - `tests/unit/cmp-01-validacion-donacion.test.ts`

### 2.1. Comandos de Terminal para tu `TASK-32`:
```bash
# 1. Vuelve a main y crea la rama de la Tarea 32
git checkout main
git pull origin main
git checkout -b test/TASK-32-qa-pwa-offline-c1

# 2. Pega el Prompt de TASK-32 en tu IA / Editor e implementa las pruebas

# 3. Ejecuta toda la suite de Vitest y verifica 100% en verde
npm test
npm run build

# 4. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #2 en GitHub
git add tests/integration/offline-pwa-outbox.test.ts tests/integration/offline-flow.test.ts tests/unit/cmp-01-validacion-donacion.test.ts
git commit -m "test(pwa): certificar cola Outbox, catalogo offline y algoritmo determinista C1 [#TASK-32]"
git push -u origin test/TASK-32-qa-pwa-offline-c1
```

### 2.2. Prompt para copiar y pegar (`TASK-32` — `TRANSVERSAL`):
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

## 🟣 Guía de Co-Revisión de Pull Requests junto a Eduard Criollo Yule (Al cierre de cada Ola)

Como **QA Engineer**, en cada cierre de Ola debes entrar a la pestaña **Pull Requests** del repositorio en GitHub junto a **Eduard Criollo Yule**:
1. Entra al PR del compañero → pestaña **Files changed**.
2. Verifica que el check de **GitHub Actions CI** esté en verde y que solo haya modificado los archivos autorizados de su tarea.
3. Haz clic en el botón verde **Review changes** → selecciona **Approve** → escribe un comentario corto de certificación QA (ej. *"Revisado por QA: cumple criterios BDD y pruebas en verde"*) → **Submit review**.

---

<details>
<summary>📂 Histórico de Tareas Ya Completadas en Sprints Anteriores (NO EJECUTAR — Solo Referencia)</summary>

- `TASK-10`: Suite de estrés y concurrencia con `Promise.all()` (`Terminado`).
- `TASK-12`: Suite de auditoría de Habeas Data Ley 1581 (`Terminado`).
- `TASK-17`: Suite unitaria de catálogo y cadena de frío (`Terminado`).

</details>
