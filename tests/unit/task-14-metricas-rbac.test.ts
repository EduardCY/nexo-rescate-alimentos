import { describe, test, expect } from 'vitest';
import {
  tienePermiso,
  puedeAccederRuta,
  RBAC_PERMISOS,
  type RolCorporativo,
} from '@/lib/rbac/permisos';
import {
  obtenerMetricasImpactoReal,
  procesarMetricasImpacto,
  FACTOR_CO2_FAO,
} from '@/actions/metricas';
import {
  calcularImpactoEntregadas,
  ZERO_INVENTED_METRICS_POLICY,
} from '@/lib/metrics';
import type { Donacion } from '@/types';

describe('TASK-14: Gobernanza RBAC y Agregador de Impacto Real (Zero Invented Data)', () => {
  describe('1. Matriz de Autorización RBAC y Confinamiento Operativo (CA-05.1 y CA-05.2)', () => {
    test('El rol VOLUNTARIO debe tener permisos confinados a operaciones de campo', () => {
      expect(tienePermiso('VOLUNTARIO', 'donaciones:read')).toBe(true);
      expect(tienePermiso('VOLUNTARIO', 'donaciones:take')).toBe(true);
      expect(tienePermiso('VOLUNTARIO', 'entregas:confirm')).toBe(true);
      expect(tienePermiso('VOLUNTARIO', 'rastreo:public:read')).toBe(true);

      // Debe estar estrictamente excluido de administración y reportes globales
      expect(tienePermiso('VOLUNTARIO', 'admin:users:write')).toBe(false);
      expect(tienePermiso('VOLUNTARIO', 'admin:users:suspend')).toBe(false);
      expect(tienePermiso('VOLUNTARIO', 'reports:impact:read')).toBe(false);
      expect(tienePermiso('VOLUNTARIO', 'reports:impact:export')).toBe(false);
    });

    test('El rol ADMIN debe contar con permisos globales incluyendo gobernanza de usuarios', () => {
      expect(tienePermiso('ADMIN', 'admin:users:read')).toBe(true);
      expect(tienePermiso('ADMIN', 'admin:users:write')).toBe(true);
      expect(tienePermiso('ADMIN', 'admin:users:suspend')).toBe(true);
      expect(tienePermiso('ADMIN', 'reports:impact:read')).toBe(true);
      expect(tienePermiso('ADMIN', 'reports:impact:export')).toBe(true);
    });

    test('El rol COORDINADOR debe poder ver y exportar impacto, pero no administrar usuarios', () => {
      expect(tienePermiso('COORDINADOR', 'reports:impact:read')).toBe(true);
      expect(tienePermiso('COORDINADOR', 'reports:impact:export')).toBe(true);
      expect(tienePermiso('COORDINADOR', 'admin:users:write')).toBe(false);
    });

    test('Usuarios con cuenta SUSPENDIDA o PENDIENTE_AUTORIZACION no tienen permisos activos', () => {
      expect(tienePermiso('ADMIN', 'admin:users:write', 'SUSPENDIDO')).toBe(false);
      expect(tienePermiso('VOLUNTARIO', 'donaciones:take', 'SUSPENDIDO')).toBe(false);
      expect(tienePermiso('VOLUNTARIO', 'donaciones:take', 'PENDIENTE_AUTORIZACION')).toBe(false);
    });

    test('puedeAccederRuta confina al rol VOLUNTARIO e impide acceso a rutas corporativas', () => {
      // Rutas autorizadas para VOLUNTARIO
      expect(puedeAccederRuta('VOLUNTARIO', '/donaciones')).toBe(true);
      expect(puedeAccederRuta('VOLUNTARIO', '/ruta-activa')).toBe(true);
      expect(puedeAccederRuta('VOLUNTARIO', '/entregas/don-101')).toBe(true);
      expect(puedeAccederRuta('VOLUNTARIO', '/rastreo')).toBe(true);
      expect(puedeAccederRuta('VOLUNTARIO', '/')).toBe(true);

      // Rutas prohibidas para VOLUNTARIO (CA-05.1)
      expect(puedeAccederRuta('VOLUNTARIO', '/admin/usuarios')).toBe(false);
      expect(puedeAccederRuta('VOLUNTARIO', '/admin')).toBe(false);
      expect(puedeAccederRuta('VOLUNTARIO', '/impacto')).toBe(false);
      expect(puedeAccederRuta('VOLUNTARIO', '/configuracion')).toBe(false);
    });

    test('puedeAccederRuta reserva /admin/usuarios exclusivamente para ADMIN', () => {
      expect(puedeAccederRuta('ADMIN', '/admin/usuarios')).toBe(true);
      expect(puedeAccederRuta('COORDINADOR', '/admin/usuarios')).toBe(false);
      expect(puedeAccederRuta('DONANTE', '/admin/usuarios')).toBe(false);
      expect(puedeAccederRuta('RECEPTOR', '/admin/usuarios')).toBe(false);
    });

    test('puedeAccederRuta bloquea cualquier ruta si la cuenta está SUSPENDIDA', () => {
      expect(puedeAccederRuta('ADMIN', '/admin/usuarios', 'SUSPENDIDO')).toBe(false);
      expect(puedeAccederRuta('VOLUNTARIO', '/donaciones', 'SUSPENDIDO')).toBe(false);
    });
  });

  describe('2. Agregador de Métricas de Impacto Real (Zero Invented Data — CA-05.4)', () => {
    test('Política de gobierno activo: ZERO_INVENTED_METRICS_POLICY debe ser true', () => {
      expect(ZERO_INVENTED_METRICS_POLICY).toBe(true);
    });

    test('Calcula métricas únicamente sobre donaciones con estado ENTREGADA excluyendo activas y expiradas', async () => {
      const datasetMixto: Array<Partial<Donacion> & Record<string, unknown>> = [
        {
          id: 'd-1',
          codigo: 'DON-001',
          cantidadEstimada: 50,
          estado: 'DISPONIBLE',
          donanteNombre: 'Donante 1',
        },
        {
          id: 'd-2',
          codigo: 'DON-002',
          cantidadEstimada: 30,
          estado: 'ASIGNADA',
          donanteNombre: 'Donante 2',
        },
        {
          id: 'd-3',
          codigo: 'DON-003',
          cantidadEstimada: 20,
          estado: 'EXPIRADA',
          donanteNombre: 'Donante 3',
        },
        {
          id: 'd-4',
          codigo: 'DON-004',
          cantidadEstimada: 40,
          estado: 'ENTREGADA',
          donanteNombre: 'Donante 4',
          comedorNombre: 'Comedor Siloé',
          entregadaAt: '2026-11-01T10:00:00Z',
        },
        {
          id: 'd-5',
          codigo: 'DON-005',
          cantidadEstimada: 60,
          estado: 'ENTREGADA',
          donanteNombre: 'Donante 5',
          comedorNombre: 'Comedor Aguablanca',
          entregadaAt: '2026-11-01T12:00:00Z',
        },
      ];

      const resultado = await obtenerMetricasImpactoReal(datasetMixto);

      // Aserción mandatoria: El total debe ser exactamente 100 kg (40 + 60)
      expect(resultado.totalKgRescatados).toBe(100);
      expect(resultado.donacionesCompletadas).toBe(2);
      expect(resultado.comedoresAbastecidos).toBe(2);
      // Raciones: 100 kg / 0.4 kg por ración = 250 raciones
      expect(resultado.totalRacionesServidas).toBe(250);
      // CO2 evitado según factor FAO: 100 * 2.5 = 250 kg CO2e
      expect(resultado.emisionesCo2EvitadasKg).toBe(250);
      expect(resultado.entregasDetalle).toHaveLength(2);
      expect(resultado.fuenteDatos).toBe('DATASET_PRUEBA');
    });

    test('Retorna estrictamente 0 en todos los indicadores ante colección vacía o sin entregadas', async () => {
      const sinEntregadas: Array<Partial<Donacion> & Record<string, unknown>> = [
        { id: 'd-1', cantidadEstimada: 50, estado: 'DISPONIBLE' },
        { id: 'd-2', cantidadEstimada: 30, estado: 'ASIGNADA' },
      ];

      const resultado = await obtenerMetricasImpactoReal(sinEntregadas);

      expect(resultado.totalKgRescatados).toBe(0);
      expect(resultado.totalRacionesServidas).toBe(0);
      expect(resultado.emisionesCo2EvitadasKg).toBe(0);
      expect(resultado.donacionesCompletadas).toBe(0);
      expect(resultado.comedoresAbastecidos).toBe(0);
      expect(resultado.entregasDetalle).toEqual([]);
    });

    test('calcularImpactoEntregadas en src/lib/metrics.ts suma exclusivamente donaciones ENTREGADA', () => {
      const donaciones: Donacion[] = [
        {
          id: 'd-1',
          codigo: 'DON-1',
          donanteId: 'org-1',
          donanteNombre: 'Comercio A',
          tipoAlimento: 'Frutas',
          requiereFrio: false,
          cantidadEstimada: 80,
          unidadMedida: 'kg',
          direccionRecogida: 'Santa Elena',
          horaLimite: '20:00',
          estado: 'ENTREGADA',
          exencionSanitariaAceptada: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'd-2',
          codigo: 'DON-2',
          donanteId: 'org-2',
          donanteNombre: 'Comercio B',
          tipoAlimento: 'Lácteos',
          requiereFrio: true,
          cantidadEstimada: 40,
          unidadMedida: 'kg',
          direccionRecogida: 'Alameda',
          horaLimite: '18:00',
          estado: 'DISPONIBLE',
          exencionSanitariaAceptada: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const impacto = calcularImpactoEntregadas(donaciones);
      expect(impacto.totalKg).toBe(80);
      expect(impacto.totalRaciones).toBe(200); // 80 / 0.4
      expect(impacto.co2EvitadoKg).toBe(200); // 80 * 2.5
      expect(impacto.donacionesEntregadas).toBe(1);
    });
  });
});
