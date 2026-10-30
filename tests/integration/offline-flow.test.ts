// @vitest-environment jsdom
import 'fake-indexeddb/auto'; // debe ir antes de importar la base de datos
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, guardarDonacionOffline, obtenerDonacionesPendientes } from '../../src/lib/db';
import { sincronizarColaOffline } from '../../src/lib/sync/offline-sync';
import * as supabaseServer from '../../src/lib/supabase/server';

describe('CA-01.5 – guardado offline y sincronización reactiva', () => {
  beforeEach(async () => {
    await db.donaciones.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('sin red, la donación se guarda en Dexie con estado PENDIENTE', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(navigator.onLine).toBe(false);

    const id = await guardarDonacionOffline({
      tipoAlimento: 'Pan y frutas',
      cantidadEstimada: 5,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Alameda Local 12',
      horaLimite: new Date(Date.now() + 3600 * 1000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      zona: 'SUR',
      indicacionesPuesto: 'Local 12 pasillo de frutas',
      telefonoDonante: '+573154201122',
      coordenadas: { lat: 3.434, lng: -76.538 },
    });

    const guardada = await db.donaciones.get(id);
    expect(guardada).toBeDefined();
    expect(guardada!.estado).toBe('PENDIENTE');
    expect(guardada!.tipoAlimento).toBe('Pan y frutas');
    expect(guardada!.exencionSanitariaAceptada).toBe(true);
    expect(guardada!.zona).toBe('SUR');
    expect(guardada!.indicacionesPuesto).toBe('Local 12 pasillo de frutas');
    expect(guardada!.coordenadas).toEqual({ lat: 3.434, lng: -76.538 });
    expect(await db.donaciones.count()).toBe(1);
  });

  test('al recuperar conexión (online), sincronizarColaOffline procesa la cola y la marca SINCRONIZADO', async () => {
    // 1. Mock de inserción remota exitosa en Supabase al sincronizar
    const singleMock = vi.fn().mockResolvedValue({
      data: { codigo: 'DON-209', id: 'uuid-209' },
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    vi.spyOn(supabaseServer, 'createClient').mockReturnValue({
      from: fromMock,
    } as any);

    // 2. Guardar donación en modo offline
    const id = await guardarDonacionOffline({
      tipoAlimento: 'Tomates Chonto de Santa Elena',
      cantidadEstimada: 30,
      unidadMedida: 'kg',
      direccionRecogida: 'Carrera 29 con Calle 25, Galería Santa Elena',
      horaLimite: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      zona: 'CENTRO',
      donanteNombre: 'Puesto 45 Doña Rosa',
    });

    const pendientesAntes = await obtenerDonacionesPendientes();
    expect(pendientesAntes.length).toBe(1);

    // 3. Simular reconexión a Internet
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    expect(navigator.onLine).toBe(true);

    // 4. Ejecutar coordinador de sincronización
    const resultado = await sincronizarColaOffline();

    expect(resultado.total).toBe(1);
    expect(resultado.sincronizadas).toBe(1);
    expect(resultado.fallidas).toBe(0);
    expect(resultado.codigos).toEqual(['DON-209']);

    // 5. Verificar que en Dexie el estado ahora sea SINCRONIZADO y la cola pendiente quede vacía
    const pendientesDespues = await obtenerDonacionesPendientes();
    expect(pendientesDespues.length).toBe(0);

    const itemFinal = await db.donaciones.get(id);
    expect(itemFinal!.estado).toBe('SINCRONIZADO');
    expect(itemFinal!.codigoServidor).toBe('DON-209');
  });
});
