# ADR-003 · Arquitectura Serverless de Costo Operativo Cero (`$0 USD/mes`)

* **Estado:** Aceptado (Entrega 3C)
* **Trazado a:** `RNF-005`, `RF-018`

## Contexto y Restricción del Cliente

La Fundación Mesa Común no cuenta con presupuesto recurrente para servidores dedicados, licencias de mapas pagos ni clústeres de base de datos administrados (`$0.00 USD/mes` de operación).

## Decisión

1. **Cómputo y Hosting:** Next.js App Router desplegado en Vercel Free Tier (Server Actions y SSR sin servidores persistentes que mantener).
2. **Base de Datos:** PostgreSQL 15 en Supabase Free Tier con políticas RLS y funciones `SECURITY DEFINER`, documentando en `README.md` el procedimiento de reactivación ante la política de pausa automática a los 7 días de inactividad.
3. **Cartografía:** OpenStreetMap nativo vía Leaflet sin API Key ni marcas de agua comerciales (reemplazando proveedores con cuotas o claves pagas como Google Maps o CartoDB).
4. **Almacenamiento Multimedia (`RF-018`):** Cero carga obligatoria de fotografías pesadas en Storage para proteger las cuotas gratuitas y evitar exposición de beneficiarios (`Ley 1581`).

## Alternativas Descartadas

* **Google Maps Platform:** Descartado por requerir tarjeta de crédito y cobro por carga de mapa/geocodificación tras superar créditos.
* **Backend dedicado en EC2/VPS:** Descartado por costo fijo mensual y carga de administración de infraestructura.
