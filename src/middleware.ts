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
 * Middleware Zero-Trust Edge para Puerta de Entrada Obligatoria y Gobernanza RBAC (CMP-05 / TASK-25 / CA-05.1).
 *
 * ¿Por qué?: En un sistema corporativo (EatCloud / Fundación Mesa Común), ningún usuario anónimo
 * puede ver ni operar el catálogo de rescates, registrar comedores ni tomar donaciones.
 * Cualquier petición no autenticada es redirigida a `/login`. Asimismo, las cuentas en estado
 * PENDIENTE_AUTORIZACION o SUSPENDIDO no pueden acceder al tablero operativo.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas exentas de autenticación
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/icons') ||
    pathname === '/~offline'
  ) {
    return NextResponse.next();
  }

  const cookieRol = request.cookies.get('nexo_rol')?.value;
  const headerRol = request.headers.get('x-nexo-rol');
  const rawRol = (headerRol || cookieRol || '').toUpperCase();

  const cookieEstado = request.cookies.get('nexo_estado_cuenta')?.value || request.cookies.get('nexo_estado')?.value;
  const headerEstado = request.headers.get('x-nexo-estado-cuenta');
  const rawEstado = (headerEstado || cookieEstado || '').toUpperCase();

  const rol: RolCorporativo | null = (ROLES_VALIDOS as readonly string[]).includes(rawRol)
    ? (rawRol as RolCorporativo)
    : null;

  const estadoCuenta: EstadoCuenta = (ESTADOS_VALIDOS as readonly string[]).includes(rawEstado)
    ? (rawEstado as EstadoCuenta)
    : 'ACTIVO';

  // 1. Zero-Trust Auth Gate: Si no está autenticado, redirigir a /login
  if (!rol) {
    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json')) {
      return NextResponse.json(
        {
          exito: false,
          codigo: 401,
          mensaje: 'Autenticación corporativa requerida. Redirigiendo a /login.',
        },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Control de estado de cuenta: Si no está ACTIVO (ej. PENDIENTE_AUTORIZACION o SUSPENDIDO)
  if (estadoCuenta !== 'ACTIVO') {
    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json')) {
      return NextResponse.json(
        {
          exito: false,
          codigo: 403,
          mensaje: `Cuenta ${estadoCuenta}. Acceso restringido hasta aprobación por Coordinación Operativa.`,
        },
        { status: 403 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('estado', estadoCuenta.toLowerCase());
    return NextResponse.redirect(loginUrl);
  }

  // 3. Matriz RBAC: Verificar si el rol tiene autorización para la ruta
  if (!puedeAccederRuta(rol, pathname, estadoCuenta)) {
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

    // Si intenta entrar a /admin/:path* o /impacto/:path* sin permiso:
    const deniedUrl = new URL('/', request.url);
    deniedUrl.searchParams.set('denegado', '1');
    deniedUrl.searchParams.set('rol', rol);
    const response = NextResponse.redirect(deniedUrl);
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
    /*
     * Cobertura total de rutas operativas con exclusión de assets estáticos y login
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)',
    '/admin/:path*',
    '/impacto/:path*',
    '/configuracion/:path*',
  ],
};
