import { NextResponse, type NextRequest } from 'next/server';
import {
  puedeAccederRuta,
  type EstadoCuenta,
  type RolCorporativo,
} from '@/lib/rbac/permisos';

const ROLES_VALIDOS: readonly RolCorporativo[] = [
  'ADMIN',
  'COORDINADOR',
  'VOLUNTARIO',
  'DONANTE',
  'RECEPTOR',
];

const ESTADOS_VALIDOS: readonly EstadoCuenta[] = [
  'ACTIVO',
  'SUSPENDIDO',
  'PENDIENTE_AUTORIZACION',
];

/**
 * Middleware de borde (Edge) para Gobernanza RBAC y Confinamiento de Rutas (CMP-05 / TASK-25 / CA-05.1).
 *
 * ¿Por qué?: Garantiza en la capa de enrutamiento de Next.js que las rutas administrativas (`/admin/*`),
 * de reportes globales (`/impacto`) y de configuración (`/configuracion`) evalúen el rol corporativo
 * antes de servir datos sensibles, bloqueando intentos de escalada del rol VOLUNTARIO o cuentas suspendidas.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cookieRol = request.cookies.get('nexo_rol')?.value;
  const headerRol = request.headers.get('x-nexo-rol');
  const rawRol = (headerRol || cookieRol || '').toUpperCase();

  const cookieEstado = request.cookies.get('nexo_estado_cuenta')?.value;
  const headerEstado = request.headers.get('x-nexo-estado-cuenta');
  const rawEstado = (headerEstado || cookieEstado || 'ACTIVO').toUpperCase();

  const rol: RolCorporativo | null = (ROLES_VALIDOS as readonly string[]).includes(rawRol)
    ? (rawRol as RolCorporativo)
    : null;

  const estadoCuenta: EstadoCuenta = (ESTADOS_VALIDOS as readonly string[]).includes(rawEstado)
    ? (rawEstado as EstadoCuenta)
    : 'ACTIVO';

  // Si existe un rol explícito en cookie/header y no tiene permiso sobre la ruta solicitada:
  if (rol && !puedeAccederRuta(rol, pathname, estadoCuenta)) {
    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json')) {
      return NextResponse.json(
        {
          exito: false,
          codigo: 403,
          mensaje: `Acceso denegado (CA-05.1): El rol ${rol} no tiene autorización para acceder a ${pathname}.`,
        },
        { status: 403 }
      );
    }

    const response = NextResponse.next();
    response.headers.set('x-nexo-rbac-status', '403');
    response.headers.set('x-nexo-rbac-denied-role', rol);
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('x-nexo-rbac-status', '200');
  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/impacto/:path*',
    '/configuracion/:path*',
  ],
};
