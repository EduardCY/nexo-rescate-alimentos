import { describe, test, expect } from 'vitest';
import { donacionSchema } from '../../src/lib/validations/donacion'; // AJUSTA si cambia el nombre

// Datos personales/sensibles de beneficiarios que el contrato NO debe capturar (Ley 1581 de 2012)
const CAMPOS_PROHIBIDOS = [
  'nombreBeneficiario',
  'cedulaBeneficiario',
  'documentoBeneficiario',
  'telefonoBeneficiario',
  'direccionBeneficiario',
  'emailBeneficiario',
  'fotoBeneficiario',
  'estadoSalud',
  'etnia',
  'orientacionSexual',
  'religion',
  'datosBiometricos',
  'situacionEconomica',
];

// Funciona con z.object(...) normal o con .refine() en Zod 3
const base: any = donacionSchema;
const shape = base.shape ?? base._def?.schema?.shape ?? base.innerType?.().shape;

describe('Gobierno de datos – Habeas Data (Ley 1581 de 2012)', () => {
  test('el esquema expone sus campos para poder auditarlos', () => {
    expect(shape).toBeDefined();
    expect(Object.keys(shape).length).toBeGreaterThan(0);
  });

  const campos = Object.keys(shape ?? {}).map((c) => c.toLowerCase());

  test.each(CAMPOS_PROHIBIDOS)('el contrato no captura "%s"', (prohibido) => {
    expect(campos).not.toContain(prohibido.toLowerCase());
  });

  test('un payload con datos de beneficiario no los conserva tras el parseo', () => {
    const result = donacionSchema.safeParse({
      tipoAlimento: 'Arroz',
      cantidadEstimada: 1,
      unidadMedida: 'kg',
      direccionRecogida: 'Galería Alameda Local 12',
      horaLimite: '23:59',
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      cedulaBeneficiario: '123456789',
      nombreBeneficiario: 'Juan Pérez',
    });

    if (result.success) {
      expect(result.data).not.toHaveProperty('cedulaBeneficiario');
      expect(result.data).not.toHaveProperty('nombreBeneficiario');
    } else {
      // Si el esquema usa .strict(), rechaza campos extra: también cumple
      expect(result.success).toBe(false);
    }
  });
});