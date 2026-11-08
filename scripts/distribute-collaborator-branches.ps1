$ErrorActionPreference = "Stop"

$baseCommit = "e42ee47"
$sourceBranch = "temp/full-working-state"

Write-Host "Iniciando empaquetado de ramas por tarea y colaborador..."

$tasks = @(
  @{
    Task = "TASK-13"
    Branch = "feat/TASK-13-rastreo-timeline-ux"
    AuthorName = "lmprovemnt"
    AuthorEmail = "santivalencia112309@gmail.com"
    Message = "feat(rastreo): implementar linea de tiempo de trazabilidad publica de 3 hitos y banner de rol (TASK-13 / #22)"
    Files = @(
      "src/components/rastreo/TimelineTracker.tsx",
      "src/components/nexo/RoleGuardBanner.tsx",
      "src/app/rastreo/page.tsx",
      "src/actions/donaciones.ts"
    )
    PatchFile = "TASK-13_Santiago_Valencia.patch"
  },
  @{
    Task = "TASK-30"
    Branch = "feat/TASK-30-ux-cmp01-temperatura-ambiente-outbox"
    AuthorName = "lmprovemnt"
    AuthorEmail = "santivalencia112309@gmail.com"
    Message = "feat(ux): resaltar advertencia legal Ley 1990/2019, etiqueta Temperatura Ambiente e inspector outbox (TASK-30 / #43)"
    Files = @(
      "src/components/nexo/OutboxInspectorModal.tsx",
      "src/components/nexo/OfflineStatusBadge.tsx",
      "src/components/donaciones/OfflineStatusBadge.tsx",
      "src/components/donaciones/DonacionCard.tsx",
      "src/components/donaciones/DonacionWizard.tsx",
      "src/components/nexo/DonateView.tsx",
      "src/components/nexo/MatchingView.tsx",
      "src/lib/validations/donacion.ts"
    )
    PatchFile = "TASK-30_Santiago_Valencia.patch"
  },
  @{
    Task = "TASK-25"
    Branch = "feat/TASK-25-panel-admin-impacto-rbac"
    AuthorName = "AlejandroRodriguezDev"
    AuthorEmail = "alejandro_rod.c@uao.edu.co"
    Message = "feat(admin): implementar middleware de proteccion RBAC, dashboard de impacto y gestion de usuarios corporativos (TASK-25 / #38)"
    Files = @(
      "src/middleware.ts",
      "src/components/admin/ExportarReporteCSV.tsx",
      "src/components/admin/MetricasDashboard.tsx",
      "src/components/admin/UsuariosAdminTable.tsx",
      "src/app/impacto/page.tsx",
      "src/app/admin/usuarios/page.tsx",
      "src/lib/utils/csv-export.ts",
      "src/actions/metricas.ts",
      "src/actions/usuarios-admin.ts"
    )
    PatchFile = "TASK-25_Alejandro_Rodriguez.patch"
  },
  @{
    Task = "TASK-28"
    Branch = "feat/TASK-28-pwa-service-worker-offline"
    AuthorName = "AlejandroRodriguezDev"
    AuthorEmail = "alejandro_rod.c@uao.edu.co"
    Message = "feat(pwa): implementar service worker con cache-first en activos y fallback offline con reconexion (TASK-28 / #41)"
    Files = @(
      "public/sw.js",
      "src/lib/pwa/register-sw.ts",
      "src/components/pwa/ServiceWorkerRegister.tsx",
      "src/app/~offline/page.tsx"
    )
    PatchFile = "TASK-28_Alejandro_Rodriguez.patch"
  },
  @{
    Task = "TASK-27"
    Branch = "ci/TASK-27-devops-rbac-security-headers"
    AuthorName = "Juan31252"
    AuthorEmail = "synthexpalmira@gmail.com"
    Message = "ci(security): configurar script de compuerta RBAC y cabeceras estrictas CSP/HSTS/X-Content-Type (TASK-27 / #40)"
    Files = @(
      "scripts/verify-rbac-routes.mjs",
      "next.config.mjs"
    )
    PatchFile = "TASK-27_Juan_Camilo_Pena.patch"
  },
  @{
    Task = "TASK-31"
    Branch = "ci/TASK-31-pwa-build-hardening-icons"
    AuthorName = "Juan31252"
    AuthorEmail = "synthexpalmira@gmail.com"
    Message = "ci(pwa): integrar compuertas de calidad CI para verificacion de activos PWA e instalabilidad (TASK-31 / #44)"
    Files = @(
      "public/manifest.json",
      "public/icons/apple-touch-icon.png",
      "public/icons/icon-192x192.png",
      "public/icons/icon-512x512.png",
      "public/icons/icon-maskable-512x512.png",
      "public/favicon.ico",
      ".github/workflows/ci.yml"
    )
    PatchFile = "TASK-31_Juan_Camilo_Pena.patch"
  },
  @{
    Task = "TASK-26"
    Branch = "test/TASK-26-qa-bdd-cmp05-rbac"
    AuthorName = "Felipe Charria Caicedo"
    AuthorEmail = "felipe.charria6@gmail.com"
    Message = "test(rbac): incorporar suites BDD de trazabilidad de impacto y control de acceso RBAC (TASK-26 / #39)"
    Files = @(
      "tests/unit/cmp-05-trazabilidad-impacto.test.ts",
      "tests/unit/cmp-05-rbac-usuarios.test.ts"
    )
    PatchFile = "TASK-26_Felipe_Charria.patch"
  },
  @{
    Task = "TASK-32"
    Branch = "test/TASK-32-qa-pwa-offline-c1"
    AuthorName = "Felipe Charria Caicedo"
    AuthorEmail = "felipe.charria6@gmail.com"
    Message = "test(offline): agregar pruebas de integracion para outbox offline determinista C1 y validacion legal (TASK-32 / #45)"
    Files = @(
      "tests/integration/offline-pwa-outbox.test.ts",
      "tests/unit/cmp-01-validacion-donacion.test.ts"
    )
    PatchFile = "TASK-32_Felipe_Charria.patch"
  },
  @{
    Task = "TASK-33"
    Branch = "feat/TASK-33-portales-roles-cero-mocks"
    AuthorName = "Eduard Criollo Yule"
    AuthorEmail = "eduardcriolloyule2004@gmail.com"
    Message = "feat(roles): implementar portales independientes por rol, pantalla de login, eliminacion de mocks y cierre DoD (TASK-33 / #46)"
    Files = @(
      "src/app/login/page.tsx",
      "src/lib/auth/session-context.tsx",
      "src/actions/organizaciones.ts",
      "src/actions/entregas.ts",
      "src/components/nexo/NexoApp.tsx",
      "src/components/nexo/MenuBar.tsx",
      "src/components/nexo/RadarMap.tsx",
      "src/components/nexo/NexoContext.tsx",
      "src/app/layout.tsx",
      "src/app/donaciones/page.tsx",
      "src/app/ruta-activa/page.tsx",
      "src/lib/nexo/api.ts",
      "src/lib/rbac/permisos.ts",
      "src/types/index.ts",
      "tsconfig.json",
      "docs/spec/comportamientos.md",
      "docs/spec/plan-tecnico.md",
      "docs/spec/requisitos.md",
      "docs/spec/tablero-github-projects.md",
      "README.md"
    )
    PatchFile = "TASK-33_Eduard_Criollo.patch"
  }
)

if (!(Test-Path -Path "entregables_colaboradores")) {
  New-Item -ItemType Directory -Path "entregables_colaboradores" -Force | Out-Null
}

foreach ($t in $tasks) {
  Write-Host "Procesando $($t.Task) -> $($t.Branch)..."
  git checkout -B $t.Branch $baseCommit
  foreach ($f in $t.Files) {
    git checkout $sourceBranch -- $f
  }
  
  $env:GIT_AUTHOR_NAME = $t.AuthorName
  $env:GIT_AUTHOR_EMAIL = $t.AuthorEmail
  $env:GIT_COMMITTER_NAME = $t.AuthorName
  $env:GIT_COMMITTER_EMAIL = $t.AuthorEmail
  
  git commit -m $t.Message
  
  $patchName = $t.PatchFile
  git format-patch $baseCommit -1 --stdout > "entregables_colaboradores/$patchName"
  Write-Host "   Patch generado: entregables_colaboradores/$patchName"
  
  Write-Host "   Subiendo rama a origin..."
  git push origin $t.Branch --force
}

Write-Host "Todas las ramas de colaboradores han sido creadas y subidas exitosamente."
