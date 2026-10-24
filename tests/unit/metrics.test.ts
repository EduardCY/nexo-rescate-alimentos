import { describe, test, expect } from 'vitest';
import { calcularMetricasDonaciones, validarDefinitionOfDone, type DoDChecklist } from '@/lib/metrics';
import type { Donacion } from '@/types';

describe('TASK-14: Agregador de Métricas de Negocio y Quality Gate (DoD)', () => {
  const donacionesMock: Donacion[] = [
    {
      id: 'don-1',
      codigo: 'DON-101',
      donanteId: 'org-1',
      donanteNombre: 'Puesto 12 Santa Elena',
      tipoAlimento: 'Plátano y Yuca',
      requiereFrio: false,
      cantidadEstimada: 40,
      unidadMedida: 'kg',
      direccionRecogida: 'Plaza Santa Elena',
      horaLimite: '18:00',
      estado: 'ENTREGADA',
      exencionSanitariaAceptada: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'don-2',
      codigo: 'DON-102',
      donanteId: 'org-2',
      donanteNombre: 'Lácteos El Valle',
      tipoAlimento: 'Queso y Leche',
      requiereFrio: true,
      cantidadEstimada: 20,
      unidadMedida: 'kg',
      direccionRecogida: 'Cavasa Módulo 2',
      horaLimite: '16:00',
      estado: 'DISPONIBLE',
      exencionSanitariaAceptada: true,
      createdAt: new Date().toISOString(),
    },
  ];

  test('Debe calcular correctamente kilos, raciones y CO2 mitigado', () => {
    const metricas = calcularMetricasDonaciones(donacionesMock);

    expect(metricas.totalDonaciones).toBe(2);
    expect(metricas.totalKgRescatados).toBe(60);
    // 60 kg / 0.4 kg por ración = 150 raciones
    expect(metricas.totalRacionesEstimadas).toBe(150);
    // 60 kg * 2.101 = 126.06 kg CO2
    expect(metricas.co2MitigadoKg).toBeCloseTo(126.1, 1);
    expect(metricas.co2MitigadoToneladas).toBeCloseTo(0.13, 2);
    expect(metricas.donacionesActivas).toBe(1);
    expect(metricas.donacionesEntregadas).toBe(1);
    expect(metricas.tasaEfectividad).toBe(50);
  });

  test('Debe retornar métricas en cero si la lista de donaciones está vacía', () => {
    const metricas = calcularMetricasDonaciones([]);
    expect(metricas.totalDonaciones).toBe(0);
    expect(metricas.totalKgRescatados).toBe(0);
    expect(metricas.tasaEfectividad).toBe(0);
  });

  test('Debe aprobar el Quality Gate cuando se cumplen todos los criterios DoD', () => {
    const checklistValido: DoDChecklist = {
      criteriosAceptacionCumplidos: true,
      pruebasAutomatizadasEnVerde: true,
      coberturaMinimaAlcanzada: true,
      analisisEstaticoSinErrores: true,
      habeasDataAuditado: true,
      exencionSanitariaAuditada: true,
    };

    const evaluacion = validarDefinitionOfDone(checklistValido);
    expect(evaluacion.aprobado).toBe(true);
    expect(evaluacion.bloqueos).toHaveLength(0);
  });

  test('Debe rechazar el Quality Gate si falla algún criterio crítico (ej. Habeas Data)', () => {
    const checklistInvalido: DoDChecklist = {
      criteriosAceptacionCumplidos: true,
      pruebasAutomatizadasEnVerde: true,
      coberturaMinimaAlcanzada: true,
      analisisEstaticoSinErrores: true,
      habeasDataAuditado: false, // Fallo intencional
      exencionSanitariaAuditada: true,
    };

    const evaluacion = validarDefinitionOfDone(checklistInvalido);
    expect(evaluacion.aprobado).toBe(false);
    expect(evaluacion.bloqueos).toContain(
      'Incumplimiento de la Ley 1581 de 2012 (Captura de datos sensibles de beneficiarios).'
    );
  });
});
