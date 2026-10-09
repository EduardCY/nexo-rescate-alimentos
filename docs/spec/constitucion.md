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
| **Santiago Valencia Sandoval** | **UX Designer (Soporte)** | Arquitectura de información móvil (<3 pasos por flujo), prototipado de alta fidelidad y evaluación heurística de usabilidad para usuarios en plazas de mercado. |
| **Felipe Charria Caicedo** | **QA Engineer** | Diseño y ejecución de pruebas de aceptación (Gherkin/BDD), matrices de casos borde y verificación cruzada de criterios de aceptación en PRs. |
| **Juan Camilo Peña Sandoval** | **DevOps Engineer** | Automatización de despliegue continuo en Vercel, monitoreo de límites de capa gratuita (Free Tier $0 USD/mes) y control de secretos de entorno. |
| **Juan Sebastián Delgado** | **Backend Developer** | Modelado de datos en PostgreSQL (Supabase), procedimientos atómicos (RPC) para prevención de concurrencia y persistencia local (IndexedDB). |

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

Una historia de usuario o tarea puede pasar a la columna **«Por hacer»** en el tablero de GitHub Projects solo si cumple la totalidad de los siguientes criterios:

### Base Obligatoria del Módulo:
- [ ] **Está escrita como historia de usuario:** Estructurada en formato ágil canónico (*Como [rol del mapa de actores], quiero [acción en el sistema], para [beneficio tangible de negocio]*).
- [ ] **Tiene criterios de aceptación en Gherkin:** Cada escenario formulado como compuerta verificable con la estructura (*Dado [contexto inicial] ... cuando [evento disparador] ... entonces [resultado observable]*).
- [ ] **Se traza a un requerimiento del Módulo 1 y a un comportamiento:** Enlazada explícitamente a su código de origen (`RF` o `RNF`) y a su respectivo comportamiento de `comportamientos.md` (`CMP`).
- [ ] **Está estimada por el equipo:** Cuenta con estimación de esfuerzo acordada por el equipo, acotada a una sesión individual de trabajo (≤ 3 a 4 horas).
- [ ] **Sus dependencias están identificadas y ninguna la bloquea:** No tiene prerrequisitos técnicos o de datos pendientes de construcción.
- [ ] **Es lo bastante pequeña para terminarse dentro de un sprint:** Tarea atómica y manejable sin riesgo de desborde temporal.

### Criterios Propios del Proyecto Nexo Cívico Studio (Justificados):
- [ ] **Si muestra una cifra, dice de qué dato sale:**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > En este proyecto aparecieron cuatro veces, de cuatro formas distintas, valores inventados que se veían como métricas reales en fases preliminares. Una cifra sin origen de datos declarado (ej. kilogramos rescatados, raciones estimadas, personas beneficiadas) no se puede probar, y lo que no se puede probar termina de forma errónea en el informe que se le entrega a un cooperante internacional (Fundación Carvajal / Fondo Internacional), arriesgando la financiación de la Fundación Mesa Común.
- [ ] **Si guarda datos de una persona, dice cuáles, para qué y con qué autorización:**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > De los beneficiarios finales en comedores comunitarios no se guarda ningún dato personal sensible ni biométrico, únicamente datos agregados (cuántas raciones se sirvieron). Cumplimiento estricto del requerimiento `RNF-003` y la Ley 1581 de 2012 (Habeas Data). Decidirlo al escribir la historia es económico; descubrirlo cuando el dato ya está en producción obliga a una costosa migración de base de datos y a una conversación legal crítica con la Fundación.
- [ ] **Dice con qué rol se prueba y en qué dispositivo (teléfono o escritorio):**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > La plataforma Nexo Rescate Alimentos cuenta con cuatro roles que ven pantallas e interfaces distintas, y tres de ellos (donantes en plazas de mercado, voluntarios de transporte y encargados de comedores comunitarios) trabajan exclusivamente desde el teléfono celular en campo. Una historia que no lo especifique se termina probando como coordinadora en un computador de escritorio, que es justo el caso que menos se parece a la operación real en plazas de mercado como Santa Elena o Cavasa.
- [ ] **Compuerta de Inocuidad y Validación de Cadena de Frío:**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > La Fundación Mesa Común tiene el antecedente crítico de perder más de 200 kg de tomate por asignar alimentos perecederos sin verificar la infraestructura de refrigeración en el comedor de destino, además del temor constante de los donantes frente a demandas civiles. Toda historia vinculada a donación de alimentos debe incorporar obligatoriamente la casilla de exención legal digital bajo la Ley 1990 de 2019 y el indicador booleano de requerimiento de refrigeración (`requiereFrio`).
- [ ] **Definición de estrategia Offline-First y tolerancia a caídas de red:**
  > **¿Por qué nuestro proyecto lo necesita?**  
  > En las plazas de mercado de Cali (Santa Elena, Cavasa, Alameda), la cobertura de red celular es intermitente o nula (`RNF-002`). Una historia que capture o consulte donaciones no puede entrar a construcción si no define qué datos se persisten localmente en IndexedDB y qué estructura se despacha cuando se restablece la señal celular.

---

## 5. Definición de Terminado (Definition of Done - DoD)

Una historia o tarea puede transicionar desde **«En revisión»** hacia **«Terminado»** en el tablero de GitHub Projects únicamente si satisface la totalidad de esta lista de verificación:

### Base Obligatoria del Módulo:
- [ ] **Cumple todos sus criterios de aceptación:** Se verificaron uno a uno todos los escenarios Gherkin definidos en la historia.
- [ ] **El código está revisado y aprobado por otro integrante:** Un par técnico o el QA Engineer (Felipe Charria) auditó el Pull Request y validó la lógica implementada (revisión entre pares obligatoria).
- [ ] **Tiene pruebas automatizadas y todas pasan:** Cuenta con pruebas unitarias/integración funcionales ejecutadas con éxito (o se declara explícitamente en el issue el estado justificado de las pruebas para el incremento).
- [ ] **Está integrada en `main` sin romper la compilación:** Código mergeado a la rama principal libre de conflictos, con linters y compilación en verde (`npm run build` y `npm run lint`).
- [ ] **La documentación afectada está actualizada:** Cualquier cambio en contratos de API, variables de entorno o flujos de usuario se encuentra documentado en la carpeta `docs/spec/`.
- [ ] **Si se utilizó IA, alguien la revisó y la explica:** El responsable del PR auditó cada línea generada con asistencia de IA (Antigravity) y está plenamente capacitado para defender su lógica individualmente ante el docente en el Sprint Review.

### Criterios Propios del Proyecto Nexo Cívico Studio (Justificados):
- [ ] **Pasan las dos pruebas de gobierno:**
  1. *Prueba de Cifras Reales:* Verificación estricta de que ninguna métrica de impacto, peso o beneficiario utilice datos inventados (*hardcoded* o *placeholders* sin origen en base de datos).
  2. *Prueba de Autorización y Privacidad:* Verificación de que no se soliciten ni persistan nombres, fotos o datos biométricos de personas beneficiarias en los comedores comunitarios (Ley 1581 de 2012 / Habeas Data).
- [ ] **Se probó entrando con el rol real y en el dispositivo real correspondiente:**
  > Se ejecutó la verificación funcional utilizando el rol previsto en la historia (Comerciante Donante, Voluntario de Transporte, Encargado de Comedor Receptora o Coordinadora) en su dispositivo objetivo (teléfono móvil con viewport responsivo para campo o navegador de escritorio para administración).
- [ ] **Verificación de Bloqueo Concurrente Atómico en Toma de Donaciones (Reserva Única - `CMP-03`):**
  > Para tareas que tocan el flujo de reserva o toma de alimentos, se comprobó formalmente que dos usuarios concurrentes no pueden tomar la misma donación al mismo tiempo. El primer intento transiciona la donación a `ASIGNADA` y el segundo intento recibe inmediatamente una respuesta de conflicto (HTTP 409) con mensaje amigable en pantalla.
- [ ] **Garantía de Cero Costo Recurrente en Capas Gratuitas ($0.00 USD/mes / Free Tier Guardrail):**
  > Se validó que el código no introduce servicios de pago ni consumo desmedido de cuotas de base de datos o almacenamiento en Supabase/Vercel, protegiendo el presupuesto de caja menor de $150.000 COP/mes de la Fundación (`RNF-005`).
