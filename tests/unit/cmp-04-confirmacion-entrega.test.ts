import { describe, test, expect } from 'vitest';
import { confirmarEntrega, obtenerDonacionParaEntrega } from '../../src/actions/entregas';
import { EntregaInputSchema } from '../../src/lib/validations/entrega';

describe('CMP-04: Registro y Confirmación de Entrega Física en Comedor (TASK-11)', () => {
  test('Validación Zod: nombreReceptor requiere al menos 3 caracteres', () => {
    const invalido = EntregaInputSchema.safeParse({
      donacionId: 'seed-01',
      nombreReceptor: 'Ma',
      estadoFisico: 'BUENO',
    });
    expect(invalido.success).toBe(false);

    const valido = EntregaInputSchema.safeParse({
      donacionId: 'seed-01',
      nombreReceptor: 'Marta Pérez',
      estadoFisico: 'EXCELENTE',
      observaciones: 'Lote recibido conforme',
    });
    expect(valido.success).toBe(true);
  });

  test('CA-04.2: Bloqueo de entrega de donación en estado DISPONIBLE (no tomada previamente)', async () => {
    const donacionDisponible = await obtenerDonacionParaEntrega('seed-02');
    expect(donacionDisponible?.estado).toBe('DISPONIBLE');

    const res = await confirmarEntrega({
      donacionId: 'seed-02',
      nombreReceptor: 'Hermana Lucía',
      estadoFisico: 'BUENO',
      voluntarioId: 'vol-001',
    });

    expect(res.exito).toBe(false);
    expect(res.codigo).toBe(400);
    expect(res.mensaje).toContain('Bloqueo (CA-04.2)');
  });

  test('DoD: Bloqueo si un voluntario no asignado intenta registrar la entrega', async () => {
    const res = await confirmarEntrega({
      donacionId: 'seed-01',
      nombreReceptor: 'Doña Amparo',
      estadoFisico: 'EXCELENTE',
      voluntarioId: 'vol-intruso-999',
    });

    expect(res.exito).toBe(false);
    expect(res.codigo).toBe(403);
    expect(res.mensaje).toContain('Solo el voluntario que reservó y tiene asignada la donación');
  });

  test('CA-04.1: Cierre formal exitoso de ASIGNADA a ENTREGADA con marca temporal UTC', async () => {
    const res = await confirmarEntrega({
      donacionId: 'seed-01',
      nombreReceptor: 'Marta Cecilia Pérez',
      estadoFisico: 'EXCELENTE',
      observaciones: 'Alimentos en óptima condición, cadena de frío verificada',
      voluntarioId: 'vol-001',
      voluntarioNombre: 'Voluntario Carlos',
    });

    expect(res.exito).toBe(true);
    expect(res.codigo).toBe(200);

    if (res.exito) {
      expect(res.donacion.estado).toBe('ENTREGADA');
      expect(res.entregadaAt).toBeDefined();

      const fechaUtc = new Date(res.entregadaAt);
      expect(isNaN(fechaUtc.getTime())).toBe(false);

      const donacionActualizada = await obtenerDonacionParaEntrega('seed-01');
      expect(donacionActualizada?.estado).toBe('ENTREGADA');
      expect(donacionActualizada?.entregadaAt).toBe(res.entregadaAt);
    }

    const eventos = (globalThis as unknown as { __NEXO_TRAZABILIDAD_EVENTOS?: Array<{ donacionId: string; estadoNuevo: string; observaciones: string }> }).__NEXO_TRAZABILIDAD_EVENTOS || [];
    const eventoEntrega = eventos.find((e) => e.donacionId === 'seed-01' && e.estadoNuevo === 'ENTREGADA');
    expect(eventoEntrega).toBeDefined();
    expect(eventoEntrega?.observaciones).toContain('Marta Cecilia Pérez');
  });

  test('Intento de re-entrega sobre donación ya ENTREGADA retorna código 409', async () => {
    const res = await confirmarEntrega({
      donacionId: 'seed-01',
      nombreReceptor: 'Marta Cecilia Pérez',
      estadoFisico: 'BUENO',
      voluntarioId: 'vol-001',
    });

    expect(res.exito).toBe(false);
    expect(res.codigo).toBe(409);
    expect(res.mensaje).toContain('ya fue entregada');
  });
});