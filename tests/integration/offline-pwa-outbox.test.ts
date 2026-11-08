// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  db,
  guardarDonacionOffline,
  encolarMutacionOutbox,
  sembrarCatalogoProductosOffline,
  consultarCatalogoProductosOffline,
  sincronizarColaOffline,
  sincronizarCatalogoDelta,
} from '@/lib/db';
import * as supabaseServer from '@/lib/supabase/server';

describe('PWA Offline-First: Código Determinista, Patrón Outbox Idempotente y Delta Sync (TASK-32 / CA-01.5 / CA-PWA.4 / CA-PWA.5)', () => {
  beforeEach(async () => {
    await db.donaciones.clear();
    await db.outbox_mutations.clear();
    await db.catalogo_productos.clear();
    await db.donaciones_cache.clear();
    await db.meta_sync.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('CA-01.5: genera códigos locales deterministas con formato OFFLINE-DON-<YYMMDD>-<DEV4>-<SEQ3>-<ENT4> y llave UUID v4', async () => {
    const id1 = await guardarDonacionOffline({
      tipoAlimento: 'Tomate Chonto de Galería',
      cantidadEstimada: 35,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Santa Elena Puesto 45',
      zona: 'CENTRO',
      horaLimite: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      donanteNombre: 'Puesto 45 Doña Rosa',
    });

    const id2 = await guardarDonacionOffline({
      tipoAlimento: 'Plátano Maduro',
      cantidadEstimada: 50,
      unidadMedida: 'kg',
      direccionRecogida: 'Central Mayorista Cavasa Bodega 8',
      zona: 'ORIENTE',
      horaLimite: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      donanteNombre: 'Distribuidora El Agro',
    });

    const reg1 = await db.donaciones.get(id1);
    const reg2 = await db.donaciones.get(id2);

    const regexDeterminista = /^OFFLINE-DON-\d{6}-[A-Z0-9]{4}-\d{3}-[A-Z0-9]{4}$/;
    expect(reg1?.codigoLocal).toMatch(regexDeterminista);
    expect(reg2?.codigoLocal).toMatch(regexDeterminista);
    expect(reg1?.codigoLocal).not.toBe(reg2?.codigoLocal);
    expect(reg1?.idempotencyKey).toBeTruthy();
    expect(reg2?.idempotencyKey).toBeTruthy();
  });

  it('CA-PWA.4: encola mutaciones en outbox_mutations sin duplicar la misma idempotencyKey y las sincroniza en orden FIFO', async () => {
    const singleMock = vi.fn().mockResolvedValue({
      data: { codigo: 'DON-310', id: 'uuid-310' },
      error: null,
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    vi.spyOn(supabaseServer, 'createClient').mockReturnValue({
      from: fromMock,
    } as unknown as ReturnType<typeof supabaseServer.createClient>);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    const keyFija = '550e8400-e29b-41d4-a716-446655440099';
    const payload = {
      tipoAlimento: 'Yuca y Arracacha',
      cantidadEstimada: 40,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Alameda Local 12',
      zona: 'SUR',
      horaLimite: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      donanteNombre: 'Raíces del Valle',
    };

    const encolado1 = await encolarMutacionOutbox({
      tipoOperacion: 'CREATE_DONACION',
      entidadId: 'temp-don-01',
      payload,
      idempotencyKey: keyFija,
    });

    const encolado2 = await encolarMutacionOutbox({
      tipoOperacion: 'CREATE_DONACION',
      entidadId: 'temp-don-01',
      payload,
      idempotencyKey: keyFija,
    });

    expect(encolado1.duplicada).toBe(false);
    expect(encolado2.duplicada).toBe(true);
    expect(encolado2.id).toBe(encolado1.id);

    const resSync = await sincronizarColaOffline();
    expect(resSync.sincronizadas).toBe(1);
    expect(resSync.fallidas).toBe(0);

    const mutacionPost = await db.outbox_mutations.get(encolado1.id);
    expect(mutacionPost?.syncStatus).toBe('SINCRONIZADO');
    expect(mutacionPost?.resultadoCodigo).toMatch(/^DON-\d+$/);
  });

  it('CA-PWA.5: siembra el catálogo local de productos para consulta offline e invoca sincronización delta incremental', async () => {
    const insertados = await sembrarCatalogoProductosOffline();
    expect(insertados).toBeGreaterThanOrEqual(10);

    // Segunda llamada es idempotente (0 duplicados)
    const reinsertados = await sembrarCatalogoProductosOffline();
    expect(reinsertados).toBe(0);

    const lacteosFrio = await consultarCatalogoProductosOffline({
      categoria: 'lacteos',
      requiereFrio: true,
    });
    expect(lacteosFrio.length).toBeGreaterThanOrEqual(2);

    const delta = await sincronizarCatalogoDelta();
    expect(delta.error).toBeUndefined();
  });
});
