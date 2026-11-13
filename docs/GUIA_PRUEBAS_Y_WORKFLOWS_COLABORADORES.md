# Manual Integral de Operaciones, Credenciales y Guía de Pruebas E2E
## Plataforma Nexo: Red de Rescate de Alimentos (Fundación Mesa Común — Cali)

**Proyecto Informático 2 — Universidad Autónoma de Occidente (UAO)**  
**Equipo de Desarrollo:** Nexo Cívico Studio (Equipo 3)  
**Marco Normativo:** Ley 1990 de 2019 • EatCloud Architecture • ÁBACO • Estándar FAO (2.5 kg CO₂e / kg) • WCAG 2.1 AA  
**Despliegue de Producción Oficial:** [https://nexo-rescate-alimentos.vercel.app](https://nexo-rescate-alimentos.vercel.app)  
**Repositorio GitHub:** [https://github.com/EduardCY/nexo-rescate-alimentos](https://github.com/EduardCY/nexo-rescate-alimentos)

---

## 1. Ficha Técnica y Credenciales Maestras de Acceso

La plataforma cuenta con **5 cuentas corporativas pre-configuradas (seed accounts)** en la base de datos PostgreSQL / Supabase, cubriendo la totalidad de los actores del ecosistema del **Caso C0** (Fundación Mesa Común).

> [!IMPORTANT]
> **Estado del Segundo Factor de Autenticación (Google Authenticator TOTP):**
> Para facilitar la ejecución de pruebas ágiles, demostraciones académicas ante jurados de la UAO y validación funcional sin la fricción de escanear códigos QR en cada inicio de sesión, el sistema se encuentra configurado en **Modo de Pruebas con Bypass de 2FA** (`NEXT_PUBLIC_ENABLE_2FA=false`).  
> Al ingresar en la **Pestaña 2**, el usuario valida únicamente su correo y contraseña (`Nexo2026*!`) y accede de inmediato en un solo paso. La infraestructura criptográfica y las claves en base de datos permanecen 100% intactas para cuando se desee reactivar.

### 🔑 Tabla Maestra de Credenciales

| Rol Corporativo | Nombre del Actor / Identidad | Correo Institucional | Contraseña Unificada | Portal de Entrada | Capacidades Principales |
|---|---|---|---|---|---|
| **COORDINADOR** | Marcela Ocampo (Coordinación Operativa) | `coordinacion@mesacomun.org` | `Nexo2026*!` | `/` (Torre de Control) | Supervisión cartográfica en tiempo real, pre-asignación con validación de refrigeración, aprobación de postulaciones públicas, auditoría de lotes expirados. |
| **ADMIN** | Administrador Corporativo Nexo | `admin@nexorescate.org` | `Nexo2026*!` | `/` (Portal Admin) | Gobernanza total RBAC, modificación de roles en `/admin/usuarios`, bitácora inmutable de eventos, restablecimiento de 2FA y purga total del sistema. |
| **DONANTE** | Comercio Donante Certificado (Galería / Fruver) | `donante@mesacomun.org` | `Nexo2026*!` | `/donar` / `/` (Portal Donante) | Publicación de excedentes perecederos, georreferenciación en Cali, control de 48h de vida útil (Ley 1990) y certificados tributarios DIAN (Art. 257 E.T.). |
| **VOLUNTARIO** | Voluntario de Rescate Operativo Cali | `voluntario@mesacomun.org` | `Nexo2026*!` | `/donaciones` / `/ruta-activa` | Conmutador de disponibilidad (RF-003), toma de donaciones con bloqueo pesimista (`SELECT ... FOR UPDATE`), manifiesto de ruta activa y liberación de misión. |
| **RECEPTOR** | Comedor Comunitario Siloé Esperanza | `comedor@mesacomun.org` | `Nexo2026*!` | `/` (Portal Comedor) | Gestión de capacidad y ficha de frío, "Recogida con transporte propio" (RF-009/014), firma digital de recepción y registro de mermas (`/entregas/[id]`). |

---

## 2. Arquitectura de Acceso: El Portal `/login` y sus 3 Pestañas

El portal corporativo de acceso ([https://nexo-rescate-alimentos.vercel.app/login](https://nexo-rescate-alimentos.vercel.app/login)) implementa un diseño inspirado en diálogos de Windows 98 y se divide en **tres pestañas de operación claramente diferenciadas**:

```
+----------------------------------------------------------------------------------------------------+
| [ ] NEXO RESCATE DE ALIMENTOS - PORTAL CORPORATIVO (FUNDACIÓN MESA COMÚN, CALI)                 [X]|
+----------------------------------------------------------------------------------------------------+
| [ * 1. Explorar los 5 Roles ] | [ -> 2. Iniciar Sesión Registrada ] | [ + 3. Postulación Pública ]  |
+----------------------------------------------------------------------------------------------------+
```

### 🌟 Pestaña 1: "Explorar los 5 Roles (Auditoría en 1 Clic)" — Sandbox de Evaluación
* **Propósito:** Diseñada específicamente para los jurados de la UAO, auditores externos y pruebas rápidas de interfaz de usuario.
* **Comportamiento:**
  * Presenta 5 tarjetas representativas con la descripción, icono, capacidades y restricciones de cada rol.
  * Al hacer clic en cualquiera de los botones (ej. `Entrar como DONANTE >`, `Entrar como COORDINADOR >`), el sistema inyecta la sesión RBAC activa en memoria, cookies de borde (`nexo_rol`, `nexo_user_id`, `nexo_estado_cuenta=ACTIVO`) y `localStorage`, redirigiendo al usuario al portal correspondiente **sin solicitar contraseñas**.
  * **Aislamiento:** Permite saltar entre roles en segundos usando el botón `Salir / Cambiar Rol` de la barra superior para auditar qué puede y qué no puede ver cada perfil.

### 🔐 Pestaña 2: "Iniciar Sesión Registrada" — Autenticación Formal
* **Propósito:** Entrada operativa real para usuarios registrados con credenciales institucionales.
* **Comportamiento Actual (Modo Pruebas con Bypass 2FA):**
  1. El formulario solicita **Correo Electrónico** y **Contraseña**.
  2. Dispone de un panel de autocompletado rápido para las 5 cuentas seed (`Auto >`).
  3. El botón principal muestra: **`→ Ingresar al Sistema >`**.
  4. El backend valida el correo y la contraseña contra el hash PBKDF2-HMAC-SHA512 almacenado.
  5. Al ser válida la contraseña y detectar `NEXT_PUBLIC_ENABLE_2FA=false`, emite la sesión corporativa directa y redirige inmediatamente al tablero del rol.
* **Cómo Reactivar Google Authenticator (TOTP) en el Futuro:**
  Para volver a activar el requerimiento de código QR y token de 6 dígitos cada 30 segundos, basta con ejecutar:
  ```bash
  npx vercel env add NEXT_PUBLIC_ENABLE_2FA --environment production --value "true" --yes
  npx vercel --prod --yes
  ```
  Al reactivarse, el sistema exigirá el **Paso 2A (Enrolamiento escaneando el QR en Google Authenticator)** para cuentas nuevas o el **Paso 2B (Desafío de 6 dígitos con cuenta regresiva de 30s RFC 6238)** para usuarios recurrentes.

### 📝 Pestaña 3: "Postulación Pública de Miembros" — Onboarding Ley 1990 de 2019
* **Propósito:** Permite a nuevos comercios donantes, ciudadanos voluntarios y comedores comunitarios solicitar su ingreso formal a la red de la Fundación Mesa Común.
* **Comportamiento y Reglas de Seguridad:**
  1. El usuario selecciona su rol postulado (`VOLUNTARIO`, `DONANTE` o `RECEPTOR`). Los roles `ADMIN` y `COORDINADOR` **no** son postulables públicamente.
  2. Diligencia sus datos de contacto, zona de Cali (`CENTRO`, `NORTE`, `SUR`, `ORIENTE`, `LADERA`, `CAVASA`), tipo de vehículo o capacidad de raciones/refrigeración y define su **contraseña corporativa** ($\ge 8$ caracteres).
  3. **Guarda Normativa Estricta:** Al enviar el formulario, la cuenta **NO** queda activa de inmediato. Se crea en estado `PENDIENTE_AUTORIZACION`.
  4. Si el usuario intenta iniciar sesión en la Pestaña 2 con sus datos recién postulados, el sistema **bloquea el acceso** mostrando un aviso legal:
     > *"Tu cuenta se encuentra en revisión conforme a la Ley 1990 de 2019. Coordinación Operativa debe autorizar tu registro antes de ingresar."*
  5. Para operar, la Coordinadora Operativa (`coordinacion@mesacomun.org`) o el Administrador deben ingresar a [`/admin/usuarios`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/admin/usuarios/page.tsx) y presionar el botón verde **"✓ Aprobar"**.

---

## 3. Matriz de Confinamiento RBAC y Control de Acceso

La plataforma aplica confinamiento estricto en tres capas: **Middleware de Borde (`src/middleware.ts`)**, **Server Actions (`src/actions/*`)** y **Componentes de Interfaz (`RoleGuardBanner.tsx`)**.

| Ruta | `DONANTE` | `VOLUNTARIO` | `RECEPTOR` | `COORDINADOR` | `ADMIN` |
|---|:---:|:---:|:---:|:---:|:---:|
| `/` (Portal Principal) | ✅ Portal Donante | ✅ Portal Voluntario | ✅ Portal Comedor | ✅ Torre de Control | ✅ Consola Global |
| `/donar` (Publicar Donación) | ✅ Permitido | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden | ✅ Permitido |
| `/donaciones` (Catálogo en Vivo) | 🚫 403 Forbidden | ✅ Tomar Rescates | ✅ Recogida Propia | ✅ Supervisión Global | ✅ Supervisión Global |
| `/ruta-activa` (Hoja de Despacho) | 🚫 403 Forbidden | ✅ Ruta Asignada | ✅ Recogida Propia | ✅ Modo Inspector | ✅ Modo Inspector |
| `/entregas/[id]` (Acta y Mermas) | 🚫 403 Forbidden | ✅ Confirmar Entrega | ✅ Firmar Recepción | ✅ Auditoría | ✅ Auditoría |
| `/admin/usuarios` (Gobernanza) | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden | ✅ Aprobar Cuentas | ✅ Control Total |
| `/impacto` (Métricas Reales) | 🚫 403 Forbidden | 🚫 403 Forbidden | 🚫 403 Forbidden | ✅ Ver y Exportar CSV | ✅ Ver y Exportar CSV |
| `/rastreo` (Trazabilidad Lote) | ✅ Su propio lote | ✅ Misión asignada | ✅ Donación recibida | ✅ Cualquier Lote | ✅ Cualquier Lote |

---

## 4. Workflows Operativos Paso a Paso por Rol (Caso C0)

### 🥖 Workflow 1: Comercio Donante (`DONANTE`)
* **Objetivo:** Publicar excedentes de alimentos perecederos evitando el desperdicio y obteniendo el Certificado de Donación para deducción tributaria (Art. 257 Estatuto Tributario).
* **Paso a Paso:**
  1. En `/login`, selecciona la **Pestaña 1** y pulsa `Entrar como DONANTE >` (o inicia sesión con `donante@mesacomun.org`).
  2. Accederás al **Portal Donante**. Observa el botón superior **`+ REGISTRAR DONACIÓN`** y la tabla **"Mis Donaciones Publicadas"**.
  3. Haz clic en **`+ REGISTRAR DONACIÓN`** para abrir la pantalla [`/donar`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/donar/page.tsx).
  4. Diligencia los datos:
     * **Tipo de Alimento:** Ej. *"Frutas y Verduras Frescas (Mangos, Tomates, Papayas)"*.
     * **Cantidad:** Ej. `45` kg.
     * **Categoría:** Selecciona *"Frutas y Verduras"* o *"Panadería / Repostería"*.
     * **Requiere Refrigeración:** Marca la casilla si el alimento exige cadena de frío.
     * **Fecha y Hora Límite de Consumo:** Selecciona una fecha/hora futura válida.
       > [!WARNING]
       > **Control Normativo (`CA-01.2`):** Si seleccionas una fecha y hora anterior o igual a la hora actual, el sistema **bloqueará el registro** impidiendo publicar ofertas vencidas o sin margen de recogida.
     * **Ubicación:** Haz clic sobre el mapa de Cali para fijar el marcador en la Galería Alameda, Santa Elena o Cavasa.
  5. Presiona **"PUBLICAR OFERTA DE DONACIÓN"**.
  6. El lote quedará en estado `DISPONIBLE` y se reflejará inmediatamente en el catálogo de rescates de la red.

---

### 🛵 Workflow 2: Voluntario de Rescate (`VOLUNTARIO`)
* **Objetivo:** Reservar y transportar donaciones desde el comercio donante hasta el comedor comunitario asignado en Cali.
* **Paso a Paso:**
  1. En `/login`, ingresa como `voluntario@mesacomun.org`.
  2. En el **Portal Voluntario**, visualiza el conmutador de estado operativo (`RF-003`):
     * Puedes alternar entre **`DISPONIBLE PARA RESCATES`** y **`PAUSADO / NO DISPONIBLE`**.
  3. Haz clic en **`Ver Catálogo de Donaciones >`** para ir a [`/donaciones`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/donaciones/page.tsx).
  4. Verás las tarjetas de lotes en estado `DISPONIBLE`.
  5. En el lote deseado, presiona el botón verde **`TOMAR DONACIÓN >`**.
     * **Garantía Concurrente:** El backend ejecuta una transacción `SELECT ... FOR UPDATE`. Si otro voluntario hace clic en la misma fracción de segundo, solo uno la obtiene y el otro recibe el mensaje *"Esta donación ya fue tomada por otro transportista"*.
  6. Al confirmarse, el lote pasa a estado `ASIGNADA` y el sistema te redirige a tu **Hoja de Ruta Activa** ([`/ruta-activa`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/ruta-activa/page.tsx)).
  7. En la Hoja de Ruta verás:
     * Datos del donante y dirección de recogida con el botón azul **`Navegar con Google Maps`**.
     * Datos del comedor receptor y responsable de entrega.
     * Botón verde **`Confirmar Entrega en Sede`**.
     * Botón retro de contingencia: **`Liberar Misión (Falla Mecánica o Emergencia)`** (`RF-010`). Si tu vehículo se vara, pulsa este botón para devolver el lote a `DISPONIBLE` sin penalización y con registro en auditoría.

---

### 🍲 Workflow 3: Comedor Comunitario Aliado (`RECEPTOR`)
* **Objetivo:** Recibir alimentos para beneficiarios de sectores vulnerables (Siloé, Terrón Colorado, Aguablanca) y firmar actas de recepción con registro de mermas.
* **Paso a Paso:**
  1. En `/login`, entra como `comedor@mesacomun.org` (Comedor Siloé Esperanza).
  2. En tu portal verás la **Ficha Técnica de tu Sede**:
     * Capacidad instalada de raciones al día (ej. `250 platos`).
     * Estado del equipo de frío (`Refrigeración Activa: SÍ`).
  3. **Modalidad Recogida con Transporte Propio (`RF-009` / `RF-014`):**
     * Haz clic en **`Recogida con Transporte Propio`** para ir al catálogo.
     * En las tarjetas de donación verás el botón específico: **`RECOGIDA CON TRANSPORTE PROPIO`**.
     * Si la donación requiere frío y tu comedor tiene nevera funcional, el sistema te permite tomar el lote directamente y asignarlo a tu vehículo.
  4. **Firma Digital de Recepción y Control de Mermas (`RF-012`):**
     * Cuando una donación llega a tu sede, abre el enlace del acta [`/entregas/[id]`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/entregas/1).
     * Ingresa el nombre de quien recibe en el comedor y su documento de identidad.
     * **Registro de Descarte / Merma:** Si parte del alimento llegó magullado o no apto, ingresa los kilogramos en el campo *"Merma / Alimento descartado o no apto (kg)"* (ej. `3.2` kg).
     * Dibuja tu firma en el recuadro táctil o escribe la firma digital.
     * Pulsa **`CONFIRMAR ENTREGA FÍSICA Y FIRMAR ACTA`**.
     * El estado muta a `ENTREGADA`. Las mermas se descuentan del impacto alimentario y se auditan.

---

### 🎛️ Workflow 4: Coordinadora Operativa — Torre de Control (`COORDINADOR`)
* **Objetivo:** Monitorear el flujo logístico de toda la ciudad de Cali, coordinar donaciones huérfanas, auditar lotes expirados y autorizar nuevos miembros.
* **Paso a Paso:**
  1. En `/login`, entra como `coordinacion@mesacomun.org` (Marcela Ocampo).
  2. En la pantalla principal verás la **Torre de Control SCADA**:
     * **Radar Cartográfico:** Visualiza los nodos activos de Cali (0 mocks: si la BD está limpia muestra `0 NODOS ACTIVOS`).
     * **Filtros por Sector:** Conmuta entre `Cali`, `Centro`, `Sur`, `Norte`, `Oriente`, `Ladera` y `Cavasa`.
  3. **Gestión de Lotes Expirados:**
     * En el menú superior, pulsa **`Catálogo y Expiradas`**.
     * Tendrás acceso a la pestaña exclusiva **`Expiradas / No Rescatadas`**, donde auditas alimentos que alcanzaron su hora límite sin ser tomados, facilitando canalizarlos hacia compostaje o bancos de forraje animal según la Ley 1990.
  4. **Aprobación de Solicitudes Públicas (`/admin/usuarios`):**
     * En la barra de navegación o footer, pulsa **`Usuarios`**.
     * Accederás a la cuadrícula de datos Windows 98.
     * Las postulaciones provenientes de la Pestaña 3 aparecen con la insignia amarilla `[PENDIENTE_AUTORIZACION]`.
     * Haz clic en el botón verde **`Aprobar`** para activar la cuenta instantáneamente.
  5. **Reportes de Impacto Social y Ambiental (`/impacto`):**
     * Haz clic en **`Tablero de Impacto`**.
     * Consulta los 4 instrumentos digitales SCADA y pulsa **`Exportar Reporte CSV`** para descargar el libro mayor en formato compatible con Microsoft Excel (con BOM UTF-8).

---

### 🛡️ Workflow 5: Administrador Corporativo (`ADMIN`)
* **Objetivo:** Gestión técnica absoluta, mutación de roles RBAC, bitácora forense de auditoría y mantenimiento del sistema.
* **Paso a Paso:**
  1. En `/login`, entra como `admin@nexorescate.org`.
  2. En el portal verás la **Consola Global de Administración**.
  3. Dirígete a [`/admin/usuarios`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/admin/usuarios/page.tsx):
     * **Modificación de Roles:** El selector de roles (`<select>`) está habilitado exclusivamente para el Administrador. Puedes promover un voluntario a coordinador o viceversa.
     * **Suspensión de Cuentas:** Puedes suspender preventivamente cualquier cuenta (`[SUSPENDIDO]`), bloqueando sus credenciales de inmediato.
     * **Restablecimiento de 2FA:** Si un usuario pierde o cambia de celular, pulsa el botón **`Reset 2FA`** para reiniciar su secreto en Supabase y permitirle enrolar un nuevo dispositivo.
     * **Alta Manual:** Pulsa `+ Crear Usuario Corporativo` para registrar miembros verificados directamente.
     * **Bitácora Inmutable:** Revisa en la consola SCADA inferior los eventos registrados en `audit_rbac_eventos` con timestamp exacto.
  4. **Herramienta de Purga Total del Sistema:**
     * En caso de requerir reiniciar las pruebas a ceros antes de una presentación de grado, el Administrador dispone del botón de purga que vacía donaciones y entregas de prueba sin alterar las cuentas maestras.

---

## 5. Manual de Pantallas y Módulos Retro Windows 98 / SCADA

Todas las pantallas operativas han sido homologadas al sistema visual **Windows 98 Shell + Pantalla SCADA Industrial**, eliminando tarjetas flotantes redondeadas y aplicando controles táctiles de alto contraste ($\ge 44\text{ px}$).

### 1. `/` — Portal Corporativo y Radar Cartográfico
* **Marco:** Bisel elevado `bevel-out` `#ece9d8` con barra de título `#000080` a `#1c4a9e`.
* **Barra de Menús Retro:** Menús despegables `Archivo`, `Edición`, `Ver`, `Operaciones`, `Ayuda`.
* **Radar Cartográfico:** Capa OpenStreetMap nativa de Santiago de Cali con marcadores SVG temáticos diferenciados por color:
  * Verde: Comercios Donantes (Galerías Alameda, Porvenir, Santa Elena).
  * Azul: Comedores Comunitarios Receptores.
  * Rojo: Voluntarios en Ruta Activa.
  * Naranja: Central de Abastecimientos del Valle (Cavasa).
* **Barra de Estado:** Telemetría de conexión en vivo (`CONECTADO` / `DESCONECTADO`), contador de outbox offline y botón táctil `Salir / Cambiar Rol`.

### 2. `/donar` — Formulario Normativo de Excedentes
* **Campos:** Entradas rígidas `.retro-field` (fondo blanco con borde interior hundido).
* **Selector Geográfico:** Mini-mapa interactivo para seleccionar la coordenada exacta de recogida con latitud y longitud numéricas visibles.
* **Control de 48h:** Mensaje legal Ley 1990 de 2019 con validación en tiempo real.

### 3. `/donaciones` — Catálogo en Tiempo Real
* **Pestañas Superiores:** `Disponibles para Rescate` vs `Expiradas / No Rescatadas` (esta última visible solo para Coordinación y Admin).
* **Tarjetas de Lote:** Paneles biselados con indicadores de perecedero, kilogramos, raciones estimadas (a razón de 0.4 kg por ración) y requerimiento de cadena de frío con icono de copo de nieve azul.

### 4. `/ruta-activa` — Manifiesto de Despacho Logístico
* **Encabezado:** Indicador LED pulsante verde `● GPS / Despacho Activo`.
* **Paneles Hundidos (`bevel-in`):** Desglose detallado del punto de origen (Donante) y punto de destino (Comedor).
* **Botones Operativos:**
  * `.btn-blue`: Enlace directo que abre Google Maps con las coordenadas del trayecto.
  * `.btn-green`: Confirmación de llegada y transición al acta digital.
  * `.btn-98`: Botón de contingencia para liberar la misión en caso de imprevisto mecánico.

### 5. `/entregas/[id]` — Acta Digital de Entrega Física
* **Campos Requeridos:** Nombre del receptor, documento de identidad y campo opcional de merma en kilogramos.
* **Lienzo de Firma Digital:** Canvas táctil con botones para limpiar trazo y estampar firma en el acta electrónica.
* **Sellado:** Generación de código hash SHA-256 de integridad para el acta digital.

### 6. `/admin/usuarios` — Consola de Gobernanza RBAC
* **Barra de Herramientas:** Botones retro `.btn-98` para refrescar directorio y `.btn-green` para alta de usuarios.
* **Cuadrícula de Datos (Data Grid):** Cabeceras clásicas `#d4d0c8`, bordes visibles en cuadrícula, etiquetas de estado `[ACTIVO]`, `[PENDIENTE_AUTORIZACION]`, `[SUSPENDIDO]` e insignias de segundo factor `[🛡️ 2FA Activo]` / `[⏳ 2FA Pendiente]`.
* **Terminal SCADA:** Consola de fondo negro `#070c18` con texto verde fósforo para la inspección inmutable de eventos de auditoría.

### 7. `/impacto` — Tablero de Métricas Reales (Cálculo FAO)
* **Gauges Digitales SCADA:** 4 instrumentos de medición digital (`bevel-in-dark bg-[#05080f]`):
  * **Alimento Rescatado (kg):** Dígitos LED verdes esmeralda.
  * **Raciones Estimadas (platos):** Dígitos LED ámbar (norma 0.4 kg/plato).
  * **CO₂ Evitado (kg CO₂e):** Dígitos LED celestes (factor FAO 2.5 kg CO₂e / kg).
  * **Comedores y Red:** Dígitos LED púrpuras.
* **Libro Mayor Contable:** Tabla con el histórico de lotes cerrados con Acta Digital de Entrega o cuadro de diálogo transparente cuando el sistema inicia con 0 entregas.
* **Botón de Exportación:** Descarga instantánea de archivo CSV con BOM UTF-8 (`nexo-reporte-impacto-YYYY-MM-DD.csv`) legible en Microsoft Excel sin problemas de tildes ni caracteres especiales.

### 8. `/rastreo` — Rastreo y Trazabilidad de Custodia
* **Buscador Retro:** Entrada de texto `.retro-field` para consultar cualquier código de lote (ej. `DON-101` u `OFFLINE-DON-...`).
* **Diagrama de Bloques SCADA:** Proceso visual de 3 hitos con conectores rígidos e indicadores LED:
  * Hito 1: *Publicación por Donante*.
  * Hito 2: *Asignación y Transporte en Ruta*.
  * Hito 3: *Recepción Conforme y Firma de Acta*.
* **Terminal de Custodia:** Bitácora inmutable con sello de tiempo UTC y actor interviniente.

---

## 6. Pruebas de Resiliencia, Concurrencia y Modo Offline (PWA)

### 🧪 Prueba de Resiliencia 1: Bloqueo Pesimista en Reserva Concurrente
* **Objetivo:** Demostrar que dos voluntarios no pueden tomar la misma donación al tiempo.
* **Procedimiento:**
  1. Publica una donación con el rol `DONANTE`.
  2. Abre dos ventanas del navegador (una normal y una de incógnito).
  3. En la Ventana A, entra como `voluntario@mesacomun.org` y ve a `/donaciones`.
  4. En la Ventana B, entra a la Pestaña 1 y pulsa `Entrar como VOLUNTARIO >`, navegando a `/donaciones`.
  5. En ambas pantallas aparecerá la misma donación disponible.
  6. Presiona el botón verde **`TOMAR DONACIÓN >`** en ambas ventanas casi al mismo tiempo.
  7. **Resultado Esperado:** Una de las ventanas confirmará la asignación con éxito y abrirá `/ruta-activa`. La otra ventana mostrará el error controlado de concurrencia: *"Esta donación ya fue tomada por otro transportista"*, evitando duplicidad de viajes en Cali.

---

### 🧪 Prueba de Resiliencia 2: Modo Offline-First y Sincronización Automática (Outbox PWA)
* **Objetivo:** Demostrar que la aplicación funciona en sótanos de plazas de mercado sin señal celular (Galería Santa Elena o Alameda).
* **Procedimiento:**
  1. En `/login`, entra como `donante@mesacomun.org`.
  2. Abre las **Herramientas de Desarrollador de Chrome (F12)** -> Pestaña **Network (Red)** -> Selecciona **Offline**.
  3. Observa que en la barra de estado inferior de la aplicación el indicador cambia a: `● DESCONECTADO (MODO LOCAL)`.
  4. Ve a `/donar`, diligencia una donación y presiona **"PUBLICAR OFERTA DE DONACIÓN"**.
  5. **Resultado Esperado:** La donación **NO** se pierde ni arroja error de red. Se guarda localmente en **IndexedDB (`Dexie.js`)** con un código temporal `OFFLINE-DON-...` y el contador de la barra de estado indicará: `[Outbox: 1 pendiente]`.
  6. En DevTools, vuelve a poner la red en **Online** (o `No throttling`).
  7. **Resultado Esperado:** El Service Worker detecta el evento de reconexión, sincroniza en segundo plano la donación hacia PostgreSQL / Supabase, limpia el Outbox a `0` y la oferta aparece en el catálogo en vivo.

---

### 🧪 Prueba de Resiliencia 3: Rechazo Normativo por Hora Límite Inválida (`CA-01.2`)
* **Objetivo:** Verificar que el sistema prohíba publicar donaciones con fecha/hora límite anterior o igual al momento actual.
* **Procedimiento:**
  1. Con el rol `DONANTE`, abre [`/donar`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/donar/page.tsx).
  2. En el campo de hora límite de recogida, ingresa una hora anterior a la actual.
  3. Intenta pulsar **"PUBLICAR OFERTA DE DONACIÓN"**.
  4. **Resultado Esperado:** El formulario bloquea el envío y muestra la alerta de validación:
     > *"La hora límite de recogida debe ser una fecha y hora futura válida (posterior a la actual)."*
* **Nota de entorno local:** La pestaña de acceso rápido Sandbox en `/login` permanece oculta en producción y se habilita únicamente en entorno local con `NEXT_PUBLIC_ENABLE_DEMO_SANDBOX=true`.

---

## 7. Mapeo Técnico por Colaborador del Equipo (UAO)

Para facilitar la revisión temática de los docentes y evaluadores, a continuación se desglosa la contribución técnica y el módulo de responsabilidad principal de cada integrante del equipo:

| Colaborador | Componentes Asignados | Tareas en Tablero GitHub | Archivos Clave en el Repositorio |
|---|---|---|---|
| **Alejandro Rodríguez Cortés** | Gobernanza RBAC, Exportación CSV, Métricas FAO, Service Worker PWA | `TASK-25`, `TASK-28`, `TASK-34` | [`src/middleware.ts`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/middleware.ts)<br>[`src/app/impacto/page.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/impacto/page.tsx)<br>[`src/components/admin/MetricasDashboard.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/components/admin/MetricasDashboard.tsx)<br>[`public/sw.js`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/public/sw.js) |
| **Santiago Valencia Sandoval** | Módulo de Rastreo, Bloques SCADA, Inspector Outbox, Validación Legal | `TASK-13`, `TASK-30` | [`src/app/rastreo/page.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/rastreo/page.tsx)<br>[`src/components/rastreo/TimelineTracker.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/components/rastreo/TimelineTracker.tsx)<br>[`src/components/nexo/OutboxInspectorModal.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/components/nexo/OutboxInspectorModal.tsx) |
| **Juan Camilo Peña Sandoval** | Infraestructura CI/CD, Seguridad de Cabeceras HTTP, Iconografía PWA | `TASK-27`, `TASK-31` | [`.github/workflows/ci.yml`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/.github/workflows/ci.yml)<br>[`next.config.mjs`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/next.config.mjs)<br>[`scripts/verify-rbac-routes.mjs`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/scripts/verify-rbac-routes.mjs)<br>[`public/manifest.json`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/public/manifest.json) |
| **Felipe Charria Caicedo** | Calidad de Software, Pruebas Automatizadas Vitest, Concurrencia y DDL | `TASK-26`, `TASK-32` | [`tests/unit/cmp-05-trazabilidad-impacto.test.ts`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/tests/unit/cmp-05-trazabilidad-impacto.test.ts)<br>[`tests/unit/cmp-05-rbac-usuarios.test.ts`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/tests/unit/cmp-05-rbac-usuarios.test.ts)<br>[`tests/integration/concurrency-lock.test.ts`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/tests/integration/concurrency-lock.test.ts) |
| **Eduard Criollo Yule** | Arquitectura General, Portales por Rol, Homologación Win98/SCADA, Autenticación PBKDF2/TOTP | `TASK-33`, `TASK-34`, Cierre Integral | [`src/app/login/page.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/app/login/page.tsx)<br>[`src/lib/auth/password-totp.ts`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/lib/auth/password-totp.ts)<br>[`src/actions/usuarios-admin.ts`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/actions/usuarios-admin.ts)<br>[`src/components/nexo/WindowFrame.tsx`](file:///f:/01_Development/UAO/Proyecto_Informatico_2/nexo-rescate-alimentos/src/components/nexo/WindowFrame.tsx) |

---

## 8. Preguntas Frecuentes y Solución de Problemas (Troubleshooting)

### 1. ¿Por qué el mapa de Cali aparece inicialmente con `0 NODOS ACTIVOS`?
* **Explicación:** En estricto cumplimiento del requerimiento de auditoría de la UAO, se erradicaron el 100% de los datos simulados o fijos (*cero mocks*). El mapa solo renderiza nodos cuando existen organizaciones registradas o donaciones publicadas en la base de datos real.

### 2. ¿Cómo soluciono si el navegador mantiene en caché una versión antigua?
* Como la plataforma es una PWA con Service Worker, si realizas cambios y no los ves de inmediato, abre las DevTools (F12) -> pestaña **Application** -> selecciona **Storage** en el menú izquierdo y pulsa **Clear site data**. Luego recarga con `Ctrl + F5`.

### 3. ¿Qué hago si una cuenta creada en la Pestaña 3 no puede iniciar sesión?
* Revisa que la cuenta haya sido aprobada. Al registrarse en la Pestaña 3, la cuenta queda en `PENDIENTE_AUTORIZACION`. Inicia sesión como `coordinacion@mesacomun.org` o `admin@nexorescate.org`, ve a `/admin/usuarios` y haz clic en el botón verde **`Aprobar`**.

### 4. ¿Cómo ejecuto todas las pruebas automatizadas en mi máquina local?
```bash
# Ejecutar la suite completa de 110 pruebas unitarias e integración
npm test -- --run

# Chequear tipado estricto TypeScript
npx tsc --noEmit

# Compilar para producción local
npm run build
```

---
*Documentación técnica generada por Nexo Cívico Studio — Cali, Valle del Cauca, Colombia.*
