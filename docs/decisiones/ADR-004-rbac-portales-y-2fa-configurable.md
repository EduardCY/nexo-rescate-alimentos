# ADR-004 · Confinamiento RBAC por Portales, Sesión Offline HMAC y 2FA Configurable

* **Estado:** Aceptado (Entrega 3C)
* **Trazado a:** `RNF-003`, `CMP-05`, `CA-05.1..CA-05.3`

## Contexto y Restricción del Cliente

El sistema atiende 5 actores distintos (`ADMIN`, `COORDINADOR`, `VOLUNTARIO`, `DONANTE`, `RECEPTOR`) con obligación legal de proteger datos bajo la **Ley 1581 de 2012 (Habeas Data)** y evitar que voluntarios o donantes accedan a módulos administrativos o alteren reportes de impacto para cooperantes. Adicionalmente, en campo puede perderse conectividad y el acceso en `/login` en producción no debe exponer credenciales ni datos de prueba.

## Decisión

1. **Defensa en Profundidad RBAC:** Validación en `src/middleware.ts`, en motor puro `src/lib/rbac/permisos.ts`, en Server Actions administrativas (`usuarios-admin.ts`, `eliminarDonacion`, `liberarDonacionAsignada`) y mediante `RoleGuardBanner` en cliente.
2. **Sesión Offline Firmada:** Almacén aislado `NexoSesionRBAC` en IndexedDB firmado con **HMAC-SHA256** mediante clave no extraíble de `Web Crypto` (`TTL 24h`) para mantener el confinamiento de rutas sin red ni secretos embebidos en el bundle.
3. **2FA TOTP y Sandbox Controlado por Entorno:** `NEXT_PUBLIC_ENABLE_2FA=true` como estándar de seguridad en código/configuración (configurable a `false` temporalmente por variable de entorno si una demostración lo requiere), y pestaña Sandbox oculta por defecto salvo `NEXT_PUBLIC_ENABLE_DEMO_SANDBOX=true` en local.

## Alternativas Descartadas

* **Guardar rol plano en `localStorage` sin firma:** Descartado por permitir escalamiento trivial de interfaz offline.
* **Dejar cuentas demo visibles en producción:** Descartado por exposición de credenciales y requerimiento explícito de entrega limpia sin datos de prueba a la vista.
