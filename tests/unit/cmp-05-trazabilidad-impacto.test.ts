import { describe, it, expect } from 'vitest';
import {
  FACTOR_CO2_FAO,
  obtenerMetricasImpactoReal,
  procesarMetricasImpacto,
} from '@/actions/metricas';
import { generarContenidoReporteCSV } from '@/lib/utils/csv-export';

describe('CMP-05: Trazabilidad e Impacto Real sin Datos Ficticios (TASK-26 / CA-05.4)', () => {
  it('CA-05.4: retorna exactamente 0 en todos los indicadores cuando no existen donaciones en estado ENTREGADA', async () => {
    const datasetSinEntregas = [
      {
        id: 'don-disp-1',
        codigo: 'DON-301',
        tipoAlimento: 'Tomate Chonto',
        cantidadEstimada: 80,
        estado: 'DISPONIBLE' as const,
        comedorNombre: 'Comedor Siloé',
      },
      {
        id: 'don-asig-2',
        codigo: 'DON-302',
        tipoAlimento: 'Plátano Maduro',
        cantidadEstimada: 120,
        estado: 'ASIGNADA' as const,
        comedorNombre: 'Hogar Aguablanca',
      },
      {
        id: 'don-exp-3',
        codigo: 'DON-303',
        tipoAlimento: 'Queso Campesino',
        cantidadEstimada: 45,
        estado: 'EXPIRADA' as const,
        comedorNombre: 'Mesa Común Centro',
      },
    ];

    const metricas = await obtenerMetricasImpactoReal(datasetSinEntregas);

    expect(metricas.totalKgRescatados).toBe(0);
    expect(metricas.totalRacionesServidas).toBe(0);
    expect(metricas.emisionesCo2EvitadasKg).toBe(0);
    expect(metricas.donacionesCompletadas).toBe(0);
    expect(metricas.comedoresAbastecidos).toBe(0);
    expect(metricas.entregasDetalle).toHaveLength(0);
  });

  it('CA-05.4: contabiliza exclusivamente las donaciones con estado ENTREGADA aplicando factor FAO 2.5 kg CO2e/kg', () => {
    const datasetMixto = [
      {
        id: 'ent-1',
        codigo: 'DON-401',
        donanteNombre: 'Puesto 45 Santa Elena',
        comedorNombre: 'Comedor Comunitario Siloé',
        tipoAlimento: 'Papa Criolla y Yuca',
        cantidadEstimada: 40,
        estado: 'ENTREGADA' as const,
        createdAt: '2026-11-07T10:00:00.000Z',
        entregadaAt: '2026-11-07T12:30:00.000Z',
      },
      {
        id: 'ent-2',
        codigo: 'DON-402',
        donanteNombre: 'Panadería La Espiga',
        comedorNombre: 'Olla Comunitaria Aguablanca',
        tipoAlimento: 'Pan del Día',
        cantidadEstimada: 20,
        estado: 'ENTREGADA' as const,
        createdAt: '2026-11-07T11:00:00.000Z',
        entregadaAt: '2026-11-07T13:15:00.000Z',
      },
      {
        id: 'ent-3',
        codigo: 'DON-403',
        donanteNombre: 'Bodega 12 Cavasa',
        comedorNombre: 'Comedor Comunitario Siloé',
        tipoAlimento: 'Naranja Valencia',
        cantidadEstimada: 60,
        estado: 'ENTREGADA' as const,
        createdAt: '2026-11-07T14:00:00.000Z',
        entregadaAt: '2026-11-07T16:00:00.000Z',
      },
      {
        id: 'no-ent-4',
        codigo: 'DON-404',
        donanteNombre: 'Lácteos Alameda',
        comedorNombre: 'Fundación Norte',
        tipoAlimento: 'Cuajada Fresca',
        cantidadEstimada: 500,
        estado: 'ASIGNADA' as const,
      },
    ];

    const resultado = procesarMetricasImpacto(datasetMixto, 'DATASET_PRUEBA');

    // 40 + 20 + 60 = 120 kg
    expect(resultado.totalKgRescatados).toBe(120);
    // 120 / 0.4 = 300 raciones
    expect(resultado.totalRacionesServidas).toBe(300);
    // 120 * 2.5 = 300 kg CO2e
    expect(resultado.emisionesCo2EvitadasKg).toBe(120 * FACTOR_CO2_FAO);
    expect(resultado.donacionesCompletadas).toBe(3);
    // 2 comedores únicos ('Comedor Comunitario Siloé' y 'Olla Comunitaria Aguablanca')
    expect(resultado.comedoresAbastecidos).toBe(2);
    expect(resultado.entregasDetalle).toHaveLength(3);
  });

  it('TASK-25 / TASK-26: genera el contenido CSV con las 7 columnas auditadas para exportación', () => {
    const metricas = procesarMetricasImpacto(
      [
        {
          id: 'ent-csv-1',
          codigo: 'DON-501',
          donanteNombre: 'Fruver El Paraíso',
          comedorNombre: 'Comedor Siloé Esperanza',
          tipoAlimento: 'Papaya y Banano',
          cantidadEstimada: 20,
          estado: 'ENTREGADA' as const,
          createdAt: '2026-11-07T08:00:00.000Z',
          entregadaAt: '2026-11-07T09:30:00.000Z',
        },
      ],
      'DATASET_PRUEBA'
    );

    const csv = generarContenidoReporteCSV(metricas.entregasDetalle);
    const lineas = csv.split('\r\n');

    expect(lineas[0]).toBe(
      'Codigo,FechaRegistro,FechaEntrega,Donante,ComedorReceptor,Kilogramos,RacionesEstimadas'
    );
    expect(lineas[1]).toContain('DON-501');
    expect(lineas[1]).toContain('Fruver El Paraíso');
    expect(lineas[1]).toContain('Comedor Siloé Esperanza');
    expect(lineas[1]).toContain(',20,50');
  });
});
