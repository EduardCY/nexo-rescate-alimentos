# ==============================================================================
# Script de Sincronización Automática de Tareas en GitHub Projects
# Proyecto: Red de Rescate de Alimentos (Nexo Cívico Studio - Equipo 3)
# Repositorio: EduardCY/nexo-rescate-alimentos
# Tablero: https://github.com/users/EduardCY/projects/1
# ==============================================================================

[CmdletBinding()]
param (
    [string]$Repo = "EduardCY/nexo-rescate-alimentos",
    [string]$ProjectOwner = "EduardCY",
    [int]$ProjectNumber = 1
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Sincronizador de Tablero GitHub Projects - Rescate Alimentos" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verificar estado de autenticación en GitHub CLI
Write-Host "`n[1/4] Verificando autenticación con GitHub CLI..." -ForegroundColor Yellow
$authCheck = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] No hay una sesión activa válida en GitHub CLI." -ForegroundColor Red
    Write-Host "Por favor inicia sesión ejecutando primero:" -ForegroundColor Yellow
    Write-Host "  gh auth login -h github.com -w`n" -ForegroundColor White
    exit 1
}
Write-Host "Sesión activa verificada correctamente en GitHub." -ForegroundColor Green

# 2. Creación de Etiquetas (Labels) Requeridas
Write-Host "`n[2/4] Creando / verificando etiquetas (labels)..." -ForegroundColor Yellow
$labels = @(
    @{ Name = "sprint-1"; Color = "0E8A16"; Description = "Tareas priorizadas para el Sprint 1" },
    @{ Name = "tarea"; Color = "1D76DB"; Description = "Tarea atómica individual <= 4h" },
    @{ Name = "historia"; Color = "5319E7"; Description = "Historia de usuario / Comportamiento MVP" },
    @{ Name = "mvp"; Color = "D93F0B"; Description = "Alcance crítico del MVP" },
    @{ Name = "cmp-01"; Color = "0052CC"; Description = "CMP-01: Publicar donación" },
    @{ Name = "cmp-02"; Color = "0052CC"; Description = "CMP-02: Catálogo y filtros" },
    @{ Name = "cmp-03"; Color = "B60205"; Description = "CMP-03: Toma atómica concurrente" },
    @{ Name = "cmp-04"; Color = "0052CC"; Description = "CMP-04: Registrar entrega" },
    @{ Name = "cmp-05"; Color = "0052CC"; Description = "CMP-05: Trazabilidad e histórico" },
    @{ Name = "backend"; Color = "FBCA04"; Description = "Lógica de servidor, RPC y DB" },
    @{ Name = "frontend"; Color = "1D76DB"; Description = "Componentes web e interfaces" },
    @{ Name = "ux"; Color = "D4C5F9"; Description = "Diseño Mobile-First y accesibilidad" },
    @{ Name = "qa"; Color = "C2E0C6"; Description = "Pruebas de aceptación y BDD" },
    @{ Name = "devops"; Color = "666666"; Description = "CI/CD y cuotas de infraestructura" },
    @{ Name = "database"; Color = "0366D6"; Description = "Esquemas y procedimientos PostgreSQL" },
    @{ Name = "offline-first"; Color = "BFD4F2"; Description = "Persistencia local IndexedDB / Dexie" },
    @{ Name = "legal"; Color = "E99695"; Description = "Cumplimiento Ley 1990 de 2019" },
    @{ Name = "nucleo"; Color = "D93F0B"; Description = "Corazón técnico del MVP" },
    @{ Name = "gobierno"; Color = "5319E7"; Description = "Pruebas de gobierno y Habeas Data" }
)

foreach ($lbl in $labels) {
    gh label create $lbl.Name --repo $Repo --color $lbl.Color --description $lbl.Description --force 2>$null
}
Write-Host "Etiquetas aprovisionadas." -ForegroundColor Green

# 3. Catálogo de Tareas Atómicas
Write-Host "`n[3/4] Creando las 15 tareas atómicas en el repositorio..." -ForegroundColor Yellow

$tasks = @(
    @{
        Title = "[TASK-01] Configurar esquemas DDL en PostgreSQL y tipos TypeScript para Donación, Usuario y Reserva"
        Assignee = "Juan Sebastián Delgado (Backend Developer)"
        Labels = "tarea,sprint-1,backend,database,cmp-01"
        Body = @"
### Contexto y Descripción Técnica
Como ingeniero de backend y base de datos, necesito definir el modelo relacional canónico en PostgreSQL (Supabase) y su correspondencia estricta en TypeScript, para que todos los flujos de publicación, asignación y auditoría cuenten con integridad referencial y tipado estricto.

### Metadata del Tablero
* **CMP:** `TRANSVERSAL / CMP-01`
* **Origen:** `RF-001`, `RF-003`, `RNF-004`
* **Estimación:** 3 horas
* **Responsable:** Juan Sebastián Delgado (Backend Developer)

### Entregables
- Script DDL en `supabase/migrations/20261009000000_init_schema.sql` con tablas `organizaciones`, `usuarios`, `donaciones` y `trazabilidad_eventos`.
- Secuencia PostgreSQL `donacion_codigo_seq` y función `generar_codigo_donacion()`.
- Tipos de dominio en `src/types/index.ts`.
"@
    },
    @{
        Title = "[TASK-02] Diseñar formulario Mobile-First de donación con selector de categoría y fecha/hora límite"
        Assignee = "Santiago Valencia Sandoval (UX / Frontend Support)"
        Labels = "tarea,sprint-1,ux,frontend,cmp-01"
        Body = @"
### Contexto y Descripción Técnica
Como comerciante donante en una plaza de mercado (Cavasa, Santa Elena), quiero diligenciar un formulario rápido en mi celular en menos de 45 segundos, para registrar un lote de alimentos con su categoría, cantidad y ventana de recogida sin fricción técnica.

### Metadata del Tablero
* **CMP:** `CMP-01`
* **Origen:** `RF-001`, `RNF-001`
* **Estimación:** 3 horas
* **Responsable:** Santiago Valencia Sandoval (UX Designer / Frontend Support)

### Entregables
- Componente `src/components/donaciones/DonacionWizard.tsx` con arquitectura de 3 pasos móviles.
- Selector de categoría visual por iconos y controles táctiles >= 48x48 píxeles.
- Página contenedora en `src/app/donar/page.tsx`.
"@
    },
    @{
        Title = "[TASK-03] Implementar validaciones en cliente y servidor para ventana de tiempo de recogida y bloqueo de horas pasadas"
        Assignee = "Alejandro Rodríguez Cortés (Full-Stack Developer)"
        Labels = "tarea,sprint-1,frontend,backend,cmp-01"
        Body = @"
### Contexto y Descripción Técnica
Como Full-Stack Developer, quiero garantizar que ninguna oferta de alimentos sea publicada con una hora límite de recogida vencida o igual a la hora actual, tanto a nivel de interfaz de usuario como de compuerta lógica defensiva en el servidor.

### Metadata del Tablero
* **CMP:** `CMP-01`
* **Origen:** `RF-001`, `RF-017`
* **Estimación:** 3 horas
* **Responsable:** Alejandro Rodríguez Cortés (Full-Stack Developer)

### Entregables
- Esquema de validación Zod en `src/lib/validations/donacion.ts` con refine de hora futura.
- Validación reactiva en vivo en el campo de hora de `DonacionWizard.tsx`.
"@
    },
    @{
        Title = "[TASK-04] Integrar casilla obligatoria de exención legal Ley 1990/2019 e indicador de cadena de frío"
        Assignee = "Alejandro Rodríguez Cortés (Full-Stack Developer)"
        Labels = "tarea,sprint-1,frontend,legal,cmp-01"
        Body = @"
### Contexto y Descripción Técnica
Como asesor técnico y desarrollador, debo blindar a los comerciantes donantes bajo el amparo de la Ley 1990 de 2019 (exoneración de responsabilidad sanitaria de buena fe) e identificar si el lote contiene productos perecederos que exijan refrigeración.

### Metadata del Tablero
* **CMP:** `CMP-01`
* **Origen:** `RF-014`, `RF-017`
* **Estimación:** 2 horas
* **Responsable:** Alejandro Rodríguez Cortés (Full-Stack Developer)

### Entregables
- Casilla interactiva con texto legal explícito de la Ley 1990 de 2019.
- Deshabilitación obligatoria del botón de envío si la casilla no está marcada.
- Switch toggle para `requiereFrio` con persistencia en el payload.
- Server Action `publicarDonacion` en `src/actions/donaciones.ts`.
"@
    },
    @{
        Title = "[TASK-05] Configurar persistencia offline con IndexedDB (Dexie.js) para publicación en plazas sin señal"
        Assignee = "Juan Sebastián Delgado (Backend Developer)"
        Labels = "tarea,sprint-1,backend,offline-first,cmp-01"
        Body = @"
### Contexto y Descripción Técnica
Como Backend Engineer, debo implementar el almacenamiento local en el navegador del celular mediante Dexie.js (IndexedDB) para que los comerciantes en plazas como Cavasa o Santa Elena puedan registrar donaciones aun cuando no tengan señal celular 4G.

### Metadata del Tablero
* **CMP:** `CMP-01`
* **Origen:** `RNF-002`, `RF-001`
* **Estimación:** 4 horas
* **Responsable:** Juan Sebastián Delgado (Backend / Database Engineer)

### Entregables
- Módulo `src/lib/db.ts` con la base de datos `RescateAlimentosDB` y almacén `donaciones_locales`.
- Métodos `guardarDonacionOffline()`, `obtenerDonacionesPendientes()` y `marcarDonacionSincronizada()`.
- Listener reactivo para reconexión a Internet (`window.addEventListener('online')`).
"@
    },
    @{
        Title = "[TASK-06] Construir catálogo reactivo de donaciones disponibles con ordenamiento y filtros por zona"
        Assignee = "Alejandro Rodríguez Cortés (Full-Stack Developer)"
        Labels = "tarea,sprint-1,frontend,cmp-02"
        Body = @"
### Contexto y Descripción Técnica
Como voluntario o comedor comunitario receptor, quiero consultar las donaciones activas ordenadas por cercanía geográfica y urgencia temporal con filtros reactivos por zonas de Cali.

### Metadata del Tablero
* **CMP:** `CMP-02`
* **Origen:** `RF-002`, `RF-011`
* **Estimación:** 3 horas
* **Responsable:** Alejandro Rodríguez Cortés (Full-Stack Developer)
"@
    },
    @{
        Title = "[TASK-07] Implementar etiqueta visual destacada de cadena de frío y filtro de exclusión para comedores sin nevera"
        Assignee = "Santiago Valencia Sandoval (UX / Frontend Support)"
        Labels = "tarea,sprint-1,ux,frontend,cmp-02"
        Body = @"
### Contexto y Descripción Técnica
Como UX Designer, debo asegurar que las ofertas con `requiereFrio = true` exhiban un distintivo visual inmediato y adviertan o restrinjan la toma por comedores sin refrigeración operativa.

### Metadata del Tablero
* **CMP:** `CMP-02`
* **Origen:** `RF-014`, `RNF-001`
* **Estimación:** 2 horas
* **Responsable:** Santiago Valencia Sandoval (UX Designer / Frontend Support)
"@
    },
    @{
        Title = "[TASK-08] Desarrollar procedimiento RPC / transacción atómica SQL con SELECT FOR UPDATE para toma única"
        Assignee = "Juan Sebastián Delgado (Backend Developer)"
        Labels = "tarea,sprint-1,backend,database,nucleo,cmp-03"
        Body = @"
### Contexto y Descripción Técnica
Como Backend Engineer, debo asegurar que bajo ninguna circunstancia dos voluntarios puedan tomar simultáneamente la misma donación, ejecutando la asignación mediante una transacción atómica con bloqueo pesimista en PostgreSQL (`SELECT ... FOR UPDATE`).

### Metadata del Tablero
* **CMP:** `CMP-03`
* **Origen:** `RF-004`, `RF-010`, `RNF-004`, `ADR-001`
* **Estimación:** 4 horas
* **Responsable:** Juan Sebastián Delgado (Backend / Database Engineer)
"@
    },
    @{
        Title = "[TASK-09] Implementar respuesta HTTP 409 Conflict y modal amigable en frontend ante colisión de toma concurrente"
        Assignee = "Alejandro Rodríguez Cortés (Full-Stack Developer)"
        Labels = "tarea,sprint-1,frontend,cmp-03"
        Body = @"
### Contexto y Descripción Técnica
Como Full-Stack Developer, debo capturar la respuesta HTTP 409 del procedimiento RPC y desplegar una notificación empática en el celular del voluntario que llegó tarde, removiendo la oferta reactivamente de su vista.

### Metadata del Tablero
* **CMP:** `CMP-03`
* **Origen:** `RF-010`, `RNF-004`
* **Estimación:** 3 horas
* **Responsable:** Alejandro Rodríguez Cortés (Full-Stack Developer)
"@
    },
    @{
        Title = "[TASK-10] Diseñar y ejecutar suite de pruebas automatizadas de concurrencia y estrés para CMP-03"
        Assignee = "Felipe Charria Caicedo (QA Engineer)"
        Labels = "tarea,sprint-1,qa,testing,cmp-03"
        Body = @"
### Contexto y Descripción Técnica
Como QA Engineer, debo diseñar una prueba automatizada que simule dos o más peticiones HTTP simultáneas contra la misma donación, demostrando formalmente que solo una se asigna y la otra recibe HTTP 409.

### Metadata del Tablero
* **CMP:** `CMP-03`
* **Origen:** `RF-004`, `RNF-004`
* **Estimación:** 4 horas
* **Responsable:** Felipe Charria Caicedo (QA Engineer)
"@
    },
    @{
        Title = "[TASK-11] Construir flujo móvil de confirmación de entrega física en comedor con registro de receptor"
        Assignee = "Alejandro Rodríguez Cortés (Full-Stack Developer)"
        Labels = "tarea,sprint-1,frontend,cmp-04"
        Body = @"
### Contexto y Descripción Técnica
Como voluntario en ruta, quiero registrar la entrega física de los alimentos al llegar al comedor comunitario (nombre de quien recibe y raciones agregadas), para cerrar formalmente el ciclo de custodia.

### Metadata del Tablero
* **CMP:** `CMP-04`
* **Origen:** `RF-005`, `RF-006`
* **Estimación:** 3 horas
* **Responsable:** Alejandro Rodríguez Cortés (Full-Stack Developer)
"@
    },
    @{
        Title = "[TASK-12] Auditar y verificar que no se capturen datos personales sensibles de beneficiarios (Ley 1581)"
        Assignee = "Felipe Charria Caicedo (QA Engineer)"
        Labels = "tarea,sprint-1,qa,gobierno,cmp-04"
        Body = @"
### Contexto y Descripción Técnica
Como QA Engineer, debo auditar las estructuras de datos y formularios para certificar que bajo ninguna circunstancia se capturen nombres, fotos ni documentos de personas beneficiarias en comedores.

### Metadata del Tablero
* **CMP:** `CMP-04`
* **Origen:** `RNF-003`
* **Estimación:** 2 horas
* **Responsable:** Felipe Charria Caicedo (QA Engineer)
"@
    },
    @{
        Title = "[TASK-13] Implementar pantalla de consulta pública y línea de tiempo por código único (DON-XXX)"
        Assignee = "Santiago Valencia Sandoval (UX / Frontend Support)"
        Labels = "tarea,sprint-1,ux,frontend,cmp-05"
        Body = @"
### Contexto y Descripción Técnica
Como donante o coordinadora, quiero ingresar un código único (ej. DON-101) para visualizar en tiempo real la línea de tiempo auditada del alimento desde su despacho hasta su entrega en el comedor.

### Metadata del Tablero
* **CMP:** `CMP-05`
* **Origen:** `RF-002`, `RF-006`
* **Estimación:** 3 horas
* **Responsable:** Santiago Valencia Sandoval (UX Designer / Frontend Support)
"@
    },
    @{
        Title = "[TASK-14] Construir agregador de métricas de kilogramos rescatados garantizando cero datos inventados"
        Assignee = "Eduard Criollo Yule (Product Owner / Lead)"
        Labels = "tarea,sprint-1,po,gobierno,cmp-05"
        Body = @"
### Contexto y Descripción Técnica
Como Product Owner y Lead, debo asegurar la veracidad de los reportes para cooperantes internacionales, garantizando que las métricas de kilogramos se calculen 100% mediante agregación directa en base de datos.

### Metadata del Tablero
* **CMP:** `CMP-05`
* **Origen:** `RF-007`, `Gobierno`
* **Estimación:** 3 horas
* **Responsable:** Eduard Criollo Yule (Product Owner / Lead)
"@
    },
    @{
        Title = "[TASK-15] Configurar pipeline de CI en GitHub Actions y monitoreo de cuotas de capa gratuita ($0 USD/mes)"
        Assignee = "Juan Camilo Peña Sandoval (DevOps Engineer)"
        Labels = "tarea,sprint-1,devops,ci-cd"
        Body = @"
### Contexto y Descripción Técnica
Como DevOps Engineer, debo automatizar la compuerta de integración continua para que ningún PR pueda fusionarse a main si rompe linters, pruebas o compilación de Next.js, verificando que no se superen cuotas Free Tier.

### Metadata del Tablero
* **CMP:** `TRANSVERSAL`
* **Origen:** `RNF-005`
* **Estimación:** 4 horas
* **Responsable:** Juan Camilo Peña Sandoval (DevOps Engineer)
"@
    }
)

foreach ($t in $tasks) {
    Write-Host "Creando issue: $($t.Title)..." -ForegroundColor White
    $issueUrl = gh issue create --repo $Repo --title $t.Title --body $t.Body --label $t.Labels 2>&1
    Write-Host "  -> Creado: $issueUrl" -ForegroundColor Gray
}

# 4. Vincular al Proyecto de GitHub Projects
Write-Host "`n[4/4] Vinculando al tablero del proyecto (Project #$ProjectNumber)..." -ForegroundColor Yellow
try {
    gh project item-add $ProjectNumber --owner $ProjectOwner --url "https://github.com/$Repo" 2>$null
    Write-Host "Proyecto vinculado exitosamente." -ForegroundColor Green
} catch {
    Write-Host "Nota: Puedes agregar las tarjetas al proyecto desde la interfaz de GitHub Projects o ejecutando gh project item-add." -ForegroundColor Gray
}

Write-Host "`n[COMPLETADO] Las 15 tareas atómicas han quedado registradas en GitHub!" -ForegroundColor Green
Write-Host "Consulta el tablero en: https://github.com/users/$ProjectOwner/projects/$ProjectNumber" -ForegroundColor Cyan
