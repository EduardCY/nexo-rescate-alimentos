# Configuración y Catálogo de Issues para el Tablero de GitHub Projects

**Proyecto:** Red de Rescate de Alimentos  
**Organización:** Fundación Mesa Común (Cali, Colombia)  
**Equipo:** Nexo Cívico Studio (Equipo 3)  
**Herramienta:** GitHub Projects (`https://github.com/users/EduardCY/projects/` / Repositorio: `EduardCY/nexo-rescate-alimentos`)  
**Versión:** 2.0 — Entrega 3A  

---

## 1. Arquitectura y Configuración del Tablero en GitHub Projects

El tablero ágil del equipo está configurado con las siguientes especificaciones normativas acordadas para el Módulo 3:

### 1.1. Columnas y Flujo de Estados (4 Estados Obligatorios)
1. **`Por hacer` (To Do):** Historias y tareas priorizadas que cumplen al 100% con la **Definición de Listo (DoR)**. Ningún ítem ingresa a esta columna sin historia formulada, criterios en Gherkin, estimación, dispositivo de prueba y trazabilidad explícita.
2. **`En curso` (In Progress):** Trabajo activo asignado con nombre propio a un integrante del equipo.
3. **`En revisión` (In Review / Code Review & QA):** Tarea terminada por el desarrollador que pasa a verificación funcional por un integrante distinto (rol de QA / Peer Review).
4. **`Terminado` (Done):** Ítems que cumplen a cabalidad con la **Definición de Terminado (DoD)**: pruebas pasadas, código integrado en `main`, pruebas de gobierno verificadas y demostración con rol y dispositivo real.

### 1.2. Campos Personalizados del Proyecto (Custom Fields)
* **`Status`:** `Por hacer` | `En curso` | `En revisión` | `Terminado`
* **`CMP`:** Identificador del comportamiento (`CMP-01`, `CMP-02`, `CMP-03`, `CMP-04`, `CMP-05`, `TRANSVERSAL`)
* **`Origen`:** Requerimiento trazado del Módulo 1 (ej. `RF-001 · US1.1`)
* **`Estimación`:** Esfuerzo en horas de sesión individual (ej. `3` o `4` horas)
* **`Assignees`:** Integrante asignado (responsabilidad individual para sustentar en Sprint Review)
* **`Labels`:** `historia`, `mvp`, `backend`, `frontend`, `qa`, `devops`, `ux`

---

## 2. Catálogo de Historias y Comportamientos (Issues Maestros del Tablero)

A continuación se presentan los issues principales del núcleo del MVP, estructurados con el estándar exacto definido por el docente en clase:

---

### Issue 1: CMP-01 · Un comercio publica una donación

* **Título:** `CMP-01 · Un comercio publica una donación`
* **Labels:** `historia`, `mvp`, `cmp-01`
* **Campos del Tablero:**
  * **Status:** `En revisión` (o `Por hacer`)
  * **CMP:** `CMP-01`
  * **Origen:** `RF-001 · US1.1`
  * **Estimación:** `4`
  * **Assignee:** Alejandro Rodríguez Cortés / Santiago Valencia Sandoval

```markdown
Historia (US1.1): Como comerciante donante, quiero registrar una donación de alimentos con su cantidad, ventana de recogida y aceptación legal, para que los voluntarios y comedores comunitarios sepan qué hay disponible y cuándo recogerlo.

Comportamiento: CMP-01 en comportamientos.md · Origen: RF-001 - US1.1

Criterios de aceptación
- CA-01.1 Dado un comercio con sesión iniciada, cuando registra el tipo de alimento, la cantidad, la ventana de recogida y la ubicación, y acepta la exoneración de la Ley 1990 de 2019, entonces la donación queda en estado DISPONIBLE y aparece en la lista de los voluntarios.
- CA-01.2 Dada una ventana cuya hora límite es anterior o igual a la hora de publicación, cuando el comercio intenta publicar, entonces se rechaza y se le dice que la hora límite debe ser posterior.
- CA-01.3 Dada una ventana cuya hora límite ya pasó, cuando el comercio intenta publicar, entonces se rechaza y se le pide revisar la hora.
- CA-01.4 Dado que el alimento requiere refrigeración, cuando se publica, entonces la donación queda marcada con la etiqueta destacada "Requiere Refrigeración" y solo la pueden reservar comedores con refrigeración funcional (ver CMP-02).
- CA-01.5 Dado que el comercio se encuentra sin señal en la plaza de mercado, cuando envía la oferta, el sistema la guarda localmente en IndexedDB y la sincroniza al recuperar red.

Se prueba como: comercio · teléfono

Definición de Terminado
- [ ] Cumple todos sus criterios de aceptación
- [ ] El código está revisado y aprobado por otro integrante (Felipe Charria - QA)
- [ ] Tiene pruebas automatizadas y todas pasan: pruebas unitarias de validación de horas y formulario
- [ ] Está integrada en main sin romper la compilación
- [ ] La documentación afectada está actualizada en docs/spec/
- [ ] Pasan las dos pruebas de gobierno (cero datos inventados y consentimiento legal sin almacenar datos sensibles)
- [ ] Se probó entrando con el rol real (comercio) en dispositivo teléfono móvil
```

---

### Issue 2: CMP-02 · Visualización y filtrado de donaciones disponibles

* **Título:** `CMP-02 · Visualización y filtrado de donaciones disponibles`
* **Labels:** `historia`, `mvp`, `cmp-02`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-02`
  * **Origen:** `RF-002 · US2.1`
  * **Estimación:** `3`
  * **Assignee:** Alejandro Rodríguez Cortés / Santiago Valencia Sandoval

```markdown
Historia (US2.1): Como voluntario de transporte u organización receptora, quiero consultar las donaciones activas filtradas por cercanía geográfica y requerimiento de refrigeración, para identificar rápidamente qué alimentos puedo rescatar según mi capacidad instalada.

Comportamiento: CMP-02 en comportamientos.md · Origen: RF-002 / RF-014 - US2.1

Criterios de aceptación
- CA-02.1 Dado que existen donaciones en estado DISPONIBLE con ventana vigente, cuando un voluntario o receptor abre el catálogo, entonces el sistema muestra únicamente las donaciones disponibles ordenadas por cercanía y urgencia.
- CA-02.2 Dada una donación perecedera con requiereFrio = true, cuando se visualiza en la lista de ofertas, entonces exhibe la etiqueta visual "Requiere Refrigeración" y el temporizador con el tiempo restante antes de expirar.
- CA-02.3 Dado un comedor comunitario sin refrigeración (tieneRefrigeracion = false), cuando consulta las donaciones, el sistema advierte o bloquea la reserva de lotes que exijan cadena de frío.
- CA-02.4 Dada una donación cuya hora límite ya pasó sin ser tomada, cuando expira la ventana, entonces desaparece automáticamente de la vista de disponibles y transiciona a EXPIRADA.

Se prueba como: voluntario / comedor receptor · teléfono

Definición de Terminado
- [ ] Cumple todos sus criterios de aceptación
- [ ] El código está revisado y aprobado por otro integrante
- [ ] Tiene pruebas automatizadas y todas pasan
- [ ] Está integrada en main sin romper la compilación
- [ ] La documentación afectada está actualizada en docs/spec/
- [ ] Pasan las dos pruebas de gobierno (tiempos y cantidades calculadas desde base de datos, sin cifras inventadas)
- [ ] Se probó entrando con el rol real (voluntario/comedor) en dispositivo teléfono móvil
```

---

### Issue 3: CMP-03 · Toma de donación con bloqueo de segunda toma (Reserva Única)

* **Título:** `CMP-03 · Toma de donación con bloqueo de segunda toma (Reserva Única)`
* **Labels:** `historia`, `mvp`, `cmp-03`, `nucleo`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-03`
  * **Origen:** `RF-004 · US3.1`
  * **Estimación:** `4`
  * **Assignee:** Juan Sebastián Delgado / Felipe Charria Caicedo

```markdown
Historia (US3.1): Como voluntario de transporte u organización receptora, quiero reservar de manera exclusiva una donación disponible, para asegurar la recogida sin que otra persona u organización se desplace simultáneamente por la misma carga.

Comportamiento: CMP-03 en comportamientos.md · Origen: RF-004 / RF-010 - US3.1

Criterios de aceptación
- CA-03.1 Dada una donación en estado DISPONIBLE, cuando el voluntario A selecciona "Tomar Donación", entonces la transacción atómica actualiza el estado a ASIGNADA, asigna al voluntario A y muestra la dirección y contacto del donante.
- CA-03.2 Dada una donación que acaba de ser asignada al voluntario A, cuando el voluntario B intenta tomarla en simultáneo, entonces la base de datos detecta que no está DISPONIBLE, rechaza la solicitud con HTTP 409 Conflict y muestra la notificación amigable: "Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas."
- CA-03.3 Dada la respuesta de conflicto en la interfaz del voluntario B, cuando se recibe el error 409, entonces la donación se remueve reactivamente de su lista sin necesidad de recargar la página.
- CA-03.4 Dada una donación expirada o cancelada, cuando cualquier usuario intenta tomarla, el sistema bloquea la acción indicando que la oferta ya no se encuentra vigente.

Se prueba como: voluntario · teléfono (prueba de concurrencia simulada)

Definición de Terminado
- [ ] Cumple todos sus criterios de aceptación
- [ ] El código está revisado y aprobado por otro integrante (Felipe Charria - QA)
- [ ] Tiene pruebas automatizadas de concurrencia y todas pasan (simulación de 2 requests en paralelo)
- [ ] Está integrada en main sin romper la compilación
- [ ] La documentación afectada está actualizada en docs/spec/
- [ ] Pasan las dos pruebas de gobierno
- [ ] Se probó entrando con el rol real de voluntario en dispositivo móvil
- [ ] Verificación de bloqueo atómico: no genera condiciones de carrera ni doble asignación de donaciones
```

---

### Issue 4: CMP-04 · Registro y confirmación de entrega a organización receptora

* **Título:** `CMP-04 · Registro y confirmación de entrega a organización receptora`
* **Labels:** `historia`, `mvp`, `cmp-04`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-04`
  * **Origen:** `RF-005 · US4.1`
  * **Estimación:** `3`
  * **Assignee:** Alejandro Rodríguez Cortés / Felipe Charria Caicedo

```markdown
Historia (US4.1): Como voluntario de transporte o encargado de comedor comunitario, quiero registrar y confirmar la entrega física de los alimentos con fecha, hora y responsable de recepción, para garantizar el cierre formal de la custodia y el aprovechamiento de la donación.

Comportamiento: CMP-04 en comportamientos.md · Origen: RF-005 / RF-006 - US4.1

Criterios de aceptación
- CA-04.1 Dada una donación en estado ASIGNADA, cuando el voluntario arriba al comedor receptor y diligencia el nombre del encargado receptor, entonces el sistema actualiza el estado a ENTREGADA, guarda la marca de tiempo UTC y cierra el ciclo de custodia.
- CA-04.2 Dada una donación en estado DISPONIBLE que no ha sido tomada, cuando se intenta registrar una entrega directa, entonces el sistema bloquea la acción indicando que la donación debe ser tomada previamente.
- CA-04.3 Dada la confirmación digital de entrega, cuando se guarda el registro, el sistema valida que no se recolecten nombres ni datos personales de personas beneficiarias, guardando únicamente raciones agregadas (Ley 1581 de 2012 / Habeas Data).

Se prueba como: voluntario / encargado de comedor · teléfono

Definición de Terminado
- [ ] Cumple todos sus criterios de aceptación
- [ ] El código está revisado y aprobado por otro integrante
- [ ] Tiene pruebas automatizadas y todas pasan
- [ ] Está integrada en main sin romper la compilación
- [ ] La documentación afectada está actualizada en docs/spec/
- [ ] Pasan las dos pruebas de gobierno (cero datos personales de comensales)
- [ ] Se probó entrando con el rol real de voluntario/comedor en dispositivo teléfono móvil
```

---

### Issue 5: CMP-05 · Consulta del estado y trazabilidad de una donación

* **Título:** `CMP-05 · Consulta del estado y trazabilidad de una donación`
* **Labels:** `historia`, `mvp`, `cmp-05`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-05`
  * **Origen:** `RF-002 · US5.1`
  * **Estimación:** `3`
  * **Assignee:** Eduard Criollo Yule / Juan Sebastián Delgado

```markdown
Historia (US5.1): Como coordinadora general (Marcela Ocampo) o donante, quiero consultar en cualquier momento la línea de tiempo y el estado actual de una donación mediante su código de seguimiento, para verificar la trazabilidad completa y generar soporte auditado para los cooperantes.

Comportamiento: CMP-05 en comportamientos.md · Origen: RF-002 / RF-006 / RF-007 - US5.1

Criterios de aceptación
- CA-05.1 Dada una donación registrada con código DON-101, cuando cualquier usuario con el código consulta su detalle, entonces el sistema retorna su estado vigente y datos públicos del lote.
- CA-05.2 Dada una donación en estado ENTREGADA, cuando la coordinadora consulta su historial, entonces el sistema presenta la línea de tiempo completa: fecha/hora de publicación por donante, asignación al voluntario y entrega final en comedor.
- CA-05.3 Dada la visualización del resumen de impacto, cuando la coordinadora consulta los kilogramos rescatados, entonces el sistema calcula el total estrictamente mediante la sumatoria de donaciones entregadas, garantizando que ninguna cifra provenga de datos inventados.

Se prueba como: coordinadora general · escritorio (computador) / donante · teléfono

Definición de Terminado
- [ ] Cumple todos sus criterios de aceptación
- [ ] El código está revisado y aprobado por otro integrante
- [ ] Tiene pruebas automatizadas y todas pasan
- [ ] Está integrada en main sin romper la compilación
- [ ] La documentación afectada está actualizada en docs/spec/
- [ ] Pasan las dos pruebas de gobierno (cifras 100% calculadas desde base de datos real)
- [ ] Se probó entrando con el rol real de coordinadora en dispositivo de escritorio
```

---

## 3. Desglose de Tareas Atómicas por Criterio para el Sprint 1 (Asignaciones Individuales)

Cumpliendo con la regla de oro del Módulo 3 (**cada tarea atómica apunta a un único criterio de aceptación y se ejecuta en ≤ 4 horas por una persona asignada**), a continuación se presentan las tareas iniciales para alimentar el tablero:

| ID Tarea | Título Atómico | Criterio de Aceptación Asociado | Responsable Asignado | Rol en el Equipo | Estimación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TASK-01`** | Configurar esquemas DDL en PostgreSQL y tipos TypeScript para Donación, Usuario y Reserva | Transversal (`src/types/index.ts`) | **Juan Sebastián Delgado** | Backend Developer | 3h |
| **`TASK-02`** | Diseñar formulario Mobile-First de donación con selector de categoría y fecha/hora límite | `CA-01.1` (Publicación exitosa) | **Santiago Valencia Sandoval** | UX / Frontend Support | 3h |
| **`TASK-03`** | Implementar validaciones en cliente para ventana de tiempo de recogida y bloqueo de horas pasadas | `CA-01.2`, `CA-01.3` (Ventana válida) | **Alejandro Rodríguez Cortés** | Full-Stack Developer | 3h |
| **`TASK-04`** | Integrar casilla obligatoria de exención legal Ley 1990/2019 e indicador de cadena de frío | `CA-01.4` (Refrigeración y Ley 1990) | **Alejandro Rodríguez Cortés** | Full-Stack Developer | 2h |
| **`TASK-05`** | Configurar persistencia offline con IndexedDB (Dexie.js) para publicación en plazas sin señal | `CA-01.5` (Offline-First) | **Juan Sebastián Delgado** | Backend Developer | 4h |
| **`TASK-06`** | Construir catálogo reactivo de donaciones disponibles con ordenamiento y filtros por zona | `CA-02.1`, `CA-02.3` (Catálogo y zonas) | **Alejandro Rodríguez Cortés** | Full-Stack Developer | 3h |
| **`TASK-07`** | Implementar etiqueta visual destacada de cadena de frío y filtro de exclusión para comedores sin nevera | `CA-02.2` (Cadena de frío) | **Santiago Valencia Sandoval** | UX / Frontend Support | 2h |
| **`TASK-08`** | Desarrollar procedimiento RPC / transacción atómica SQL con `SELECT ... FOR UPDATE` para toma única | `CA-03.1` (Asignación indivisible) | **Juan Sebastián Delgado** | Backend Developer | 4h |
| **`TASK-09`** | Implementar respuesta HTTP 409 Conflict y modal amigable en frontend ante colisión de toma concurrente | `CA-03.2`, `CA-03.3` (Bloqueo segunda toma) | **Alejandro Rodríguez Cortés** | Full-Stack Developer | 3h |
| **`TASK-10`** | Diseñar y ejecutar suite de pruebas automatizadas de concurrencia y estrés para `CMP-03` | `CA-03.2` (Prueba de gobierno concurrencia) | **Felipe Charria Caicedo** | QA Engineer | 4h |
| **`TASK-11`** | Construir flujo móvil de confirmación de entrega física en comedor con registro de receptor | `CA-04.1`, `CA-04.2` (Cierre entrega) | **Alejandro Rodríguez Cortés** | Full-Stack Developer | 3h |
| **`TASK-12`** | Auditar y verificar que no se capturen datos personales sensibles de beneficiarios (Ley 1581) | `CA-04.3` (Habeas Data) | **Felipe Charria Caicedo** | QA Engineer | 2h |
| **`TASK-13`** | Implementar pantalla de consulta pública y línea de tiempo por código único (`DON-XXX`) | `CA-05.1`, `CA-05.2` (Trazabilidad) | **Santiago Valencia Sandoval** | UX / Frontend Support | 3h |
| **`TASK-14`** | Construir agregador de métricas de kilogramos rescatados garantizando cero datos inventados | `CA-05.3` (Cifras reales auditadas) | **Eduard Criollo Yule** | Product Owner / Lead | 3h |
| **`TASK-15`** | Configurar pipeline de CI en GitHub Actions y monitoreo de cuotas de capa gratuita ($0 USD/mes) | Transversal (`RNF-005`) | **Juan Camilo Peña Sandoval** | DevOps Engineer | 4h |

---

### 3.1. Fichas de Issues Técnicos Atómicos para el Tablero (Carga Individual)

A continuación se presenta el detalle exhaustivo de cada una de las 15 tareas atómicas estructuradas en el formato canónico de Issue de GitHub para alimentar directamente el tablero del proyecto:

---

#### Issue TASK-01: Esquema DDL en PostgreSQL y tipos TypeScript
* **Título:** `[TASK-01] Configurar esquemas DDL en PostgreSQL y tipos TypeScript para Donación, Usuario y Reserva`
* **Campos del Tablero:**
  * **Status:** `Terminado` (Completado en `supabase/migrations/20261009000000_init_schema.sql` y `src/types/index.ts`)
  * **CMP:** `TRANSVERSAL / CMP-01`
  * **Origen:** `RF-001`, `RF-003`, `RNF-004`
  * **Estimación:** `3`
  * **Assignee:** Juan Sebastián Delgado (`Backend / Database Engineer`)
  * **Labels:** `tarea`, `sprint-1`, `backend`, `database`

```markdown
### Contexto y Descripción Técnica
Como ingeniero de backend y base de datos, necesito definir el modelo relacional canónico en PostgreSQL (Supabase) y su correspondencia estricta en TypeScript, para que todos los flujos de publicación, asignación y auditoría cuenten con integridad referencial y tipado estricto.

### Entregables
- Script DDL en `supabase/migrations/20261009000000_init_schema.sql` con tablas `organizaciones`, `usuarios`, `donaciones` y `trazabilidad_eventos`.
- Secuencia PostgreSQL `donacion_codigo_seq` y función `generar_codigo_donacion()` para códigos `DON-XXX`.
- Tipos de dominio en `src/types/index.ts` (`Donacion`, `Organizacion`, `Usuario`, `EstadoDonacion`).

### Criterio de Aceptación (DoD de la tarea)
- [x] Migración ejecutable en PostgreSQL 15 sin errores de sintaxis.
- [x] Tipado TypeScript estricto sin `any` con compilación limpia (`npm run build`).
```

---

#### Issue TASK-02: Formulario Mobile-First de Donación
* **Título:** `[TASK-02] Diseñar formulario Mobile-First de donación con selector de categoría y fecha/hora límite`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-01`
  * **Origen:** `RF-001`, `RNF-001`
  * **Estimación:** `3`
  * **Assignee:** Santiago Valencia Sandoval (`UX Designer / Frontend Support`)
  * **Labels:** `tarea`, `sprint-1`, `ux`, `frontend`, `cmp-01`

```markdown
### Contexto y Descripción Técnica
Como comerciante donante en una plaza de mercado (Cavasa, Santa Elena), quiero diligenciar un formulario rápido en mi celular en menos de 45 segundos, para registrar un lote de alimentos con su categoría, cantidad y ventana de recogida sin fricción técnica.

### Entregables
- Componente `src/components/donaciones/DonacionWizard.tsx` con arquitectura de 3 pasos móviles.
- Selector de categoría visual por iconos (Frutas/Verduras, Lácteos, Carnes, Abarrotes, Preparados).
- Controles táctiles accesibles con tamaño mínimo de 48x48 píxeles (`min-h-[48px]`).
- Página contenedora en `src/app/donar/page.tsx`.

### Criterio de Aceptación BDD
- `CA-01.1`: Permite registrar tipo de alimento, cantidad (kg/canastillas), dirección y ventana de tiempo en <3 pasos.

### Definición de Terminado (DoD)
- [ ] Operable en viewport móvil (375px a 414px) en <45 segundos.
- [ ] Pasa auditoría de contraste WCAG 2.1 AA.
```

---

#### Issue TASK-03: Validaciones de Ventana Temporal (Cliente y Servidor)
* **Título:** `[TASK-03] Implementar validaciones en cliente y servidor para ventana de tiempo de recogida y bloqueo de horas pasadas`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-01`
  * **Origen:** `RF-001`, `RF-017`
  * **Estimación:** `3`
  * **Assignee:** Alejandro Rodríguez Cortés (`Full-Stack Developer`)
  * **Labels:** `tarea`, `sprint-1`, `frontend`, `backend`, `cmp-01`

```markdown
### Contexto y Descripción Técnica
Como Full-Stack Developer, quiero garantizar que ninguna oferta de alimentos sea publicada con una hora límite de recogida vencida o igual a la hora actual, tanto a nivel de interfaz de usuario como de compuerta lógica defensiva en el servidor.

### Entregables
- Esquema de validación Zod en `src/lib/validations/donacion.ts` con refine de hora futura (`horaLimite > Date.now()`).
- Validación reactiva en vivo en el campo de hora de `DonacionWizard.tsx`.
- Manejo de respuestas de error con mensajes comprensibles para el usuario de campo.

### Criterio de Aceptación BDD
- `CA-01.2`: Si la hora límite es anterior o igual a la actual, el sistema impide el envío y muestra mensaje de validación.

### Definición de Terminado (DoD)
- [ ] Prueba unitaria automatizada en Vitest certificando el rechazo de fechas pasadas.
- [ ] Validación defensiva activa en Server Action (`safeParse`).
```

---

#### Issue TASK-04: Exención Legal Ley 1990/2019 e Indicador de Frío
* **Título:** `[TASK-04] Integrar casilla obligatoria de exención legal Ley 1990/2019 e indicador de cadena de frío`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-01`
  * **Origen:** `RF-014`, `RF-017`
  * **Estimación:** `2`
  * **Assignee:** Alejandro Rodríguez Cortés (`Full-Stack Developer`)
  * **Labels:** `tarea`, `sprint-1`, `frontend`, `legal`, `cmp-01`

```markdown
### Contexto y Descripción Técnica
Como asesor técnico y desarrollador, debo blindar a los comerciantes donantes bajo el amparo de la Ley 1990 de 2019 (exoneración de responsabilidad sanitaria de buena fe) e identificar si el lote contiene productos perecederos que exijan refrigeración para evitar pérdidas como el antecedente de los 200 kg de tomate.

### Entregables
- Casilla interactiva con texto legal explícito de la Ley 1990 de 2019 en el Paso 3 del formulario.
- Deshabilitación obligatoria del botón "Publicar Donación" mientras la casilla no esté marcada.
- Switch toggle para `requiereFrio` con persistencia en el payload.
- Server Action `publicarDonacion` en `src/actions/donaciones.ts`.

### Criterios de Aceptación BDD
- `CA-01.3`: Bloqueo por omisión de exención legal.
- `CA-01.4`: Marcado de alimentos con requerimiento de refrigeración (`requiereFrio = true`).

### Definición de Terminado (DoD)
- [ ] No existe camino de código que permita enviar `exencionSanitariaAceptada: false`.
- [ ] Pasa prueba de gobierno legal.
```

---

#### Issue TASK-05: Persistencia Offline con IndexedDB (Dexie.js)
* **Título:** `[TASK-05] Configurar persistencia offline con IndexedDB (Dexie.js) para publicación en plazas sin señal`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-01`
  * **Origen:** `RNF-002`, `RF-001`
  * **Estimación:** `4`
  * **Assignee:** Juan Sebastián Delgado (`Backend / Database Engineer`)
  * **Labels:** `tarea`, `sprint-1`, `backend`, `offline-first`, `cmp-01`

```markdown
### Contexto y Descripción Técnica
Como Backend Engineer, debo implementar el almacenamiento local en el navegador del celular mediante Dexie.js (IndexedDB) para que los comerciantes en plazas como Cavasa o Santa Elena puedan registrar donaciones aun cuando no tengan conectividad celular 4G.

### Entregables
- Módulo `src/lib/db.ts` con la base de datos `RescateAlimentosDB` y almacén `donaciones_locales`.
- Métodos `guardarDonacionOffline()`, `obtenerDonacionesPendientes()` y `marcarDonacionSincronizada()`.
- Listener reactivo para reconexión a Internet (`window.addEventListener('online')`) que despacha automáticamente los lotes pendientes a Supabase.

### Criterio de Aceptación BDD
- `CA-01.5`: Registro exitoso en entorno sin conexión móvil y sincronización automática al reanudar red.

### Definición de Terminado (DoD)
- [ ] Tolerancia a desconexión simulada con `fake-indexeddb` en suite de pruebas.
- [ ] Notificación visual en pantalla: "Guardado localmente — pendiente de sincronización".
```

---

#### Issue TASK-06: Catálogo Reactivo de Donaciones Disponibles
* **Título:** `[TASK-06] Construir catálogo reactivo de donaciones disponibles con ordenamiento y filtros por zona`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-02`
  * **Origen:** `RF-002`, `RF-011`
  * **Estimación:** `3`
  * **Assignee:** Alejandro Rodríguez Cortés (`Full-Stack Developer`)
  * **Labels:** `tarea`, `sprint-1`, `frontend`, `cmp-02`

```markdown
### Contexto y Descripción Técnica
Como voluntario o comedor comunitario receptor, quiero visualizar en tiempo real las ofertas activas en estado "DISPONIBLE" ordenadas por urgencia y filtradas por sectores de Cali (Norte, Centro, Sur, Oriente, Ladera).

### Entregables
- Vista de catálogo en `src/app/donaciones/page.tsx`.
- Componente `DonacionCard.tsx` con temporizador regresivo de hora límite.
- Barra de filtrado reactivo por zona de Cali sin recarga de página.

### Criterios de Aceptación BDD
- `CA-02.1`: Visualización reactiva de ofertas vigentes.
- `CA-02.3`: Filtrado por zona geográfica de Cali.
```

---

#### Issue TASK-07: Etiqueta de Cadena de Frío y Filtro para Comedores
* **Título:** `[TASK-07] Implementar etiqueta visual destacada de cadena de frío y filtro de exclusión para comedores sin nevera`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-02`
  * **Origen:** `RF-014`, `RNF-001`
  * **Estimación:** `2`
  * **Assignee:** Santiago Valencia Sandoval (`UX Designer / Frontend Support`)
  * **Labels:** `tarea`, `sprint-1`, `ux`, `frontend`, `cmp-02`

```markdown
### Contexto y Descripción Técnica
Como UX Designer, debo asegurar que las ofertas con `requiereFrio = true` exhiban un distintivo visual inmediato y adviertan o restrinjan la toma por comedores que no cuentan con refrigeración operativa (`tieneRefrigeracion = false`).

### Entregables
- Badge visual destacado `ColdChainBadge.tsx` con icono de frío y color de contraste accesible.
- Bloqueo o advertencia interactiva al intentar canalizar hacia comedores sin nevera funcional.

### Criterio de Aceptación BDD
- `CA-02.2`: Identificación destacada de cadena de frío y temporizador antes de expirar.
```

---

#### Issue TASK-08: Procedimiento RPC de Bloqueo Pesimista (Núcleo Concurrente)
* **Título:** `[TASK-08] Desarrollar procedimiento RPC / transacción atómica SQL con SELECT FOR UPDATE para toma única`
* **Campos del Tablero:**
  * **Status:** `Terminado` (Implementado en `supabase/migrations/20261009000000_init_schema.sql`, endurecido en `supabase/migrations/20261028000000_task08_tomar_donacion_endurecida.sql` y verificado con `tests/db/tomar-donacion.test.ts`; ADR-001)
  * **CMP:** `CMP-03`
  * **Origen:** `RF-004`, `RF-010`, `RNF-004`, `ADR-001`
  * **Estimación:** `4`
  * **Assignee:** Juan Sebastián Delgado (`Backend / Database Engineer`)
  * **Labels:** `tarea`, `sprint-1`, `backend`, `database`, `nucleo`, `cmp-03`

```markdown
### Contexto y Descripción Técnica
Como Backend Engineer, debo asegurar que bajo ninguna circunstancia dos voluntarios puedan tomar simultáneamente la misma donación, ejecutando la asignación mediante una transacción atómica con bloqueo pesimista en PostgreSQL (`SELECT ... FOR UPDATE`).

### Entregables
- Función RPC PostgreSQL `tomar_donacion(p_donacion_id, p_voluntario_id, p_voluntario_nombre)` en Supabase.
- Verificación de estado `DISPONIBLE` bajo cerrojo de fila.
- Retorno de código de conflicto HTTP 409 si la donación ya fue tomada por otro voluntario, y 410 si la oferta no está vigente (`CA-03.3`).
- Registro automático en `trazabilidad_eventos` de cada transición de estado, en la misma transacción.
- Ejecución como `SECURITY DEFINER` para operar bajo RLS con la anon key.
- Prueba de concurrencia contra PostgreSQL real (`tests/db/tomar-donacion.test.ts`).

### Criterio de Aceptación BDD
- `CA-03.1`: Asignación exitosa e indivisible al primer solicitante.
- `CA-03.2` y `CA-03.3`: cubiertos por la misma función (409 / 410).
```

---

#### Issue TASK-09: Modal de Conflicto HTTP 409 ante Doble Toma
* **Título:** `[TASK-09] Implementar respuesta HTTP 409 Conflict y modal amigable en frontend ante colisión de toma concurrente`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-03`
  * **Origen:** `RF-010`, `RNF-004`
  * **Estimación:** `3`
  * **Assignee:** Alejandro Rodríguez Cortés (`Full-Stack Developer`)
  * **Labels:** `tarea`, `sprint-1`, `frontend`, `cmp-03`

```markdown
### Contexto y Descripción Técnica
Como Full-Stack Developer, debo capturar la respuesta HTTP 409 del procedimiento RPC y desplegar una notificación empática en el celular del voluntario que llegó milisegundos tarde, removiendo la oferta de su pantalla sin necesidad de recargarla.

### Entregables
- Manejador de error 409 en el cliente Supabase.
- Modal reactivo con el mensaje: "Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas."
- Remoción inmediata del elemento en el estado local de React.

### Criterios de Aceptación BDD
- `CA-03.2`: Bloqueo atómico a segunda toma simultánea.
- `CA-03.3`: Remoción reactiva ante conflicto.
```

---

#### Issue TASK-10: Suite de Pruebas de Estrés y Concurrencia (QA)
* **Título:** `[TASK-10] Diseñar y ejecutar suite de pruebas automatizadas de concurrencia y estrés para CMP-03`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-03`
  * **Origen:** `RF-004`, `RNF-004`
  * **Estimación:** `4`
  * **Assignee:** Felipe Charria Caicedo (`QA Engineer`)
  * **Labels:** `tarea`, `sprint-1`, `qa`, `testing`, `cmp-03`

```markdown
### Contexto y Descripción Técnica
Como QA Engineer, debo diseñar una prueba automatizada que simule dos o más peticiones HTTP simultáneas (concurrencia paralela en milisegundos) contra la misma donación, demostrando matemáticamente que el sistema solo aprueba a un voluntario y rechaza a los demás.

### Entregables
- Suite de pruebas de concurrencia en Vitest `tests/integration/concurrency-lock.test.ts`.
- Simulación con `Promise.all()` de múltiples peticiones compitiendo por el mismo `id`.
- Aserción de 1 código 200 y N-1 códigos 409 Conflict.

### Criterio de Aceptación BDD
- Verificación formal de la compuerta de concurrencia (Prueba de Gobierno de Reserva Única).
```

---

#### Issue TASK-11: Flujo Móvil de Confirmación de Entrega en Comedor
* **Título:** `[TASK-11] Construir flujo móvil de confirmación de entrega física en comedor con registro de receptor`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-04`
  * **Origen:** `RF-005`, `RF-006`
  * **Estimación:** `3`
  * **Assignee:** Alejandro Rodríguez Cortés (`Full-Stack Developer`)
  * **Labels:** `tarea`, `sprint-1`, `frontend`, `cmp-04`

```markdown
### Contexto y Descripción Técnica
Como voluntario en ruta, quiero registrar la entrega física de los alimentos al llegar al comedor comunitario (nombre de quien recibe y raciones agregadas), para cerrar el ciclo de custodia y transferir la donación al estado definitivo "ENTREGADA".

### Entregables
- Formulario de entrega en `src/components/entregas/ConfirmarEntregaModal.tsx`.
- Transición irreversible a estado `ENTREGADA` con marca de tiempo UTC en Supabase.
- Bloqueo estricto si la donación no se encontraba previamente en estado `ASIGNADA`.

### Criterios de Aceptación BDD
- `CA-04.1`: Cierre formal de entrega en comedor comunitario.
- `CA-04.2`: Bloqueo de entrega de donación no asignada.
```

---

#### Issue TASK-12: Auditoría y Verificación de Habeas Data (Ley 1581)
* **Título:** `[TASK-12] Auditar y verificar que no se capturen datos personales sensibles de beneficiarios (Ley 1581)`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-04`
  * **Origen:** `RNF-003`
  * **Estimación:** `2`
  * **Assignee:** Felipe Charria Caicedo (`QA Engineer`)
  * **Labels:** `tarea`, `sprint-1`, `qa`, `gobierno`, `cmp-04`

```markdown
### Contexto y Descripción Técnica
Como QA Engineer, debo auditar las estructuras de datos, formularios y endpoints de entrega para certificar que bajo ninguna circunstancia se capturen nombres, fotos de rostros ni documentos de personas beneficiarias en los comedores comunitarios.

### Entregables
- Prueba automatizada de gobierno en `tests/governance/habeas-data.test.ts`.
- Certificado de anonimización: únicamente se persisten raciones cuantitativas agregadas e institución receptora.

### Criterio de Aceptación BDD
- `CA-04.3`: Anonimización absoluta de beneficiarios finales conforme a la Ley 1581 de 2012.
```

---

#### Issue TASK-13: Pantalla Pública de Consulta y Línea de Tiempo
* **Título:** `[TASK-13] Implementar pantalla de consulta pública y línea de tiempo por código único (DON-XXX)`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-05`
  * **Origen:** `RF-002`, `RF-006`
  * **Estimación:** `3`
  * **Assignee:** Santiago Valencia Sandoval (`UX Designer / Frontend Support`)
  * **Labels:** `tarea`, `sprint-1`, `ux`, `frontend`, `cmp-05`

```markdown
### Contexto y Descripción Técnica
Como donante o coordinadora, quiero ingresar un código único (ej. `DON-101`) en una barra de búsqueda para visualizar en tiempo real la línea de tiempo auditada del alimento desde su despacho hasta su consumo en el comedor.

### Entregables
- Vista de búsqueda y detalle en `src/app/rastreo/page.tsx`.
- Componente de línea de tiempo visual `TimelineTracker.tsx` (Registro -> Asignación -> Entrega).
- Renderizado de marcas de tiempo UTC formateadas en hora local de Colombia.

### Criterios de Aceptación BDD
- `CA-05.1`: Consulta de estado en tiempo real por código único.
- `CA-05.2`: Línea de tiempo auditada de punta a punta.
```

---

#### Issue TASK-14: Agregador de Métricas de Kilos Reales (Cero Datos Inventados)
* **Título:** `[TASK-14] Construir agregador de métricas de kilogramos rescatados garantizando cero datos inventados`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `CMP-05`
  * **Origen:** `RF-007`, `Gobierno`
  * **Estimación:** `3`
  * **Assignee:** Eduard Criollo Yule (`Product Owner / Lead`)
  * **Labels:** `tarea`, `sprint-1`, `po`, `gobierno`, `cmp-05`

```markdown
### Contexto y Descripción Técnica
Como Product Owner y Lead, debo asegurar la veracidad de los reportes para cooperantes internacionales (Fundación Carvajal), garantizando que las métricas de kilogramos rescatados se calculen 100% mediante agregación directa en la base de datos sobre donaciones en estado "ENTREGADA".

### Entregables
- Consulta agregadora en Supabase `sum(cantidad_estimada) WHERE estado = 'ENTREGADA'`.
- Vista de panel de impacto en `src/app/impacto/page.tsx`.
- Cero constantes *hardcoded* o valores simulados en la capa de visualización.

### Criterio de Aceptación BDD
- `CA-05.3`: Transparencia de métricas sin datos inventados (Prueba de Gobierno de Cifras Reales).
```

---

#### Issue TASK-15: Pipeline de CI en GitHub Actions y Monitoreo Free Tier ($0 USD)
* **Título:** `[TASK-15] Configurar pipeline de CI en GitHub Actions y monitoreo de cuotas de capa gratuita ($0 USD/mes)`
* **Campos del Tablero:**
  * **Status:** `Por hacer`
  * **CMP:** `TRANSVERSAL`
  * **Origen:** `RNF-005`
  * **Estimación:** `4`
  * **Assignee:** Juan Camilo Peña Sandoval (`DevOps Engineer`)
  * **Labels:** `tarea`, `sprint-1`, `devops`, `ci-cd`

```markdown
### Contexto y Descripción Técnica
Como DevOps Engineer, debo automatizar la compuerta de integración continua para que ningún commit o PR pueda fusionarse a `main` si rompe los linters, las pruebas automatizadas o el build de Next.js, verificando además que no se excedan las cuotas de capa gratuita ($0 USD/mes).

### Entregables
- Archivo `.github/workflows/ci.yml` configurado con jobs de `lint`, `test` y `build`.
- Variables de entorno seguras para compilación estéril en GitHub Actions.
- Documentación de políticas de purga multimedia tras 30 días (`RF-018`).

### Criterio de Aceptación (DoD)
- Pipeline en verde automático ante cada Pull Request hacia `main` o `develop`.
- Protección de costos: $0.00 USD/mes de costo de servidores.
```

---

## 4. Guía de Carga y Sincronización en el Tablero de GitHub Projects

Para que las tarjetas queden físicamente creadas y sincronizadas en el tablero del proyecto en GitHub (`https://github.com/users/EduardCY/projects/1`), se dispone del script automatizado en PowerShell:

* **Ruta del script:** `scripts/sync-github-board.ps1`
* **Prerrequisito de autenticación:**
  ```powershell
  # 1. Iniciar sesión con la cuenta dueña del repositorio (EduardCY)
  gh auth login -h github.com -w
  
  # 2. Ejecutar el aprovisionamiento de etiquetas y tareas atómicas en el repositorio
  powershell -ExecutionPolicy Bypass -File ./scripts/sync-github-board.ps1
  ```

