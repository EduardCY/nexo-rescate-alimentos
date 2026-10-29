import 'fake-indexeddb/auto'; // debe ir antes de importar la base de datos
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../src/lib/db';

if (typeof (globalThis as any).navigator === 'undefined') {
  (globalThis as any).navigator = { onLine: true };
}

describe('CA-01.5 – guardado offline', () => {
  beforeEach(async () => {
    await db.donaciones.clear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('sin red, la donación se guarda en Dexie con estado PENDIENTE', async () => {
    expect(navigator.onLine).toBe(false);

    const id = await db.donaciones.add({
      tipoAlimento: 'Pan y frutas',
      cantidadEstimada: 5,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Alameda Local 12',
      horaLimite: '16:00',
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      estado: 'PENDIENTE',
    });

    const guardada = await db.donaciones.get(id);
    expect(guardada).toBeDefined();
    expect(guardada!.estado).toBe('PENDIENTE');
    expect(guardada!.tipoAlimento).toBe('Pan y frutas');
    expect(guardada!.exencionSanitariaAceptada).toBe(true);
    expect(await db.donaciones.count()).toBe(1);
  });
});