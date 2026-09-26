# Guía y Especificación del Proyecto

## 1. Consolidación de la Especificación
Todo el trabajo previo se consolida como el contrato de construcción del sistema:
* **RF y RNF (Módulo 1):** El *qué* (comportamiento esperado del sistema).
* **Criterios en Gherkin:** Compuertas de verificación (*cómo se valida que está hecho*).
* **Matriz (Módulo 2):** El *con qué* (decisiones de arquitectura, canal y quién opera el sistema).
* **Riesgos y Mitigaciones:** Decisiones del plan o tareas directas en el backlog.

---

## 2. Habilitadores Técnicos (Checklist de Arranque)
Elementos que deben quedar 100% operativos al cierre de la sesión inicial:
- [ ] **Repositorio:** Creado, con acceso de lectura para el docente y un `README.md` inicial.
- [ ] **Tablero de Trabajo:** Configurado en la misma plataforma del repositorio.
- [ ] **Entorno Local:** Los 5 integrantes del equipo deben poder levantar y ejecutar el proyecto en su máquina.
- [ ] **Accesos:** Credenciales y permisos repartidos de modo que nadie dependa de un tercero para avanzar.
- [ ] **Agente (IA):** Acordado en equipo cuál herramienta usar y bajo qué convenciones.

> **Entregable del bloque:** Enviar por chat los dos enlaces principales: **Repositorio** y **Tablero**.

---

## 3. Flujo y Estados del Tablero

### Estados del Flujo
1. **Por hacer:** Ítems del backlog que cumplen estrictamente con la *Definición de Listo (DoR)*.
2. **En curso:** Tarea en construcción activa, asignada a una persona específica (con nombre).
3. **En revisión:** Esperando que un integrante **distinto** a quien la construyó verifique los criterios de aceptación. *(No es decorativo).*
4. **Terminado:** Cumple en su totalidad con la *Definición de Terminado (DoD)*.

### Reglas Clave del Tablero
* **Toda tarea con responsable:** Sin asignatario/dueño no entra al tablero.
* **Toda tarea enlazada a su comportamiento:** Permite verificar que lo construido responde a la especificación.
* **Acceso de lectura para el docente:** Supervisión por muestreo antes y durante sesiones.
* **Ubicación recomendada:** Plataforma nativa del repositorio (para ligar automáticamente tareas a *commits* y *pull requests*).

---

## 4. Definiciones de Calidad (DoR y DoD)

### Definición de Listo (*Definition of Ready - DoR*)
Condiciones para que una historia pueda entrar a construcción:
- Escrita con estructura: actor, acción y beneficio.
- Posee al menos un criterio verificable.
- Trazada al requerimiento correspondiente del Módulo 1.
- Acotada en alcance: cabe en una sesión de trabajo individual.
- Sin dependencias de tareas no terminadas.
- Claridad conceptual: se entiende sin necesidad de re-preguntar.
- *+ Mínimo 2 criterios propios definidos por el equipo (justificados según el proyecto).*

### Definición de Terminado (*Definition of Done - DoD*)
Condiciones para considerar una tarea formalmente finalizada:
- Criterio de aceptación cumplido y **verificado por otra persona**.
- Código integrado en la rama acordada.
- Tarea cerrada formalmente en el tablero.
- No genera regresiones (no rompe lo que ya funcionaba).
- Si se utilizó IA, un integrante la revisó y es capaz de explicarla.
- *+ Mínimo 2 criterios propios definidos por el equipo (justificados según el proyecto).*

---

## 5. Estructura del Repositorio y Documentación

Toda la documentación debe versionarse en formato Markdown (`.md`) junto al código fuente.

```text
rescate-alimentos/
├── README.md
├── docs/
│   ├── spec/
│   │   ├── comportamientos.md
│   │   ├── constitucion.md
│   │   └── plan-tecnico.md
│   └── decisiones/
│       └── ADR-001-....md
├── src/            # Código fuente
└── tests/          # Pruebas automatizadas
```

### Propósito y Tiempos de Entrega
* **`docs/spec/` (Qué dice el sistema):** Describe qué hace el producto, con qué herramientas se construye y las reglas de trabajo del equipo.
  * **Sesión 8:** `README.md` y `constitucion.md` (roles, convenciones y directrices de IA).
  * **Sesión 9:** `comportamientos.md` y `plan-tecnico.md`.
* **`docs/decisiones/` (Por qué se construyó así):** Almacena los registros de decisiones arquitectónicas (*ADR*). Se agregan conforme surgen decisiones técnicas de fondo.