# ADR-004 · Confinamiento RBAC por Portales, Sesión Offline HMAC y 2FA Configurable

* **Estado:** Aceptado (Entrega 3C)
* **Trazado a:** `RNF-003`, `CMP-05`, `CA-05.1..CA-05.3`

## Contexto y Restricción del Cliente

El sistema atiende 5 actores distintos (`ADMIN`, `COORDINADOR`, `VOLUNTARIO`, `DONANTE`, `RECEPTOR`) con obligación legal de proteger datos bajo la **Ley 1581 de 2012 (Habeas Data)** y evitar que voluntarios o donantes accedan a módulos administrativos o alteren reportes de impacto para cooperantes. Adicionalmente, en campo puede perderse conectividad y el acceso en `/login` en producción no debe exponer credenciales ni datos de prueba.

## Decisión

1. **Defensa en Profundidad RBAC y Frontera Edge:** Validación de rutas en `src/middleware.ts` leyendo las cookies del navegador (`nexo_rol`, `nexo_user_id`, `nexo_estado_cuenta`, TTL 24 h, `SameSite=Lax` sincronizadas por `SessionProvider`, ya que el Edge Middleware no lee IndexedDB), en el motor puro `src/lib/rbac/permisos.ts`, en Server Actions administrativas (`usuarios-admin.ts`, `eliminarDonacion`, `liberarDonacionAsignada`) y mediante `RoleGuardBanner` en cliente.
2. **Sesión Offline Firmada y Custodia de Claves:** Almacén aislado `NexoSesionRBAC` en IndexedDB firmado con **HMAC-SHA256** (`TTL 24 h`) usando una `CryptoKey` simétrica generada por dispositivo vía Web Crypto API como **no extraíble (`extractable: false`)** en la tabla `claves_rbac` (sin secretos embebidos en el bundle). En servidor, el desafío temporal de login (`tempAuthToken`, TTL 10 min) se firma con HMAC-SHA256 usando `SUPABASE_SERVICE_ROLE_KEY`. Los secretos TOTP Base32 (`usuarios.totp_secret`) se almacenan actualmente en texto plano en PostgreSQL bajo protección RLS/Server Actions (mejora futura recomendada: cifrado AES-GCM en servidor).
3. **2FA TOTP y Sandbox Controlado por Entorno:** `NEXT_PUBLIC_ENABLE_2FA=true` (cliente `/login` + servidor; al ser `NEXT_PUBLIC_*`, se incrusta en build y cambiarla exige redeploy) y `ENABLE_TOTP_2FA=true` (control exclusivo de servidor) como estándar en producción (para pruebas sin TOTP usar un despliegue *Preview* separado con `false`), y pestaña Sandbox oculta por defecto salvo `NEXT_PUBLIC_ENABLE_DEMO_SANDBOX=true` en local.

## Alternativas Descartadas

* **Guardar rol plano en `localStorage` sin firma:** Descartado por permitir escalamiento trivial de interfaz offline.
* **Dejar cuentas demo visibles en producción:** Descartado por exposición de credenciales y requerimiento explícito de entrega limpia sin datos de prueba a la vista.
