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
- [x] Cumple todos sus criterios de aceptación
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
