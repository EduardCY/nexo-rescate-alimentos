# ADR-001 · Garantía de Bloqueo Atómico para Evitar la Doble Toma de una Donación

**Estado:** Aceptada  
**Fecha:** 26 de septiembre de 2026  
**Decisores:** Nexo Cívico Studio (Eduard Criollo, Santiago Valencia, Alejandro Rodríguez, Felipe Charria)  
**Satisface:** `CMP-03`, `CA-03.2`, `RF-004`, `RF-010`, `RNF-004`  

---

## Contexto

En el escenario operativo de la Fundación Mesa Común, la coordinación manual previa por WhatsApp generaba el problema recurrente de "la doble toma": dos voluntarios se enteraban simultáneamente de una donación disponible, ambos se desplazaban en sus motos/carromotos hasta el comercio donante, y al llegar uno descubría que el otro ya había cargado los alimentos, perdiendo tiempo y gasolina valiosa de su bolsillo.

En un entorno digital con múltiples voluntarios con señal intermitente en Cali, dos o más usuarios pueden presionar el botón "Tomar Donación" en el mismo segundo o con milisegundos de diferencia. Si la lógica de actualización se ejecuta de manera ingenua en el cliente o sin control de concurrencia en la base de datos, ambos recibirán confirmación positiva, recreando exactamente el colapso del WhatsApp.

---

## Decisión

Implementar un mecanismo de **bloqueo pesimista transaccional a nivel de motor de base de datos** utilizando una función RPC en PostgreSQL (`SELECT ... FOR UPDATE`), expuesta mediante Supabase / Serverless Actions:

1. Cuando un voluntario solicita tomar una donación, la petición invoca la función RPC `tomar_donacion(donacion_id, voluntario_id)`.
2. La base de datos bloquea la fila de la donación específica durante la transacción.
3. Si el estado actual es `DISPONIBLE`, se cambia inmediatamente a `ASIGNADA`, se asocia el `voluntario_id` y se confirma la operación con código de éxito `200`.
4. Si la donación ya cambió de estado (o fue tomada por la transacción previa en cola), la transacción retorna de inmediato un estado de fallo controlado `409 Conflict` con el mensaje explícito: *"Esta donación ya fue tomada por otro voluntario"*.

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
