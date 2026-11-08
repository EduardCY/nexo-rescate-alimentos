# Arquitectura de Portales Independientes por Rol y Catálogo de Tareas Extras
**Proyecto:** Nexo Rescate de Alimentos Cali  
**Documento Canónico de Especificación para la Sesión Final**  
**Gobernanza:** Trazado a RF-001 a RF-017, RNF-003 (RBAC), CMP-01 a CMP-05.

---

## 1. Principio Fundamental: Separación Radical de Interfaces por Rol

Se elimina el paradigma de un "Dashboard monolítico compartido con botones deshabilitados o alertas de 'No tienes permiso'".  
En su lugar, el sistema implementa **Portales Dedicados e Independientes por Rol (*Role-Driven Portals*)**: cada usuario, al iniciar sesión, es redirigido exclusivamente a una experiencia visual adaptada a sus competencias operativas.

```
                           [ PÁGINA DE INICIO / LOGIN ]
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
        [ PORTAL DONANTE ]     [ PORTAL VOLUNTARIO ]  [ PORTAL COORDINADOR ]
        • Publicar donación    • Catálogo vigentes    • Asignar a comedor
        • Mis lotes            • Tomar donación       • Mapa logístico
        • Certificados         • Ruta activa          • Alertas mermas
                 │                      │                      │
                 └──────────────────────┼──────────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
        [ PORTAL RECEPTOR ]                         [ PORTAL ADMINISTRADOR ]
        (Comedor Comunitario)                       • Gestión de usuarios (RBAC)
        • Donaciones en camino                      • Alta de comedores
        • Confirmar recepción                       • Catálogo + Expiradas
        • Reporte de raciones                       • Bitácora inmutable & KPIs
```

---

## 2. Flujo de Autenticación y Segmentación de Roles

### A. Pantalla de Inicio de Sesión (`/login`)
1. **Identificación por Credenciales y Rol:**
   - El formulario solicita Email y Contraseña (o PIN / selector rápido en entorno de desarrollo).
   - El sistema consulta la tabla `usuarios` en Supabase y valida:
     1. Que la contraseña / token sea válido.
     2. Que el campo `estado_cuenta = 'ACTIVO'` (si está `SUSPENDIDO` o `PENDIENTE_AUTORIZACION`, bloquea el acceso con mensaje explicativo).
     3. El valor del campo `rol`: `'DONANTE'`, `'VOLUNTARIO'`, `'COORDINADOR'`, `'RECEPTOR'`, `'ADMIN'`.
2. **Redirección Inmediata a su Portal:**
   - Un usuario nunca aterriza en una vista ajena a su rol. La barra de navegación superior (*NavBar*) contiene únicamente enlaces válidos para dicho rol.

---

## 3. Especificación Detallada de los 5 Portales Dedicados

### 1. Portal Donante (`/portal/donante`)
* **Audiencia:** Supermercados, plazas de mercado (Cavasa, Santa Elena, Alameda) y distribuidores agrícolas.
* **Componentes Exclusivos:**
  - **Formulario de Publicación Rápida:** Tipo de alimento, cantidad estimada (kg/bultos), requerimiento de frío, hora límite de recogida y dirección exacta con geolocalización.
  - **Mis Donaciones Publicadas:** Listado con estado en tiempo real (`Publicada`, `Asignada a Comedor`, `Voluntario en Camino`, `Entregada`).
  - **Módulo de Certificados Tributarios:** Consulta de certificados por donación efectiva.
* **Restricciones:** Cero botones de "tomar donación", cero listados de donaciones de la competencia, cero opciones de administración.

### 2. Portal Voluntario (`/portal/voluntario`)
* **Audiencia:** Rescatistas en terreno (motos, carromotos, ciclistas y a pie en Cali).
* **Componentes Exclusivos:**
  - **Catálogo de Rescates Disponibles:** Donaciones activas con `estado = 'DISPONIBLE'` y tiempo de vida vigente (`hora_limite > NOW()`).
  - **Acción de Toma de Donación:** Bloqueo transaccional C1 (`REC-YYYYMMDD-XXXX`) garantizando idempotencia.
  - **Ruta Activa:** Línea de tiempo de 5 estados operativos, dirección de recogida en muelle, mapa de ruta y dirección del comedor comunitario destino.
  - **Inspector Outbox (PWA Offline):** Monitoreo de rescates tomados sin conexión y sincronización automática.
* **Restricciones:** No puede publicar donaciones, no puede modificar datos de comedores ni ver usuarios del sistema.

### 3. Portal Coordinador (`/portal/coordinador`)
* **Audiencia:** Gestores logísticos (Mesa Común / Banco de Alimentos).
* **Componentes Exclusivos:**
  - **Bandeja de Donaciones Pendientes:** Donaciones publicadas que aún no tienen comedor receptor asignado.
  - **Asistente de Asignación (Matching):** Selector de comedor receptor basado en cercanía de comuna (Norte, Sur, Oriente, Ladera, Centro) y capacidad de frío.
  - **RadarMap Logístico:** Visualización en mapa de Cali con nodos reales de donantes, comedores y rutas en tránsito.
  - **Alertas de Caducidad:** Notificaciones cuando una donación está a menos de 2 horas de su `hora_limite`.

### 4. Portal Receptor / Comedor Comunitario (`/portal/receptor`)
* **Audiencia:** Líderes de comedores comunitarios, fundaciones y hogares de paso de Cali.
* **Componentes Exclusivos:**
  - **Panel de Envíos en Camino:** Donaciones que han sido asignadas a su comedor y vienen en tránsito.
  - **Recepción Física de Alimentos:** Botón de un toque para confirmar la llegada del voluntario a la sede.
  - **Acta de Conformidad:** Registro rápido del estado organoléptico (Bueno, Regular) y número de raciones/comensales proyectados a alimentar.
* **Restricciones:** No accede a configuración global ni a rutas de otros comedores.

### 5. Portal Administrador (`/portal/admin`)
* **Audiencia:** Administradores centrales y auditores de gobernanza.
* **Componentes Exclusivos:**
  - **Gestión de Comedores Comunitarios (`/admin/comedores`):** CRUD completo para dar de alta sedes, direcciones, refrigeración y cupos.
  - **Gestión de Usuarios y Donantes (`/admin/usuarios`):** Activación, suspensión y reasignación de roles con bitácora inmutable.
  - **Catálogo Global con Donaciones Expiradas:** Toggle para auditar mermas, tiempos vencidos y canalización a compostaje.
  - **Panel de Impacto Real (`/impacto`):** Métricas consolidadas de CO2, agua y raciones calculadas con `Decimal.js` (Cero Datos Inventados).
  - **Bitácora Inmutable (`audit_rbac_eventos`):** Auditoría forense de cambios de privilegios y seguridad.

---

## 4. Catálogo Consolidado de Tareas Extras (Para GitHub Projects)

| Código | Título de la Tarea | Responsable Sugerido | Hito / Comportamiento |
| :--- | :--- | :--- | :--- |
| **`TASK-EXTRA-01`** | Erradicación definitiva de Mocks (`SEED_*`) y conexión a datos reales con Empty States | Alejandro Rodríguez | CMP-01 (#1) |
| **`TASK-EXTRA-02`** | Filtro y vista de donaciones expiradas y mermas para Admin/Coordinador en Catálogo | Santiago Valencia | CMP-05 (#36) |
| **`TASK-EXTRA-03`** | Módulo de gestión (CRUD) de Comedores Comunitarios y Organizaciones Donantes | Eduard Criollo | CMP-05 (#36) |
| **`TASK-EXTRA-04`** | Flujo asistido de asignación de donación a comedor (Matching Stepper UX) | Santiago Valencia | CMP-03 (#4) |
| **`TASK-EXTRA-05`** | RadarMap dinámico alimentado por geolocalización real de donaciones y comedores | Alejandro Rodríguez | CMP-02 (#3) |
| **`TASK-EXTRA-06`** | Autenticación segmentada por rol y enrutamiento a Portales Independientes | Eduard Criollo | CMP-05 (#36) |
