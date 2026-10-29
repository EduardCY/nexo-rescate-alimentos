import { describe, test, expect } from 'vitest';
import { tomarDonacion, obtenerDonacionesDisponibles } from '../../src/actions/donaciones';

describe('CMP-03: Toma Atómica, Reserva Única y Concurrencia HTTP 409 (TASK-09)', () => {
  let idDonacionReservada: string;

  test('CA-03.2 & Simulación Doble Cliente: El primer voluntario reserva (200) y el segundo colisiona (409)', async () => {
    // 1. Obtenemos las ofertas disponibles
    const disponibles = await obtenerDonacionesDisponibles('TODAS');
    expect(disponibles.length).toBeGreaterThan(0);
    const objetivo = disponibles[0];
    idDonacionReservada = objetivo.id;

    // 2. Simulación de doble cliente web concurrente (dos peticiones casi simultáneas)
    const t0 = performance.now();
    const [resVoluntario1, resVoluntario2] = await Promise.all([
      tomarDonacion(objetivo.id, 'vol-001', 'Voluntario Carlos'),
      tomarDonacion(objetivo.id, 'vol-002', 'Voluntaria Marcela'),
    ]);
    const t1 = performance.now();
    const duracionMs = t1 - t0;

    // Uno de los dos debe ganar la reserva única atómica (200) y el otro debe recibir 409 Conflict
    const exito = resVoluntario1.codigo === 200 ? resVoluntario1 : resVoluntario2;
    const conflicto = resVoluntario1.codigo === 409 ? resVoluntario1 : resVoluntario2;

    expect(exito.codigo).toBe(200);
    expect(exito.exito).toBe(true);

    // Verificación de los criterios de CA-03.2
    expect(conflicto.codigo).toBe(409);
    expect(conflicto.exito).toBe(false);
    expect(conflicto.mensaje).toContain('Esta donación acaba de ser reservada por otra persona');

    // Definición de Terminado (DoD): respuesta inferior a 500 ms
    expect(duracionMs).toBeLessThan(500);
  });

  test('CA-03.3: Bloqueo de toma sobre ofertas expiradas o inexistentes (código 410)', async () => {
    const res = await tomarDonacion('donacion-inexistente-o-expirada', 'vol-003', 'Voluntario Andrés');
    expect(res.codigo).toBe(410);
    expect(res.exito).toBe(false);
    expect(res.mensaje).toContain('ha expirado y ya no se encuentra disponible');
  });

  test('La oferta reservada ya no aparece en el listado activo de donaciones disponibles', async () => {
    const disponibles = await obtenerDonacionesDisponibles('TODAS');
    const encontrada = disponibles.find((d) => d.id === idDonacionReservada);
    expect(encontrada).toBeUndefined();
  });
});