# Cuaderno de Ejecución: Santiago Valencia Sandoval (UX Designer / Soporte Frontend)

> [!IMPORTANT]
> **INSTRUCCIONES DE EJECUCIÓN Y ORDEN DE OLA (LEER ANTES DE EMPEZAR):**
> - **Tú perteneces a la OLA 2 (Interfaces UI/UX, Avisos Legales C1 e Inspector Outbox).**
> - **¿Cuándo debes empezar?** Espera a que **Eduard Criollo Yule (Product Owner)** te confirme por mensaje que la **Ola 1** ya fue fusionada en `main`. En cuanto te avise, haz `git checkout main && git pull origin main` y ejecuta tus 2 tareas.
> - Tienes asignadas **2 tareas pendientes de cierre**:
>   1. **Tarea 1 (`TASK-13` — `CMP-05`):** Pantalla de consulta pública (`/rastreo`), línea de tiempo (`TimelineTracker.tsx`) y banner de confinamiento visual RBAC (`RoleGuardBanner.tsx`).
>   2. **Tarea 2 (`TASK-30` — `TRANSVERSAL`):** Ajustes UI/UX de `CMP-01` (Advertencia legal colombiana resaltada `CA-01.3`, etiqueta explícita `"Temperatura Ambiente"` `CA-01.4`) e Inspector Visual de Cola Outbox (`CA-PWA.4`).
> - **Regla obligatoria de GitHub:** Sube cada tarea en su propia rama desde **tu cuenta personal de GitHub** y abre **2 Pull Requests** asignando como revisores a **Eduard Criollo Yule (PO)** y **Felipe Charria Caicedo (QA)**. **Está prohibido hacer auto-merge.**

---

## 🟡 OLA 2 · Paso 1: Ejecutar `TASK-13` (`CMP-05` · Consulta Pública `/rastreo`, Línea de Tiempo y Banner RBAC)

* **Rama Git que debes crear:** `feat/TASK-13-rastreo-timeline-ux`
* **Archivos que debes crear/modificar únicamente:**
  - `src/app/rastreo/page.tsx`
  - `src/components/rastreo/TimelineTracker.tsx`
  - `src/components/nexo/RoleGuardBanner.tsx`

### 1.1. Comandos de Terminal para tu `TASK-13`:
```bash
# 1. Verifica que Git tenga tu nombre y correo de tu cuenta de GitHub
git config user.name
git config user.email

# 2. Baja los cambios fusionados de la Ola 1 y crea tu rama de la Tarea 13
git checkout main
git pull origin main
git checkout -b feat/TASK-13-rastreo-timeline-ux

# 3. Pega el Prompt de TASK-13 en tu IA / Editor e implementa los cambios

# 4. Verifica que todo compile y pase pruebas
npm run lint
npm test
npm run build

# 5. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #1 en GitHub
git add src/app/rastreo/page.tsx src/components/rastreo/TimelineTracker.tsx src/components/nexo/RoleGuardBanner.tsx
git commit -m "feat(rastreo): implementar consulta publica, TimelineTracker y RoleGuardBanner [#TASK-13]"
git push -u origin feat/TASK-13-rastreo-timeline-ux
```

### 1.2. Prompt para copiar y pegar (`TASK-13` — `CMP-05`):
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

## 🟡 OLA 2 · Paso 2: Ejecutar `TASK-30` (`TRANSVERSAL` · Advertencia Legal C1, *"Temperatura Ambiente"* e Inspector Outbox)

* **Rama Git que debes crear:** `feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox`
* **Archivos que debes crear/modificar únicamente:**
  - `src/components/donaciones/DonacionWizard.tsx`
  - `src/components/donaciones/DonacionCard.tsx`
  - `src/components/nexo/MatchingView.tsx`
  - `src/components/nexo/DonateView.tsx`
  - `src/components/nexo/OutboxInspectorModal.tsx`
  - `src/components/nexo/OfflineStatusBadge.tsx`

### 2.1. Comandos de Terminal para tu `TASK-30`:
```bash
# 1. Vuelve a main y crea la rama de la Tarea 30
git checkout main
git pull origin main
git checkout -b feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox

# 2. Pega el Prompt de TASK-30 en tu IA / Editor e implementa los cambios

# 3. Verifica que todo compile y pase pruebas
npm run lint
npm test
npm run build

# 4. Haz commit, sube la rama desde tu cuenta y abre el Pull Request #2 en GitHub
git add src/components/donaciones/DonacionWizard.tsx src/components/donaciones/DonacionCard.tsx src/components/nexo/MatchingView.tsx src/components/nexo/DonateView.tsx src/components/nexo/OutboxInspectorModal.tsx src/components/nexo/OfflineStatusBadge.tsx
git commit -m "feat(ux): resaltar aviso legal colombiano, fijar etiqueta Temperatura Ambiente e inspector Outbox [#TASK-30]"
git push -u origin feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox
```

### 2.2. Prompt para copiar y pegar (`TASK-30` — `TRANSVERSAL`):
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

<details>
<summary>📂 Histórico de Tareas Ya Completadas en Sprints Anteriores (NO EJECUTAR — Solo Referencia)</summary>

- `TASK-02`: Formulario Mobile-First de donación (`Terminado`).
- `TASK-07`: Badge de cadena de frío y filtro por zonas de Cali (`Terminado`).
- `TASK-18`: Vista móvil de ruta activa (`Terminado`).

</details>
