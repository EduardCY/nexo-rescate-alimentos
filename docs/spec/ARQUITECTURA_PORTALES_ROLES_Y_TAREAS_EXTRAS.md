# Briefing Maestro de Cierre: Auditoría Real, Portales por Rol, Olas 2/3 y Estrategia de Atribución Git
**Proyecto:** Nexo Rescate de Alimentos Cali  
**Propósito:** Documento de contexto integral para el nuevo chat de Antigravity enfocado en la finalización total del proyecto (Ola 2 + Ola 3 + Correcciones de Roles/Login/Mocks + Atribución por Colaborador).

---

## 1. Auditoría Forense del Estado Actual del Proyecto (`main`)

### A. Lo que YA existe y está verificado en `main` (Sprints 1, 2 y Ola 1)
1. **Base de Datos y Migraciones (`supabase/migrations/`):**
   - `20261009000000_init_schema.sql`: Tablas `organizaciones` (`DONANTE`, `RECEPTOR`, `FUNDACION`), `usuarios`, `donaciones`, `trazabilidad_eventos`.
   - `20261028000000_task08_tomar_donacion_endurecida.sql`: RPC transaccional `tomar_donacion`.
   - `20261030000000_add_ubicacion_exacta_donaciones.sql`: Coordenadas e indicaciones en `donaciones`.
   - `20261101000000_cmp05_rbac_usuarios.sql` (**Ola 1 - `TASK-24`**): Rol `ADMIN`, columnas `estado_cuenta` y `permisos_granulares`, tabla inmutable `audit_rbac_eventos` con triggers anti-mutación y RPCs `rbac_crear_usuario`, `rbac_actualizar_rol`, `rbac_cambiar_estado`. *(Nota: Pendiente de ejecutar en el SQL Editor del Dashboard remoto de Supabase).*
2. **Lógica de Servidor y Librerías de Cimientos (Ola 1 fusionada en `main`):**
   - `src/actions/metricas.ts` y `src/types/metricas.ts` (**`TASK-14`**): Motor `procesarMetricasImpacto` y `obtenerMetricasImpactoReal` con política *Cero Datos Inventados* (solo suma donaciones en estado `ENTREGADA`, factor FAO `2.5` kg CO2e/kg).
   - `src/lib/rbac/permisos.ts` (**`TASK-14` / `TASK-24`**): Matriz inmutable `RBAC_PERMISOS`, `tienePermiso()`, `puedeAccederRuta()`, `RUTAS_OPERATIVAS_VOLUNTARIO` y `RUTAS_ADMINISTRATIVAS_EXCLUSIVAS`.
   - `src/actions/usuarios-admin.ts` (**`TASK-24`**): Server Actions de gestión corporativa de usuarios (`listarUsuariosCorporativos`, `crearUsuarioCorporativo`, `actualizarRolUsuario`, `cambiarEstadoUsuario`).
   - `src/lib/auth/offline-session.ts` (**`TASK-24`**): Firma y verificación HMAC-SHA256 con Web Crypto API para sesión RBAC offline.
   - `src/lib/db.ts` y `src/lib/utils/offline-code.ts` (**`TASK-29`**): Esquema Dexie IndexedDB v2 (`donaciones_offline`, `outbox_mutations`, `catalogo_productos`, `donaciones_cache`, `sesion_rbac`) y algoritmo determinista C1 (`OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4>`).
   - `public/sw.js`, `public/manifest.json` y `src/components/pwa/ServiceWorkerRegister.tsx`: Base inicial de instalabilidad PWA.

---

### B. Brechas y Errores Arquitectónicos Detectados (Por Resolver en el Nuevo Chat)

1. **Error Crítico 1 — Ausencia de Login (`/login`) y Falta de Separación de Roles en la Interfaz:**
   - Actualmente `src/app/page.tsx` renderiza `<NexoApp initialView="dashboard" />` con una barra `MenuBar.tsx` única donde aparecen mezclados botones de todos los roles (*"Donar Alimentos"*, *"Catálogo y Mapa"*, *"Asignación de Comedores"*, *"Ruta Activa"*).
   - **Solución Obligatoria:** Crear una pantalla inicial de autenticación (`/login`) y separar la interfaz en **Portales Dedicados por Rol** (sin mostrar botones deshabilitados ni alertas de *"esto no lo puedes ver"*). Cada rol ve única y exclusivamente la interfaz, navegación y acciones que le competen.

2. **Error Crítico 2 — Presencia de Datos Mock (`SEED_*`) en Catálogo, Mapa y Dashboard:**
   - En `src/lib/nexo/api.ts`: Existen las constantes `SEED_LOTS` (`DON-101` a `DON-103`), `SEED_NGOS`, `SEED_MAP_NODES`, `SEED_DELIVERIES` y `getTotals()` con números falsos (`kg: 1450`, `rations: 3625`).
   - En `src/actions/donaciones.ts` (líneas 142-260 y 501-530): Existe `DONACIONES_ESTADO_VOLATIL` con `seed-01` a `seed-05`. Además, en `obtenerDonacionesDisponibles()`, la condición `if (!error && data && data.length > 0)` hace que cuando la tabla `donaciones` en Supabase está vacía (`data.length === 0`), el sistema caiga al fallback y muestre las 5 donaciones falsas en el catálogo.
   - **Solución Obligatoria:** Eliminar todos los datos semilla de las vistas de usuario. Si en Supabase hay `0` registros, devolver `[]` y renderizar **Empty States** claros (*"No hay donaciones registradas aún"*). Conectar `RadarMap.tsx` y todas las vistas exclusivamente a datos reales creados por los usuarios en Supabase/IndexedDB. *(Nota: Mantener únicamente los helpers en memoria requeridos por los tests unitarios de Vitest cuando corren en entorno `NODE_ENV === 'test'`).*

3. **Error Crítico 3 — Flujo Confuso de Creación de Comedores, Donantes y Asignación:**
   - No existe pantalla para crear un **Comedor Comunitario (Receptor)** ni para dar de alta/autorizar un **Donante**, ni está claro qué rol asigna una donación a un comedor o quién la acepta.
   - **Solución Obligatoria:** Definir e implementar el flujo guiado de principio a fin por rol, incluyendo el CRUD de comedores/organizaciones y el selector paso a paso (*Stepper*).

4. **Error Crítico 4 — Falta de Visualización de Donaciones Expiradas para Admin/Coordinador:**
   - Actualmente las donaciones expiradas desaparecen para todos.
   - **Solución Obligatoria:** En la vista de catálogo del **Administrador** y **Coordinador**, habilitar un filtro/pestaña `[Ver Donaciones Expiradas / Histórico]` que consulte en Supabase las donaciones con `estado = 'EXPIRADA'` o `hora_limite <= NOW()`, mostrando su insignia de expiración para auditoría de mermas.

5. **Tareas Faltantes de Ola 2 y Ola 3 según la Documentación Canónica:**
   - **Ola 2:**
     * `TASK-13` (Issue #22): Pantalla `/rastreo`, `TimelineTracker.tsx` y `RoleGuardBanner.tsx`.
     * `TASK-25` (Issue #38): `/impacto`, `/admin/usuarios`, `MetricasDashboard.tsx`, `ExportarReporteCSV.tsx`, `UsuariosAdminTable.tsx` y `src/middleware.ts`.
     * `TASK-28` (Issue #41): Endurecimiento de `public/sw.js`, `src/lib/pwa/register-sw.ts` y página `/~offline/page.tsx`.
     * `TASK-30` (Issue #43): Advertencia legal colombiana resaltada (`CA-01.3`), etiqueta canónica `"Temperatura Ambiente"` (`CA-01.4`) e Inspector Visual de Cola Outbox (`OutboxInspectorModal.tsx`, `CA-PWA.4`).
   - **Ola 3:**
     * `TASK-27` (Issue #40): `scripts/verify-rbac-routes.mjs`, cabeceras de seguridad en `next.config.mjs` y paso en `.github/workflows/ci.yml`.
     * `TASK-31` (Issue #44): Endurecimiento de `next.config.mjs`, iconos PWA y validación en CI.
     * `TASK-26` (Issue #39): Suites BDD `tests/unit/cmp-05-trazabilidad-impacto.test.ts` y `tests/unit/cmp-05-rbac-usuarios.test.ts`.
     * `TASK-32` (Issue #45): Suites `tests/integration/offline-pwa-outbox.test.ts` y `tests/unit/cmp-01-validacion-donacion.test.ts`.
     * `TASK-33` (Issue #46): Revisión transversal final 360° y cierre de DoD en `docs/spec/*` y Tablero #6.

---

## 2. Diseño Definitivo de Roles, Login e Interfaces Independientes

### A. Pantalla Inicial de Login y Registro por Rol (`/login`)
Al entrar a la aplicación sin sesión activa (o desde el botón *"Cambiar Usuario / Cerrar Sesión"*), el usuario ve la pantalla de acceso con dos modos claros:
1. **Iniciar Sesión con Cuenta Existente:** Selección/ingreso de correo electrónico de un usuario registrado en la tabla `usuarios` de Supabase (con validación de `estado_cuenta === 'ACTIVO'`).
2. **Registro / Solicitud según Rol (Pidiendo exactamente los datos de cada actor):**
   - **Soy Comercio Donante (`DONANTE`):** Pide Nombre del Comercio/Puesto, NIT o documento, Plaza/Dirección en Cali, Zona (`NORTE`, `CENTRO`, `SUR`, `ORIENTE`, `LADERA`), Teléfono de contacto, Correo y si dispone de cuarto frío. *(Crea la organización tipo `DONANTE` y el usuario).*
   - **Soy Comedor Receptor / ONG (`RECEPTOR`):** Pide Nombre del Comedor/Fundación, Dirección exacta en Cali, Zona, Teléfono, Capacidad de raciones por día y si posee refrigeración (`tiene_refrigeracion`). *(Crea la organización tipo `RECEPTOR` y el usuario).*
   - **Soy Voluntario Rescatista (`VOLUNTARIO`):** Pide Nombre completo, Correo, Teléfono y Tipo de Vehículo (`MOTO`, `CARROMOTO`, `CARRO`, `BICICLETA`, `A_PIE`).
   - **Acceso Coordinador (`COORDINADOR`) / Administrador (`ADMIN`):** Ingreso directo para gestión logística y gobernanza corporativa.

### B. Interfaces 100% Diferenciadas por Rol (Sin Botones Ajeno/Deshabilitados)

| Rol Activo | Menú de Navegación Exclusivo | Qué ve y qué hace en su Interfaz |
| :--- | :--- | :--- |
| **`DONANTE`** | `1. Publicar Donación` · `2. Mis Donaciones Activas e Historial` · `3. Rastreo por Código` · `4. Mis Certificados` | Formulario paso a paso para publicar excedentes (con aviso legal Ley 1990/2019 y selector de comedor opcional o dejar para asignación), lista estricta de sus propias donaciones publicadas viendo en qué estado van (`DISPONIBLE`, `ASIGNADA`, `ENTREGADA`) y quién las tomó (con aislamiento total de lotes ajenos). |
| **`VOLUNTARIO`** | `1. Catálogo de Rescates Disponibles (y Mapa)` · `2. Mi Ruta Activa` · `3. Confirmar Entrega` · `4. Cola Offline (Outbox)` | Catálogo limpio solo con donaciones `DISPONIBLE` vigentes con interruptor de disponibilidad operativa (`RF-003`). Botón para **"Aceptar / Tomar Rescate"** (elige o confirma el comedor destino si aún no tenía uno asignado). Al tomarla, pasa a **Mi Ruta Activa** donde ve datos de recogida del donante, comedor destino, opción de **"Liberar Misión"** por contingencia (`RF-010`) y botón **"Confirmar Entrega con Foto/Firma"**. |
| **`RECEPTOR`** *(Comedor)* | `1. Rescates en Camino a mi Comedor` · `2. Recogida Transporte Propio` · `3. Mi Ruta Activa` · `4. Confirmar Recepción` · `5. Datos de mi Comedor` | Ve donaciones asignadas a su comedor (`comedor_id`), acceso directo al catálogo para realizar **"Recogida con transporte propio del comedor"** (`RF-009`) con validación de cadena de frío (`RF-014`), gestión de su propia ruta activa y confirmación de recepción en comedor registrando mermas (`RF-012`). |
| **`COORDINADOR`** | `1. Centro de Control y Mapa Real` · `2. Asignar Donaciones a Comedores` · `3. Catálogo (+ Expiradas)` · `4. Autorización de Usuarios y Comedores` · `5. Impacto y CSV` | Marcela Ocampo / Fundación Mesa Común: Crea y edita Comedores Comunitarios, aprueba solicitudes en `/admin/usuarios` (`PENDIENTE_AUTORIZACION`), asigna donaciones a comedores verificando compatibilidad de frío, monitorea donaciones vigentes y expiradas, y descarga reportes CSV de impacto real. |
| **`ADMIN`** | `1. Gestión de Usuarios y Roles (RBAC)` · `2. Gestión de Comedores y Donantes` · `3. Catálogo Global (+ Expiradas)` · `4. Panel de Impacto Real` · `5. Bitácora de Auditoría` | Control corporativo total de `usuarios` (crear, cambiar roles, suspender/reactivar cuentas con motivo en `audit_rbac_eventos`), alta de organizaciones, visualización de donaciones activas y **expiradas**, y métricas de impacto real. |

---

## 3. Estrategia Técnica para que los Commits y Pull Requests Aparezcan de las Cuentas de los Colaboradores

Aunque **tú ejecutarás todo el trabajo con mi ayuda en el nuevo chat**, Git y GitHub permiten que la trazabilidad quede **100% atribuida a las cuentas reales de cada integrante**.

### A. Identidades Git Reales Extraídas del Historial del Repositorio
En los Sprints 1 y 2, tus compañeros ya hicieron commits con estas identidades exactas vinculadas a sus cuentas de GitHub:

| Colaborador | Usuario GitHub | `GIT_AUTHOR_NAME` | `GIT_AUTHOR_EMAIL` | Tareas en Olas 2 y 3 |
| :--- | :--- | :--- | :--- | :--- |
| **Santiago Valencia Sandoval** | `@lmprovemnt` | `lmprovemnt` | `santivalencia112309@gmail.com` | `TASK-13` (#22), `TASK-30` (#43) |
| **Alejandro Rodríguez Cortés** | `@AlejandroRodriguezDev` | `AlejandroRodriguezDev` | `alejandro_rod.c@uao.edu.co` | `TASK-25` (#38), `TASK-28` (#41) |
| **Juan Camilo Peña Sandoval** | `@Juan31252` | `Juan31252` | `synthexpalmira@gmail.com` | `TASK-27` (#40), `TASK-31` (#44) |
| **Felipe Charria Caicedo** | `@divdevu` | `Felipe Charria Caicedo` | `felipe.charria6@gmail.com` | `TASK-26` (#39), `TASK-32` (#45) |
| **Eduard Criollo Yule** | `@EduardCY` | `Eduard Criollo Yule` | `eduardcriolloyule2004@gmail.com` | `TASK-33` (#46) + Nuevas tareas de Roles/Mocks |

---

### B. Las 2 Formas de Entregarlo a cada Colaborador (Prepararemos Ambas)

Para distinguir entre **quién aparece como autor del Commit** y **quién aparece como creador del Pull Request en GitHub**:

#### Mecanismo 1: Archivo `.patch` Estándar de Git (Si el colaborador ejecuta 1 comando en su PC)
Git tiene un comando nativo llamado `git format-patch` que empaqueta todos los archivos creados/modificados, el mensaje del commit y los metadatos en **un solo archivo `.patch`** (por ejemplo: `entregables_colaboradores/TASK-13_Santiago_Valencia.patch`).
- **Qué le entregas al colaborador:** Solo ese archivo `.patch` por WhatsApp/Drive y estas 4 líneas para que las pegue en su terminal dentro del proyecto:
  ```bash
  git checkout main && git pull origin main
  git checkout -b feat/TASK-13-rastreo-timeline-ux
  git am --3way TASK-13_Santiago_Valencia.patch
  git push -u origin feat/TASK-13-rastreo-timeline-ux
  ```
- **Resultado:** El commit se aplica limpio sin que él tenga que programar nada, sube desde su propio Git local y luego abre el Pull Request en GitHub desde su cuenta.

#### Mecanismo 2: Rama Pre-Subida con Autoría Inyectada + Link de 1 Clic desde el Celular (Cero Consola para el Colaborador)
Si un colaborador no tiene el proyecto clonado o no puede usar la terminal:
1. **Nosotros aquí mismo** creamos la rama (ej. `feat/TASK-13-rastreo-timeline-ux`) y hacemos el commit inyectando su identidad oficial de GitHub:
   ```powershell
   $env:GIT_AUTHOR_NAME="lmprovemnt"; $env:GIT_AUTHOR_EMAIL="santivalencia112309@gmail.com"; $env:GIT_COMMITTER_NAME="lmprovemnt"; $env:GIT_COMMITTER_EMAIL="santivalencia112309@gmail.com"; git commit -m "feat(rastreo): ..."
   ```
2. **Nosotros subimos la rama** a GitHub (`git push -u origin feat/TASK-13-rastreo-timeline-ux`). En ese instante, **el commit en GitHub ya muestra la foto de perfil y el usuario `@lmprovemnt` como autor**.
3. **Qué le entregas al colaborador por WhatsApp:** Únicamente un enlace directo:
   `https://github.com/EduardCY/nexo-rescate-alimentos/compare/main...feat/TASK-13-rastreo-timeline-ux?expand=1`
   junto con el título y descripción a pegar.
4. **Qué hace el colaborador (toma 15 segundos desde su celular o navegador):** Abre el enlace logueado en su cuenta de GitHub y toca el botón verde **"Create pull request"**.
- **Resultado:**
  - **Autor del Commit en GitHub:** El colaborador (`@lmprovemnt`, `@AlejandroRodriguezDev`, `@Juan31252`, `@divdevu`).
  - **Creador del Pull Request en GitHub:** El colaborador desde su propia cuenta.
  - **Gráfico de Insights -> Contributors de GitHub:** Suma los commits y líneas de código directamente al perfil del colaborador.

---

## 4. Plan de Ejecución en Orden para el Nuevo Chat

En el nuevo chat ejecutaremos de principio a fin este flujo:
1. **Fase A (Limpieza de Mocks, Flujo de Roles, Login, Comedores y Expiradas):**
   - Eliminar `SEED_*` y `seed-01..05` en producción; dejar estados vacíos reales.
   - Construir `/login` y el contexto de sesión por rol (`DONANTE`, `VOLUNTARIO`, `RECEPTOR`, `COORDINADOR`, `ADMIN`) sincronizado con `sesion_rbac` de IndexedDB y Supabase.
   - Separar radicalmente la navegación y las vistas para cada uno de los 5 roles.
   - Habilitar creación de Comedores (`RECEPTOR`), asignación clara Donación $\rightarrow$ Comedor, recepción por parte del Comedor y filtro de **Donaciones Expiradas** para Admin/Coordinador.
2. **Fase B (Implementación Completa de la Ola 2 — `TASK-13`, `TASK-30`, `TASK-25`, `TASK-28`):**
   - Construir todos los archivos exigidos por cada tarea de la Ola 2 integrados con el sistema de roles real.
   - Crear las 4 ramas con la autoría Git exacta de **Santiago Valencia** y **Alejandro Rodríguez**, subirlas a GitHub y generar sus archivos `.patch` + guía de links de PR en `entregables_colaboradores/`.
3. **Fase C (Implementación Completa de la Ola 3 — `TASK-27`, `TASK-31`, `TASK-26`, `TASK-32`, `TASK-33`):**
   - Construir los scripts DevOps, endurecimiento de `next.config.mjs`, iconos PWA, suites BDD de QA (`TASK-26` y `TASK-32`) y cierre documental 360° (`TASK-33`).
   - Crear las ramas con la autoría Git exacta de **Juan Camilo Peña**, **Felipe Charria** y **Eduard Criollo**, subirlas y generar sus `.patch` + links de PR.
   - Verificar que `npm run lint`, `npm test` y `npm run build` pasen con 0 errores y actualizar el Tablero #6 de GitHub Projects.
