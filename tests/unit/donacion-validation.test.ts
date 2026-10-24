import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { donacionSchema } from '../../src/lib/validations/donacion';

// Hora local fija: 17-oct-2026 a las 12:00
const AHORA = new Date(2026, 9, 17, 12, 0, 0);

const payloadValido = () => ({
  tipoAlimento: 'Frutas y Verduras',
  cantidadEstimada: 45,
  unidadMedida: 'kg',
  direccionRecogida: 'Galería Alameda Local 12',
  horaLimite: '16:00',
  requiereFrio: false,
  exencionSanitariaAceptada: true,
});

describe('CMP-01 – validación de donación', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('CA-01.1: acepta payload correcto con exención legal', () => {
    const result = donacionSchema.safeParse(payloadValido());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exencionSanitariaAceptada).toBe(true);
      expect(result.data.cantidadEstimada).toBe(45);
      expect(result.data.tipoAlimento).toBe('Frutas y Verduras');
    }
  });

  test('CA-01.2: rechaza hora límite anterior a la actual', () => {
    const result = donacionSchema.safeParse({ ...payloadValido(), horaLimite: '11:00' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('horaLimite'))).toBe(true);
    }
  });

  test('CA-01.2: rechaza hora límite igual a la actual', () => {
    const result = donacionSchema.safeParse({ ...payloadValido(), horaLimite: '12:00' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('horaLimite'))).toBe(true);
    }
  });

  test('CA-01.3: rechaza exencionSanitariaAceptada: false con mensaje legal', () => {
    const result = donacionSchema.safeParse({
      ...payloadValido(),
      exencionSanitariaAceptada: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) =>
        i.path.includes('exencionSanitariaAceptada'),
      );
      expect(issue).toBeDefined();
      // AJUSTA: pon el texto exacto de tu esquema cuando lo veas en donacion.ts
      expect(issue!.message).toMatch(/exenci[óo]n|responsabilidad|sanitaria|ley/i);
    }
  });

  test('CA-01.3: rechaza cuando se omite exencionSanitariaAceptada', () => {
    const { exencionSanitariaAceptada, ...sinExencion } = payloadValido();
    const result = donacionSchema.safeParse(sinExencion);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes('exencionSanitariaAceptada')),
      ).toBe(true);
    }
  });

  test('CA-01.4: requiereFrio: true persiste la bandera de refrigeración', () => {
    const result = donacionSchema.safeParse({ ...payloadValido(), requiereFrio: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiereFrio).toBe(true);
    }
  });
});