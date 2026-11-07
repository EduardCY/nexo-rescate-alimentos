# Cuaderno de Ejecución: Eduard Criollo Yule (Product Owner / Data Lead)

> [!NOTE]
> **ESTADO DE TAREAS PARA EDUARD CRIOLLO YULE:**
> - **`TASK-14` (Ola 1):** ✅ **COMPLETADA Y FUSIONADA EN `main`** (PR #35 aprobado por Felipe Charria y fusionado).
> - **`TASK-33` (Etapa Final):** ⏳ **PENDIENTE** — Se ejecutará tras fusionar las Olas 2 y 3 para la Revisión Transversal 360° y cierre de DoD.

---

## 🟢 OLA 1 · Tarea 1 (`CMP-05`): Agregador de Métricas Reales y Matriz RBAC (`TASK-14`) [COMPLETADA]

* **Estado:** ✅ `Terminado` (Merged en `main` via PR #35).
* **Entregables Integrados:**
  - `src/lib/rbac/permisos.ts`: Matriz `RBAC_PERMISOS` y funciones `tienePermiso`, `puedeAccederRuta`.
  - `src/actions/metricas.ts`: Agregador `obtenerMetricasImpactoReal` con principio de Cero Datos Inventados (`estado === 'ENTREGADA'`).
  - `src/lib/metrics.ts`: Eliminación de constantes dummy en producción.
  - `tests/unit/task-14-metricas-rbac.test.ts`: 11 pruebas unitarias pasando al 100%.

---

## 🟣 ETAPA FINAL (Post-Ola 3) · Tarea 2 (`TRANSVERSAL`): Revisión Transversal Final 360° y Cierre de DoD (`TASK-33`)

* **Cuándo ejecutarla:** **ÚNICAMENTE DESPUÉS** de que tú y Felipe Charria hayan revisado, aprobado y hecho `Merge` a `main` de todos los Pull Requests de la **Ola 2** (`TASK-13`, `TASK-30`, `TASK-25`, `TASK-28`) y **Ola 3** (`TASK-27`, `TASK-31`, `TASK-26`, `TASK-32`).
* **Rama Git que debes crear:** `docs/TASK-33-cierre-transversal-dod`
* **Archivos que puedes modificar:** `docs/spec/comportamientos.md`, `docs/spec/requisitos.md`, `docs/spec/plan-tecnico.md`, `docs/spec/tablero-github-projects.md`, `README.md`
* **Quién debe aprobar este último PR en GitHub:** **Felipe Charria Caicedo (QA)**.

### Pasos en tu Terminal antes y después de usar el Prompt:
```bash
git checkout main
git pull origin main
git checkout -b docs/TASK-33-cierre-transversal-dod
# --- PEGA EL PROMPT DE ABAJO EN TU ASISTENTE DE CÓDIGO ---
npm run lint
npm test
npm run build
git add docs/spec/ README.md
git commit -m "docs(spec): completar revision transversal final 360 y cierre de DoD Sprint 3 [#TASK-33]"
git push -u origin docs/TASK-33-cierre-transversal-dod
```

### Prompt para copiar y pegar (`TASK-33` — `TRANSVERSAL`):
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
   - Actualiza el campo Status de Issue 5 (CMP-05), Issue 6 (TRANSVERSAL) y de las tareas de la Ola 2 y 3 a 'Terminado'.
4. En README.md:
   - Verifica que estén listadas las nuevas rutas operativas (/rastreo, /impacto, /admin/usuarios, /~offline) y el resumen de la arquitectura PWA Offline-First y RBAC. Guarda en UTF-8 sin BOM.
```
