// @vitest-environment jsdom
import 'fake-indexeddb/auto'; // debe ir antes de importar la base de datos
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../../src/lib/db'; // AJUSTA: nombre del export cuando exista db.ts

describe('CA-01.5 – guardado offline', () => {
  beforeEach(async () => {
    await db.donaciones.clear(); // AJUSTA: nombre real de la tabla
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('sin red, la donación se guarda en Dexie con estado PENDIENTE', async () => {
    expect(navigator.onLine).toBe(false);

    // AJUSTA: si existe una función de guardado (por ejemplo guardarDonacion),
    // llámala aquí en lugar de db.donaciones.add para probar el flujo real.
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