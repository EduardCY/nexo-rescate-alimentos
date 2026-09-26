# Constitución del proyecto

**Proyecto:** Red de Rescate de Alimentos — Fundación Mesa Común (Cali, Colombia)  
**Equipo:** Nexo Cívico Studio (Equipo 3)  
**Módulo:** Proyecto Informático 2 — Módulo 3  
**Fecha de Aprobación:** 26 de septiembre de 2026 (Sesión 8)  

---

## 1. Roles del Equipo

En concordancia con los acuerdos del Módulo 1 y Módulo 2, el equipo de desarrollo distribuye las responsabilidades ágiles y técnicas garantizando que ningún artefacto quede sin responsable ni dependa de una sola persona:

| Integrante | Rol Ágil / Técnico | Responsabilidad Principal y Artefactos Entregables |
| :--- | :--- | :--- |
| **Eduard Criollo Yule** | **Product Owner** | Visión del producto, priorización estricta del backlog en el tablero, trazabilidad con requerimientos del Módulo 1 y validación con el cliente. |
| **Alejandro Rodríguez Cortés** | **Full-Stack Developer** | Arquitectura PWA, componentes frontend responsivos (Mobile-First), consumo de API serverless y lógica de cliente. |
| **Santiago Valencia Sandoval** | **Backend Developer** | Modelado de datos en PostgreSQL (Supabase), procedimientos atómicos (RPC) para prevención de concurrencia y persistencia local (IndexedDB). |
| **Felipe Charria Caicedo** | **QA Engineer** | Diseño y ejecución de pruebas de aceptación (Gherkin/BDD), matrices de casos borde y verificación cruzada de criterios de aceptación en PRs. |
| **Juan Camilo Peña Sandoval** | **DevOps Engineer** | Automatización de despliegue continuo en Vercel, monitoreo de límites de capa gratuita (Free Tier $0 USD/mes) y control de secretos de entorno. |
| **Juan Sebastián Delgado** | **UX Designer (Soporte)** | Arquitectura de información móvil (<3 pasos por flujo), prototipado de alta fidelidad y evaluación heurística de usabilidad para usuarios en plazas de mercado. |

> **Regla de Cobertura:** Todos los roles cuentan con respaldo cruzado. Si el responsable principal se ausenta, el compañero del par técnico asume el artefacto visible sin detener el flujo de construcción del sprint.

---

## 2. Convenciones de Trabajo y Repositorio

### 2.1. Estrategia de Ramas (Git Flow Simplificado)
- **`main`**: Rama de producción protegida. Contiene únicamente código estable, probado y listo para demostración en Sprint Review o despliegue continuo. Requiere al menos una aprobación de PR para merge.
- **`develop`**: Rama base de integración diaria. Recibe las características verificadas.
- **Ramas de funcionalidad (`feat/<ID-HISTORIA>-<descripcion-corta>`)**:
  - Ejemplo: `feat/HU-001-publicacion-donacion`, `feat/CMP-03-bloqueo-segunda-toma`.
  - Nacen de `develop` y se reintegran a `develop` mediante Pull Request tras cumplir la Definición de Terminado.
- **Ramas de corrección (`fix/<ID-BUG>-<descripcion>`)**:
  - Para resolver defectos encontrados durante la revisión cruzada o fallos de casos borde.

### 2.2. Convención de Commits (Conventional Commits)
Cada commit debe ser atómico, describir el **porqué** del cambio y estar enlazado al requerimiento o comportamiento del MVP:
- Formato: `<tipo>(<alcance>): <descripción imperativa en español> [#<ID_TAREA>]`
- Tipos autorizados:
  - `feat`: Nueva funcionalidad o comportamiento del sistema.
  - `fix`: Corrección de un defecto o comportamiento anómalo.
  - `docs`: Modificación o adición de especificaciones, constituciones o documentación Markdown.
  - `test`: Creación o ajuste de pruebas automatizadas unitarias, de integración o Gherkin.
  - `refactor`: Cambio en el código que no altera su comportamiento ni corrige bugs.
  - `chore`: Tareas de configuración, scripts de entorno o dependencias.
- Ejemplo válido: `feat(donaciones): implementar bloqueo atómico de segunda toma concurrente CMP-03 [#14]`

### 2.3. Convención de Pull Requests (PRs)
1. **Ningún integrante mergea su propio código:** Todo PR debe ser revisado y aprobado por al menos un integrante con rol distinto al creador.
2. **Plantilla obligatoria de PR:**
   - Enlace directo a la tarea del tablero de GitHub Projects y al ID de comportamiento (`CMP-xx`).
   - Resumen conciso de cambios técnicos y decisiones tomadas.
   - Evidencia visual o registro de pruebas automatizadas/manuales en verde.
   - Declaración de uso de IA (si aplica, indicando qué se auditó).
3. **Criterio de aprobación:** El PR solo se aprueba si cumple a cabalidad con la **Definición de Terminado (DoD)**.

---

## 3. Política y Reglas Operativas de Inteligencia Artificial

El uso de asistentes de IA para código, pruebas y documentación es un habilitador esperado en este módulo, regulado bajo las siguientes directrices institucionales:

1. **Herramientas Acordadas:**
   - **Antigravity IDE** motorizado por **Gemini 3.8 Flash** (para velocidad de codificación, exploración de contexto y scaffolding) y **Claude 4.6 Opus** (para razonamiento de consistencia de datos, diseño de algoritmos de concurrencia y refactorización compleja).
2. **Declaración en Repositorio:**
   - Todo componente o módulo desarrollado o asistido con IA debe documentar en su cabecera y en el README la herramienta utilizada y el objetivo de su intervención.
3. **Revisión Humana Obligatoria (Human-in-the-Loop):**
   - El equipo asume la total responsabilidad por cada línea de código integrada. No se admite código no leído, con alucinaciones o sin tipado estricto.
4. **Defensa Técnica Individual en Sprint Review:**
   - En cada sesión a partir de la sesión 10, el docente César Augusto Navia Rojas seleccionará a cualquier miembro del equipo al azar para explicar cualquier función, componente o decisión arquitectónica. Responder *"lo generó la IA"* constituye reprobación inmediata del incremento.
5. **Restricción Estricta:**
   - La reflexión final del módulo y los análisis de pares se redactan 100% de autoría humana sin intervención de IA.

---

## 4. Definición de Listo (Definition of Ready - DoR)

*Gobierna la entrada de una historia o tarea a la columna «Por hacer» en el tablero.*

### Base Obligatoria del Módulo:
- [ ] **Escrita con actor, acción y beneficio:** Estructurada en formato ágil canónico (*Como [rol del mapa de actores], quiero [acción en el sistema], para [beneficio tangible de negocio]*).
- [ ] **Con al menos un criterio verificable:** Formulado como compuerta de verificación en lenguaje natural o formato Gherkin (*Dado... Cuando... Entonces...*).
- [ ] **Trazada a su requerimiento del Módulo 1:** Enlazada explícitamente a su código de origen (`RF-xxx` o `RNF-xxx`) aprobado en la especificación inicial.
- [ ] **Cabe en una sesión de una persona:** La tarea es atómica; puede completarse de principio a fin por un desarrollador en un bloque de trabajo individual (máximo 3-4 horas).
- [ ] **No depende de otra sin terminar:** Sus prerequisitos técnicos están completamente desplegados y disponibles.
- [ ] **Se entiende sin volver a preguntar:** Su descripción, alcance y límites están redactados con suficiente claridad para que cualquier integrante pueda iniciar su desarrollo sin ambigüedades.

### Criterios Propios del Proyecto Nexo Cívico Studio:
- [ ] **Definición de estrategia Offline-First y persistencia local (Justificado):**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > En las plazas de mercado de Cali (Santa Elena, Cavasa, Alameda, Caicedo), la cobertura de red celular de los comerciantes y voluntarios es intermitente o nula (RNF-002). Una historia que capture o consulte donaciones no puede entrar a construcción si no especifica claramente cómo opera en ausencia de conexión: qué datos se guardan en IndexedDB/LocalStorage y qué estructura de carga útil se despacha cuando se restablece la señal, evitando pérdida de lotes perecederos.
- [ ] **Compuerta de Inocuidad y Validación de Cadena de Frío (Justificado):**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > La Fundación Mesa Común tiene el antecedente crítico de perder más de 200 kg de tomate por asignar alimentos sin considerar la infraestructura de refrigeración de los comedores, además del temor constante de los donantes frente a demandas por intoxicación (Ley 1990 de 2019). Cualquier historia relacionada con el registro o asignación de alimentos debe incorporar obligatoriamente la casilla de exención legal digital y el flag booleano de requerimiento de refrigeración antes de considerarse lista para desarrollo.

---

## 5. Definición de Terminado (Definition of Done - DoD)

*Gobierna la transición de una tarea desde «En revisión» hacia «Terminado» en el tablero.*

### Base Obligatoria del Módulo:
- [ ] **El criterio se cumple, y lo verificó otra persona:** Un par técnico o el QA Engineer ejecutó los escenarios de aceptación y validó el comportamiento esperado en entorno local o de preview.
- [ ] **El código está en la rama acordada:** Integrado a `main` o `develop` a través de un Pull Request revisado y sin conflictos de merge.
- [ ] **La tarea está cerrada en el tablero:** El issue/tarjeta correspondiente en GitHub Projects se vincula al commit/PR y pasa formalmente al estado «Terminado».
- [ ] **No rompe nada de lo que ya funcionaba:** Se ejecutaron las pruebas existentes y se validó que no existen regresiones funcionales ni errores de compilación/linting (`npm run lint` y `npm run test` en verde).
- [ ] **Si se usó IA, alguien la revisó y la explica:** El responsable del PR auditó cada fragmento sugerido por Antigravity y está plenamente capacitado para sustentar su lógica ante el docente o el equipo.

### Criterios Propios del Proyecto Nexo Cívico Studio:
- [ ] **Garantía de Cero Costo Recurrente en Capas Gratuitas ($0 USD/mes / Free Tier Guardrail) (Justificado):**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > El cliente cuenta con un presupuesto operativo máximo de $150.000 COP/mes (RNF-005) reservado exclusivamente para combustible de carromotos y refrigerios de voluntarios. No existe presupuesto para pagar bases de datos dedicadas ni excedentes de cómputo en la nube. Ninguna tarea se considera terminada si introduce librerías pesadas, almacenamiento no purgado que amenace con rebasar los 500 MB de Supabase, o consultas N+1 sin paginar que agoten las cuotas mensuales de Vercel/Supabase.
- [ ] **Verificación de Bloqueo Concurrente Atómico en Toma de Donaciones (Reserva Única) (Justificado):**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > El problema central del caso de estudio —y el principal generador de fricción que colapsó la coordinación por WhatsApp— es la duplicidad de voluntarios: dos transportistas desplazándose al mismo tiempo por la misma donación. Para que una tarea del flujo de reserva/asignación se considere terminada, debe contar con una prueba verificada (a nivel de base de datos o lógica transaccional) que demuestre que cuando dos usuarios intentan tomar la misma donación de forma simultánea, el sistema asigna exclusivamente al primero y bloquea al segundo informándole que la oferta ya fue tomada.
