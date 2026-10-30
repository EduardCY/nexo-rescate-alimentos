/**
 * [TASK-10] CMP-03 · Toma concurrente de donaciones con bloqueo de segunda toma
 *
 * Escenario principal: peticiones simultáneas con Promise.all() sobre DON-CONCURRENT-01
 * jamás deben asignar la donación a dos voluntarios.
 *
 * Aporta evidencia empírica bajo concurrencia real en el event loop (100 iteraciones
 * y 25 peticiones concurrentes simultáneas).
 */
import { describe, test, expect, beforeEach } from 'vitest';
import {
  tomarDonacion,
  registrarDonacionEnMemoria,
  resetearDonacionEnMemoria,
} from '../../src/actions/donaciones';
import type { Donacion } from '../../src/types';

const LOTE_CONCURRENTE_FIXTURE: Donacion = {
  id: 'concurrent-01-uuid',
  codigo: 'DON-CONCURRENT-01',
  donanteId: 'd-concurrent',
  donanteNombre: 'Supermercado Central de Cali',
  tipoAlimento: 'Lácteos y Frutas de Plaza',
  requiereFrio: true,
  cantidadEstimada: 80,
  unidadMedida: 'kg',
  direccionRecogida: 'Plaza Santa Elena - Muelle Principal',
  zona: 'CENTRO',
  horaLimite: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
  estado: 'DISPONIBLE',
  exencionSanitariaAceptada: true,
  createdAt: new Date().toISOString(),
};

describe('CMP-03 · Toma concurrente de donaciones (TASK-10)', () => {
  beforeEach(async () => {
    // Inicializar el lote DON-CONCURRENT-01 en estado DISPONIBLE antes de cada prueba
    await registrarDonacionEnMemoria(LOTE_CONCURRENTE_FIXTURE);
    await resetearDonacionEnMemoria(LOTE_CONCURRENTE_FIXTURE.id);
  });

  test('dos tomas simultáneas con Promise.all: una gana (200) y la otra recibe 409', async () => {
    const [resA, resB] = await Promise.all([
      tomarDonacion('DON-CONCURRENT-01', 'vol-alpha', 'Voluntario Alpha'),
      tomarDonacion('DON-CONCURRENT-01', 'vol-beta', 'Voluntario Beta'),
    ]);

    const ganador = resA.codigo === 200 ? resA : resB;
    const colision = resA.codigo === 409 ? resA : resB;

    // Uno gana con 200 y el otro colisiona con 409
    expect(ganador.codigo).toBe(200);
    expect(ganador.exito).toBe(true);

    expect(colision.codigo).toBe(409);
    expect(colision.exito).toBe(false);
    expect(colision.mensaje).toContain('reservada por otra persona');
  });

  test('el registro DON-CONCURRENT-01 queda ASIGNADA con el voluntarioId del ganador', async () => {
    const [resA, resB] = await Promise.all([
      tomarDonacion('DON-CONCURRENT-01', 'vol-101', 'Voluntario Ganador Potencial'),
      tomarDonacion('DON-CONCURRENT-01', 'vol-102', 'Voluntario Perdedor Potencial'),
    ]);

    const ganador = resA.codigo === 200 ? resA : resB;
    expect(ganador.exito).toBe(true);

    if (ganador.exito) {
      expect(ganador.donacion.estado).toBe('ASIGNADA');
      expect(['vol-101', 'vol-102']).toContain(ganador.donacion.voluntarioId);
      expect(ganador.donacion.asignadaAt).toBeDefined();
    }

    // Una tercera toma posterior también debe ser rechazada con 409
    const resTardia = await tomarDonacion('DON-CONCURRENT-01', 'vol-103', 'Voluntario Tardío');
    expect(resTardia.codigo).toBe(409);
    expect(resTardia.exito).toBe(false);
  });

  test('100 iteraciones alternando el orden de llegada: nunca hay dos ganadores', async () => {
    for (let i = 0; i < 100; i++) {
      // Resetear el lote para cada iteración
      await resetearDonacionEnMemoria(LOTE_CONCURRENTE_FIXTURE.id);

      const llamada1 = () => tomarDonacion('DON-CONCURRENT-01', `vol-a-${i}`, `Voluntario A ${i}`);
      const llamada2 = () => tomarDonacion('DON-CONCURRENT-01', `vol-b-${i}`, `Voluntario B ${i}`);

      // Alternar el orden en el array de Promise.all
      const promesas = i % 2 === 0 ? [llamada1(), llamada2()] : [llamada2(), llamada1()];
      const [r1, r2] = await Promise.all(promesas);

      const codigos = [r1.codigo, r2.codigo];
      const ganadores = codigos.filter((c) => c === 200).length;
      const colisiones = codigos.filter((c) => c === 409).length;

      // Invariante de exclusión mutua estricta
      expect(ganadores).toBe(1);
      expect(colisiones).toBe(1);
    }
  });

  test('25 voluntarios simultáneos: exactamente uno gana', async () => {
    await resetearDonacionEnMemoria(LOTE_CONCURRENTE_FIXTURE.id);

    // 25 voluntarios lanzando su petición a la vez
    const peticiones = Array.from({ length: 25 }, (_, idx) =>
      tomarDonacion('DON-CONCURRENT-01', `vol-flota-${idx}`, `Voluntario Flota ${idx}`)
    );

    const resultados = await Promise.all(peticiones);

    const ganadores = resultados.filter((r) => r.codigo === 200);
    const colisiones = resultados.filter((r) => r.codigo === 409);

    expect(ganadores.length).toBe(1);
    expect(colisiones.length).toBe(24);
    expect(ganadores[0].exito).toBe(true);
    if (ganadores[0].exito) {
      expect(ganadores[0].donacion.estado).toBe('ASIGNADA');
    }
  });
});
