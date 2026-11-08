import { describe, it, expect } from 'vitest';
import { DonacionInputSchema } from '@/lib/validations/donacion';

describe('CMP-01: Validación de Reglas de Negocio y Exención Sanitaria Ley 1990 (TASK-32 / CA-01.2, CA-01.3, CA-01.4)', () => {
  it('CA-01.2: rechaza fechas/horas límite en el pasado y acepta horas límite futuras', () => {
    const haceDosHoras = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const enTresHoras = new Date(Date.now() + 3 * 3600 * 1000).toISOString();

    const resultadoPasado = DonacionInputSchema.safeParse({
      tipoAlimento: 'Tomate Chonto Maduro',
      cantidadEstimada: 30,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Santa Elena Puesto 45',
      horaLimite: haceDosHoras,
      requiereFrio: false,
      exencionSanitariaAceptada: true,
    });

    expect(resultadoPasado.success).toBe(false);
    if (!resultadoPasado.success) {
      const mensajes = resultadoPasado.error.issues.map((i) => i.message).join(' ');
      expect(mensajes).toContain('posterior a la actual');
    }

    const resultadoFuturo = DonacionInputSchema.safeParse({
      tipoAlimento: 'Tomate Chonto Maduro',
      cantidadEstimada: 30,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Santa Elena Puesto 45',
      horaLimite: enTresHoras,
      requiereFrio: false,
      exencionSanitariaAceptada: true,
    });

    expect(resultadoFuturo.success).toBe(true);
  });

  it('CA-01.3: bloquea el registro si no se acepta expresamente la declaración de inocuidad (Ley 1990 de 2019)', () => {
    const enCuatroHoras = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

    const sinExencion = DonacionInputSchema.safeParse({
      tipoAlimento: 'Pan Aliñado del Día',
      cantidadEstimada: 15,
      unidadMedida: 'canastillas',
      direccionRecogida: 'Calle 5 # 38-10, Cali',
      horaLimite: enCuatroHoras,
      requiereFrio: false,
      exencionSanitariaAceptada: false,
    });

    expect(sinExencion.success).toBe(false);
    if (!sinExencion.success) {
      const mensajes = sinExencion.error.issues.map((i) => i.message).join(' ');
      expect(mensajes).toContain('Ley 1990 de 2019');
    }
  });

  it('CA-01.4: asigna por defecto requiereFrio = false (Temperatura Ambiente) cuando no se especifica', () => {
    const enCuatroHoras = new Date(Date.now() + 4 * 3600 * 1000).toISOString();

    const porDefecto = DonacionInputSchema.parse({
      tipoAlimento: 'Plátano Hartón',
      cantidadEstimada: 50,
      unidadMedida: 'kg',
      direccionRecogida: 'Central Mayorista Cavasa',
      horaLimite: enCuatroHoras,
      exencionSanitariaAceptada: true,
    });

    expect(porDefecto.requiereFrio).toBe(false);
  });
});
