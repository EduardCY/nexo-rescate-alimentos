#!/usr/bin/env node

/**
 * Script de Verificación Estática de Gobernanza RBAC y Rutas Protegidas (TASK-27 / CMP-05 / RNF-003).
 *
 * ¿Por qué?: Ejecutado en el pipeline de GitHub Actions CI para garantizar que ninguna rama pueda
 * fusionarse a `main` si elimina las guardas de rol en `src/middleware.ts`, `src/lib/rbac/permisos.ts`,
 * `src/actions/usuarios-admin.ts` o las páginas administrativas (`/admin/usuarios` e `/impacto`).
 */

import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errores = [];

function verificarArchivoContiene(rutaRelativa, patronesRequeridos) {
  const rutaAbsoluta = path.join(rootDir, rutaRelativa);
  if (!fs.existsSync(rutaAbsoluta)) {
    errores.push(`[FALTA ARCHIVO] No existe el archivo crítico RBAC: ${rutaRelativa}`);
    return;
  }

  const contenido = fs.readFileSync(rutaAbsoluta, 'utf8');
  for (const patron of patronesRequeridos) {
    if (typeof patron === 'string') {
      if (!contenido.includes(patron)) {
        errores.push(
          `[FALTA CONTROL] El archivo ${rutaRelativa} no contiene la cláusula requerida: "${patron}"`
        );
      }
    } else if (patron instanceof RegExp) {
      if (!patron.test(contenido)) {
        errores.push(
          `[FALTA PATRÓN] El archivo ${rutaRelativa} no cumple la expresión requerida: ${patron}`
        );
      }
    }
  }
}

// 1. Verificar motor puro de permisos RBAC
verificarArchivoContiene('src/lib/rbac/permisos.ts', [
  'RUTAS_OPERATIVAS_VOLUNTARIO',
  'RUTAS_ADMINISTRATIVAS_EXCLUSIVAS',
  'export function tienePermiso',
  'export function puedeAccederRuta',
  "rol === 'VOLUNTARIO'",
  "rol === 'ADMIN'",
]);

// 2. Verificar Middleware de Next.js
verificarArchivoContiene('src/middleware.ts', [
  'puedeAccederRuta',
  '/admin/:path*',
  '/impacto/:path*',
  '403',
]);

// 3. Verificar Server Actions administrativas
verificarArchivoContiene('src/actions/usuarios-admin.ts', [
  'verificarActorAdmin',
  "actor.rol !== 'ADMIN'",
  '403',
  'cambiarEstadoCuentaUsuario',
]);

// 4. Verificar Guardas en Vistas Administrativas y de Impacto
verificarArchivoContiene('src/app/admin/usuarios/page.tsx', [
  'puedeAccederRuta',
  'RoleGuardBanner',
]);

verificarArchivoContiene('src/app/impacto/page.tsx', [
  'puedeAccederRuta',
  'RoleGuardBanner',
]);

if (errores.length > 0) {
  process.stderr.write(
    `\n❌ FALLO EN AUDITORÍA DE RUTAS RBAC (${errores.length} problemas detectados):\n`
  );
  for (const err of errores) {
    process.stderr.write(`  - ${err}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  '✅ [RBAC OK] Todas las rutas administrativas (/admin/*, /impacto), Server Actions y Middleware cumplen RNF-003 y CMP-05.\n'
);
process.exit(0);
