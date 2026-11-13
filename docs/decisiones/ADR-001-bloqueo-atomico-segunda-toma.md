# ADR-001 · Garantía de Bloqueo Atómico para Evitar la Doble Toma de una Donación

**Estado:** Aceptada  
**Fecha:** 26 de septiembre de 2026  
**Decisores:** Nexo Cívico Studio (Eduard Criollo, Juan Sebastián Delgado, Alejandro Rodríguez, Felipe Charria, Santiago Valencia)  
**Satisface:** `CMP-03`, `CA-03.2`, `RF-004`, `RF-010`, `RNF-004`  

---

## Contexto

En el escenario operativo de la Fundación Mesa Común, la coordinación manual previa por WhatsApp generaba el problema recurrente de "la doble toma": dos voluntarios se enteraban simultáneamente de una donación disponible, ambos se desplazaban en sus motos/carromotos hasta el comercio donante, y al llegar uno descubría que el otro ya había cargado los alimentos, perdiendo tiempo y gasolina valiosa de su bolsillo.

En un entorno digital con múltiples voluntarios con señal intermitente en Cali, dos o más usuarios pueden presionar el botón "Tomar Donación" en el mismo segundo o con milisegundos de diferencia. Si la lógica de actualización se ejecuta de manera ingenua en el cliente o sin control de concurrencia en la base de datos, ambos recibirán confirmación positiva, recreando exactamente el colapso del WhatsApp.

---

## Decisión

Implementar un mecanismo de **bloqueo pesimista transaccional a nivel de motor de base de datos** utilizando una función RPC en PostgreSQL (`SELECT ... FOR UPDATE`), expuesta mediante Supabase / Serverless Actions:

1. Cuando un voluntario solicita tomar una donación, la petición invoca la función RPC `tomar_donacion(p_donacion_id, p_voluntario_id, p_voluntario_nombre)` (enmendado en TASK-08 y endurecido en Migración 7 `20261112000000`: firma de 3 parámetros, `SECURITY DEFINER` con `SET search_path = public, pg_temp` para mitigar secuestro de esquema, porque el RLS de `donaciones` prohíbe `UPDATE` directo desde el cliente `anon`).
2. La función verifica primero existencia en `usuarios` (`codigo: 404` si no existe), impide que `DONANTE` tome lotes (`codigo: 403`) y, para `RECEPTOR`, verifica compatibilidad de cadena de frío (`requiere_frio = true` con `tiene_refrigeracion = false` retorna JSONB controlado `codigo: 403`, sin lanzar excepción SQL). Al operar con clave `anon` sin Supabase Auth JWT nativo, la RPC confía en el `p_voluntario_id` validado previamente por la Server Action `tomarDonacion` (y su verificación de cuenta suspendida); no inspecciona `auth.uid()`.
3. La base de datos bloquea la fila de la donación específica mediante `SELECT ... FOR UPDATE` durante la transacción.
4. Si el estado actual es `DISPONIBLE`, actualiza a `ASIGNADA`, asocia el `voluntario_id` y confirma la operación con JSONB `codigo: 200`.
5. Si la donación ya cambió de estado, retorna de inmediato JSONB controlado `codigo: 409` con el mensaje de `CA-03.2` (*"Esta donación acaba de ser reservada por otra persona..."*). El estado se evalúa **antes** que la hora límite. Si la oferta está `EXPIRADA`, `CANCELADA` o su hora límite venció, retorna `codigo: 410` con el mensaje de `CA-03.3` (*"La oferta seleccionada ya no se encuentra vigente para recogida."*). Otros códigos JSONB controlados: `400` (parámetros nulos), `403` (`DONANTE` o incompatibilidad de frío) y `404` (donación o voluntario inexistentes).

---

## Alternativas Consideradas

### 1. Bloqueo en Memoria en el Servidor Web (Node.js Mutex)
- **Por qué se descartó:** En una arquitectura Serverless desplegada en Vercel, las funciones se ejecutan en instancias efímeras independientes que no comparten memoria. Un mutex en Node.js no previene colisiones entre diferentes lambdas.

### 2. Actualización condicional simple en el cliente (`WHERE estado = 'DISPONIBLE'`)
- **Por qué se descartó:** Aunque puede evitar la sobreescritura si se valida el número de filas afectadas (`rowCount === 1`), no permite encadenar de forma atómica el registro en la tabla inmutable de auditoría (`trazabilidad_eventos`) ni notificar en la misma transacción qué usuario la ganó.

### 3. Sistema de colas externo (Redis / RabbitMQ / Upstash)
- **Por qué se descartó:** Introduce una dependencia de infraestructura externa adicional con costos potenciales o límites severos de capa gratuita, violando el principio de diseño de mantener el TCO en $0 USD/mes para la fundación.

---

## Consecuencias

### Positivas:
- **Garantía ACID absoluta:** Cero posibilidades matemáticas de doble asignación, resolviendo el corazón del MVP.
- **Respuesta determinística:** El voluntario que llega milisegundos tarde recibe retroalimentación inmediata en pantalla sin falsas expectativas.
- **Cero costo de infraestructura adicional:** Se ejecuta nativamente en el motor PostgreSQL ya contratado en el Free Tier de Supabase.

### Negativas / Trade-offs:
- Pequeña latencia adicional (menor a 50 ms) mientras se mantiene el bloqueo de la fila durante la transacción. Dado el volumen del cliente (8 a 15 rescates por semana), este impacto es despreciable.
