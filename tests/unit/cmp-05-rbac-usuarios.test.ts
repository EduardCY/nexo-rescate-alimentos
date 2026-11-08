// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { puedeAccederRuta, tienePermiso } from '@/lib/rbac/permisos';
import {
  crearUsuarioCorporativo,
  actualizarRolUsuario,
  cambiarEstadoCuentaUsuario,
  listarEventosAuditoriaRBAC,
} from '@/actions/usuarios-admin';
import { registrarDonacionEnMemoria, tomarDonacion } from '@/actions/donaciones';
import {
  guardarSesionRBACOffline,
  validarSesionRBACOffline,
  revocarSesionRBACOffline,
  TTL_SESION_RBAC_MS,
} from '@/lib/auth/offline-session';

describe('CMP-05: Gobernanza RBAC, Suspensión y Sesión Offline Firmada (TASK-26 / CA-05.1, CA-05.2, CA-05.3)', () => {
  beforeEach(async () => {
    await revocarSesionRBACOffline();
  });

  it('CA-05.1: confina estrictamente al rol VOLUNTARIO bloqueando /admin/usuarios, /impacto y /configuracion', () => {
    expect(puedeAccederRuta('VOLUNTARIO', '/admin/usuarios')).toBe(false);
    expect(puedeAccederRuta('VOLUNTARIO', '/admin')).toBe(false);
    expect(puedeAccederRuta('VOLUNTARIO', '/impacto')).toBe(false);
    expect(puedeAccederRuta('VOLUNTARIO', '/configuracion')).toBe(false);

    // Rutas operativas permitidas para VOLUNTARIO
    expect(puedeAccederRuta('VOLUNTARIO', '/donaciones')).toBe(true);
    expect(puedeAccederRuta('VOLUNTARIO', '/ruta-activa')).toBe(true);
    expect(puedeAccederRuta('VOLUNTARIO', '/entregas/seed-01')).toBe(true);

    // ADMIN tiene acceso total
    expect(puedeAccederRuta('ADMIN', '/admin/usuarios')).toBe(true);
    expect(puedeAccederRuta('ADMIN', '/impacto')).toBe(true);

    // Permisos explícitos
    expect(tienePermiso('VOLUNTARIO', 'admin:users:write')).toBe(false);
    expect(tienePermiso('ADMIN', 'admin:users:write')).toBe(true);
  });

  it('CA-05.2: bloquea con 403 mutaciones RBAC por no-ADMIN y permite a ADMIN crear, cambiar rol y suspender cuentas bloqueando toma de donaciones', async () => {
    const actorVoluntarioId = '30000000-0000-4000-8000-000000000010';
    const actorAdminId = '00000000-0000-4000-8000-000000000001';

    const intentoNoAutorizado = await crearUsuarioCorporativo(actorVoluntarioId, {
      nombre: 'Intento Escalada',
      email: 'escalada@nexo.org',
      rol: 'ADMIN',
      telefono: '+573150001122',
      motivo: 'Intento no autorizado',
    });

    expect(intentoNoAutorizado.exito).toBe(false);
    if (!intentoNoAutorizado.exito) {
      expect(intentoNoAutorizado.codigo).toBe(403);
    }

    const alta = await crearUsuarioCorporativo(actorAdminId, {
      nombre: 'Voluntario Prueba RBAC',
      email: `vol.rbac.${Date.now()}@nexo.org`,
      rol: 'VOLUNTARIO',
      telefono: '+573159998877',
      motivo: 'Alta verificada en suite BDD',
    });

    expect(alta.exito).toBe(true);
    if (!alta.exito) return;

    const nuevoUsuarioId = alta.data.id;

    // Cambio de rol por ADMIN
    const cambioRol = await actualizarRolUsuario(
      actorAdminId,
      nuevoUsuarioId,
      'COORDINADOR',
      'Promoción a coordinador de zona'
    );
    expect(cambioRol.exito).toBe(true);
    if (cambioRol.exito) {
      expect(cambioRol.data.rol).toBe('COORDINADOR');
    }

    // Suspensión de la cuenta por ADMIN
    const suspension = await cambiarEstadoCuentaUsuario(
      actorAdminId,
      nuevoUsuarioId,
      'SUSPENDIDO',
      'Suspensión preventiva de credenciales'
    );
    expect(suspension.exito).toBe(true);
    if (suspension.exito) {
      expect(suspension.data.estadoCuenta).toBe('SUSPENDIDO');
    }

    // Verificar registro en bitácora de auditoría RBAC
    const bitacora = await listarEventosAuditoriaRBAC(actorAdminId);
    expect(bitacora.length).toBeGreaterThanOrEqual(3);

    // Registrar una donación disponible y verificar que el usuario SUSPENDIDO recibe 403 al intentar tomarla
    const donacionPruebaId = `don-rbac-${Date.now()}`;
    await registrarDonacionEnMemoria({
      id: donacionPruebaId,
      codigo: 'DON-991',
      donanteId: 'd-rbac-1',
      donanteNombre: 'Donante Prueba RBAC',
      tipoAlimento: 'Plátano Hartón de Prueba RBAC',
      requiereFrio: false,
      cantidadEstimada: 25,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Santa Elena Puesto 12',
      zona: 'CENTRO',
      horaLimite: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      estado: 'DISPONIBLE',
      exencionSanitariaAceptada: true,
      createdAt: new Date().toISOString(),
    });

    const intentoTomaSuspendido = await tomarDonacion(
      donacionPruebaId,
      nuevoUsuarioId,
      'Voluntario Suspendido'
    );
    expect(intentoTomaSuspendido.exito).toBe(false);
    expect(intentoTomaSuspendido.codigo).toBe(403);
  });

  it('CA-05.3: persiste sesión RBAC offline con firma HMAC-SHA256, invalida por expiración TTL 24h y revoca ante manipulación en IndexedDB', async () => {
    const ahora = Date.now();
    const userId = '30000000-0000-4000-8000-000000000001';

    const sesionGuardada = await guardarSesionRBACOffline(
      {
        userId,
        rol: 'VOLUNTARIO',
        estadoCuenta: 'ACTIVO',
      },
      ahora
    );

    expect(sesionGuardada.rol).toBe('VOLUNTARIO');
    expect(sesionGuardada.signatureHash).toMatch(/^[0-9a-f]{64}$/);

    // 1. Validación dentro de la ventana de 24h
    const validacionOk = await validarSesionRBACOffline(ahora + 1000);
    expect(validacionOk.valida).toBe(true);
    if (validacionOk.valida) {
      expect(validacionOk.sesion.rol).toBe('VOLUNTARIO');
      expect(validacionOk.permisos).toEqual([]);
    }

    // 2. Validación tras superar el TTL de 24 horas
    const validacionExpirada = await validarSesionRBACOffline(
      ahora + TTL_SESION_RBAC_MS + 5000
    );
    expect(validacionExpirada.valida).toBe(false);
    if (!validacionExpirada.valida) {
      expect(validacionExpirada.motivo).toBe('EXPIRADA');
    }

    // 3. Guardar nuevamente e intentar adulterar el rol a ADMIN directamente en IndexedDB
    await guardarSesionRBACOffline(
      {
        userId,
        rol: 'VOLUNTARIO',
        estadoCuenta: 'ACTIVO',
      },
      ahora
    );

    const rawDb = new Dexie('NexoSesionRBAC');
    rawDb.version(1).stores({ sesion_rbac: 'id', claves_rbac: 'id' });
    await rawDb.table('sesion_rbac').update('actual', { rol: 'ADMIN' });
    rawDb.close();

    const validacionAdulterada = await validarSesionRBACOffline(ahora + 2000);
    expect(validacionAdulterada.valida).toBe(false);
    if (!validacionAdulterada.valida) {
      expect(validacionAdulterada.motivo).toBe('FIRMA_INVALIDA');
    }
  });
});
