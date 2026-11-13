# ADR-002 · Arquitectura PWA Offline-First, Service Worker SWR y Patrón Outbox

* **Estado:** Aceptado (Entrega 3C)
* **Trazado a:** `RNF-002`, `CA-01.5`, `CA-PWA.1..CA-PWA.5`

## Contexto y Restricción del Cliente

Comerciantes en galerías de mercado de Cali (Santa Elena, Cavasa, Alameda) y voluntarios en sótanos o zonas periféricas sufren pérdida intermitente de señal celular 4G y operan con teléfonos móviles de gama baja/media. Una aplicación web tradicional pierde formularios diligenciados o muestra la pantalla de error del navegador al recargar (`F5`).

## Decisión

1. **Service Worker (`public/sw.js`):** Pre-cachea las rutas del App Shell (`/`, `/login`, `/donar`, `/donaciones`, `/ruta-activa`, `/rastreo`, `/~offline`), aplica `Cache-First` a activos estáticos inmutables, `Stale-While-Revalidate` a documentos HTML (con limpieza de respuestas `redirected`) y `Network-First` con timeout de `3000 ms` y respuesta JSON `503` controlada para peticiones de datos.
2. **Persistencia Local y Patrón Outbox (`Dexie.js` / `IndexedDB`):**
   - `CREATE` (publicar donación) y `CONFIRM` (acta de entrega física) se permiten sin conexión guardándose con `idempotencyKey` (`UUID v4`) y código determinista `OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4>`, sincronizándose en orden FIFO al dispararse el evento `online`.
   - **`TAKE` (tomar donación)** se bloquea explícitamente sin conexión para no emitir reservas falsas que violen el bloqueo atómico en servidor (`ADR-001`).

## Alternativas Descartadas

* **Encolar `TAKE` offline:** Descartado porque permitiría a dos voluntarios sin red creer que reservaron el mismo lote, rompiendo `CMP-03`.
* **App nativa Android/iOS:** Descartado por restricción de presupuesto `$0`, fricción de instalación en tiendas y mantenimiento duplicado.
