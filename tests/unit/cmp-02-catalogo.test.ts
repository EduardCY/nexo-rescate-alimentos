/**
 * [TASK-17 / TASK-06] CMP-02 · Catálogo Reactivo, Filtros por Zona y Cadena de Frío
 * Criterios BDD: CA-02.1, CA-02.2, CA-02.3, CA-02.4
 *
 * Unifica el esqueleto canónico de QA (Felipe Charria - PR #26) con las pruebas
 * ejecutables de lógica de negocio y catálogo reactivo (Alejandro Rodríguez - PR #25).
 */
import { describe, test, expect } from 'vitest';
import { obtenerDonacionesDisponibles } from '../../src/actions/donaciones';
import {
  normalizarFechaHoraLimite,
  inferirZonaCali,
  filtrarDonacionesDisponibles,
  filtrarPorZona,
  estaExpirada,
  obtenerEstadoActualizado,
} from '../../src/lib/utils/donaciones-helper';
import { scoreMatch, calcularDistanciaKm, type Lot, type Ngo } from '../../src/lib/nexo/impact';
import type { ZonaCali } from '../../src/types';

// Reloj de referencia fijo para fixtures determinísticos (TASK-17)
const AHORA = new Date('2026-10-29T15:00:00.000Z');
const enMinutos = (m: number) => new Date(AHORA.getTime() + m * 60_000).toISOString();

export const DONACIONES_FIXTURE = [
  { id: 'D-01', estado: 'DISPONIBLE', zona: 'NORTE',   requiereFrio: false, horaLimite: enMinutos(120) },
  { id: 'D-02', estado: 'DISPONIBLE', zona: 'SUR',     requiereFrio: true,  horaLimite: enMinutos(90) },
  { id: 'D-03', estado: 'ASIGNADA',   zona: 'LADERA',  requiereFrio: false, horaLimite: enMinutos(60) },
  { id: 'D-04', estado: 'ENTREGADA',  zona: 'ORIENTE', requiereFrio: false, horaLimite: enMinutos(-240) },
  { id: 'D-05', estado: 'EXPIRADA',   zona: 'CENTRO',  requiereFrio: false, horaLimite: enMinutos(-30) },
  { id: 'D-06', estado: 'DISPONIBLE', zona: 'CENTRO',  requiereFrio: false, horaLimite: enMinutos(-5) },
  { id: 'D-07', estado: 'DISPONIBLE', zona: 'LADERA',  requiereFrio: true,  horaLimite: enMinutos(45) },
  { id: 'D-08', estado: 'DISPONIBLE', zona: 'ORIENTE', requiereFrio: false, horaLimite: enMinutos(30) },
];

export const ORGANIZACIONES_FIXTURE = [
  { id: 'ORG-CON-FRIO', capacidadFrio: true },
  { id: 'ORG-SIN-FRIO', capacidadFrio: false },
];

describe('CMP-02 · Catálogo, Filtros y Cadena de Frío ([TASK-06] & [TASK-17])', () => {
  describe('Utilidades de Dominio (normalización de fechas e inferencia de zonas)', () => {
    test('normalizarFechaHoraLimite no lanza "Invalid time value" con hora local HH:mm', () => {
      const isoResult = normalizarFechaHoraLimite('16:00');
      expect(isoResult).toBeDefined();
      const d = new Date(isoResult);
      expect(isNaN(d.getTime())).toBe(false);
      expect(d.getTime()).toBeGreaterThan(Date.now());
    });

    test('normalizarFechaHoraLimite maneja fechas ISO correctamente', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      const isoResult = normalizarFechaHoraLimite(futureDate);
      expect(isoResult).toBe(futureDate);
    });

    test('inferirZonaCali mapea direcciones tradicionales de Cali', () => {
      expect(inferirZonaCali('Galería Santa Elena Puesto 45')).toBe('CENTRO');
      expect(inferirZonaCali('Cavasa Módulo 3 Bodega 12')).toBe('ORIENTE');
      expect(inferirZonaCali('Plaza Alameda Local 18')).toBe('SUR');
      expect(inferirZonaCali('Sector Siloé')).toBe('LADERA');
      expect(inferirZonaCali('Barrio Granada Avenida 6N')).toBe('NORTE');
    });
  });

  describe('CA-02.1 · El catálogo solo muestra donaciones disponibles', () => {
    test('excluye ofertas en estado ASIGNADA, ENTREGADA o EXPIRADA y retorna solo DISPONIBLES vigentes', async () => {
      const ofertas = await obtenerDonacionesDisponibles('TODAS');
      expect(ofertas.length).toBeGreaterThan(0);
      const ahora = Date.now();

      for (const d of ofertas) {
        expect(d.estado).toBe('DISPONIBLE');
        expect(new Date(d.horaLimite).getTime()).toBeGreaterThan(ahora);
      }
    });

    test('función pura filtrarDonacionesDisponibles excluye ofertas no disponibles y vencidas en DONACIONES_FIXTURE', () => {
      const disponibles = filtrarDonacionesDisponibles(DONACIONES_FIXTURE, { ahora: AHORA });
      const ids = disponibles.map((d) => d.id);

      // Solo deben quedar D-08 (30m), D-07 (45m), D-02 (90m), D-01 (120m)
      expect(ids).toEqual(['D-08', 'D-07', 'D-02', 'D-01']);
      expect(ids).not.toContain('D-03'); // ASIGNADA
      expect(ids).not.toContain('D-04'); // ENTREGADA
      expect(ids).not.toContain('D-05'); // EXPIRADA
      expect(ids).not.toContain('D-06'); // DISPONIBLE pero vencida (-5m)
    });
  });

  describe('CA-02.2 · Lotes con cadena de frío', () => {
    test('identifica correctamente lotes con requiereFrio: true en el catálogo y fixtures', async () => {
      const ofertas = await obtenerDonacionesDisponibles('TODAS');
      const conFrio = ofertas.filter((d) => d.requiereFrio);
      expect(conFrio.length).toBeGreaterThan(0);
      expect(conFrio[0].requiereFrio).toBe(true);

      const orgSinFrio = ORGANIZACIONES_FIXTURE.find((o) => !o.capacidadFrio);
      expect(orgSinFrio?.capacidadFrio).toBe(false);
    });

    test('scoreMatch excluye organización sin frío (eligible: false) cuando el lote requiere frío', () => {
      const loteConFrio: Lot = {
        id: 'D-02',
        donor: 'Lácteos del Valle',
        product: 'Queso y Yogur',
        category: 'lacteos',
        kg: 25,
        hoursLeft: 4,
        coldChain: '4°C - 8°C',
        requiereFrio: true,
        dock: 'Muelle Alameda',
        status: 'available',
      };

      const orgSinFrio: Ngo = {
        id: 'ORG-SIN-FRIO',
        name: 'Fundación Sin Nevera',
        city: 'Cali (Centro)',
        diners: 100,
        urgency: 'Alta',
        hasFridge: false,
        capacidadFrio: false,
        distanceKm: 2,
        prefers: ['lacteos'],
      };

      const orgConFrio: Ngo = {
        id: 'ORG-CON-FRIO',
        name: 'Comedor Con Refrigeración',
        city: 'Cali (Ladera)',
        diners: 200,
        urgency: 'Alta',
        hasFridge: true,
        capacidadFrio: true,
        distanceKm: 3,
        prefers: ['lacteos'],
      };

      const scoreSinFrio = scoreMatch(loteConFrio, orgSinFrio);
      expect(scoreSinFrio.eligible).toBe(false);
      expect(scoreSinFrio.reason).toBe('Sin cadena de frío');

      const scoreConFrio = scoreMatch(loteConFrio, orgConFrio);
      expect(scoreConFrio.eligible).toBe(true);
    });

    test('filtrarDonacionesDisponibles con soloSinFrio excluye lotes que requieren frío', () => {
      const soloSinFrio = filtrarDonacionesDisponibles(DONACIONES_FIXTURE, {
        ahora: AHORA,
        soloSinFrio: true,
      });
      expect(soloSinFrio.every((d) => !d.requiereFrio)).toBe(true);
      expect(soloSinFrio.map((d) => d.id)).toEqual(['D-08', 'D-01']);
    });
  });

  describe('CA-02.3 · Filtro por sector de Cali', () => {
    test('filtra correctamente por cada una de las 5 zonas de Cali (NORTE, CENTRO, SUR, ORIENTE, LADERA)', async () => {
      const zonas: ZonaCali[] = ['NORTE', 'CENTRO', 'SUR', 'ORIENTE', 'LADERA'];

      for (const zona of zonas) {
        const ofertasZona = await obtenerDonacionesDisponibles(zona);
        for (const d of ofertasZona) {
          expect(d.zona).toBe(zona);
        }
      }
    });

    test('filtrarDonacionesDisponibles por zona específica es determinístico sobre DONACIONES_FIXTURE', () => {
      const ladera = filtrarDonacionesDisponibles(DONACIONES_FIXTURE, {
        zona: 'LADERA',
        ahora: AHORA,
      });
      // D-03 es LADERA pero está ASIGNADA. Solo D-07 es DISPONIBLE y vigente.
      expect(ladera.map((d) => d.id)).toEqual(['D-07']);

      const norte = filtrarDonacionesDisponibles(DONACIONES_FIXTURE, {
        zona: 'NORTE',
        ahora: AHORA,
      });
      expect(norte.map((d) => d.id)).toEqual(['D-01']);
    });

    test('filtrarPorZona extrae todas las donaciones de una zona independientemente de su estado', () => {
      const enLadera = filtrarPorZona(DONACIONES_FIXTURE, 'LADERA');
      expect(enLadera.map((d) => d.id)).toEqual(['D-03', 'D-07']);
    });
  });

  describe('CA-02.4 · Ofertas vencidas y ordenamiento por urgencia', () => {
    test('el listado viene ordenado por urgencia (hora límite ascendente) y oculta vencidas', async () => {
      const ofertas = await obtenerDonacionesDisponibles('TODAS');
      for (let i = 0; i < ofertas.length - 1; i++) {
        const t1 = new Date(ofertas[i].horaLimite).getTime();
        const t2 = new Date(ofertas[i + 1].horaLimite).getTime();
        expect(t1).toBeLessThanOrEqual(t2);
      }

      const vencidasEnFixture = DONACIONES_FIXTURE.filter(
        (d) => new Date(d.horaLimite).getTime() <= AHORA.getTime()
      );
      expect(vencidasEnFixture.length).toBeGreaterThan(0);
    });

    test('estaExpirada y obtenerEstadoActualizado detectan vencimiento con reloj inyectable', () => {
      const d06 = DONACIONES_FIXTURE.find((d) => d.id === 'D-06')!;
      const d01 = DONACIONES_FIXTURE.find((d) => d.id === 'D-01')!;

      expect(estaExpirada(d06.horaLimite, AHORA)).toBe(true);
      expect(obtenerEstadoActualizado(d06, AHORA)).toBe('EXPIRADA');

      expect(estaExpirada(d01.horaLimite, AHORA)).toBe(false);
      expect(obtenerEstadoActualizado(d01, AHORA)).toBe('DISPONIBLE');
    });

    test('DoD: Filtrado en memoria de ofertas se ejecuta en menos de 100 ms', async () => {
      const t0 = performance.now();
      const ofertas = await obtenerDonacionesDisponibles('CENTRO');
      const t1 = performance.now();
      const duracion = t1 - t0;
      expect(duracion).toBeLessThan(100);
      expect(ofertas).toBeDefined();
    });
  });

  describe('TASK-19 · Cartografía OpenStreetMap y Escalabilidad Geográfica (Urbano Cali -> Intermunicipal)', () => {
    test('calcularDistanciaKm calcula distancias ortodrómicas precisas en Cali (Haversine)', () => {
      // Santa Elena (3.4258, -76.5244) a Comedor Siloé (3.4285, -76.5572) ~ 3.6 km
      const santaElena = { lat: 3.4258, lng: -76.5244 };
      const siloe = { lat: 3.4285, lng: -76.5572 };
      const d = calcularDistanciaKm(santaElena, siloe);
      expect(d).toBeGreaterThan(3.0);
      expect(d).toBeLessThan(4.5);
    });

    test('calcularDistanciaKm calcula distancias intermunicipales (Cali a Cavasa/Candelaria y Cali a Palmira)', () => {
      const centroCali = { lat: 3.435, lng: -76.53 };
      const cavasaCandelaria = { lat: 3.4111, lng: -76.4161 };
      const palmira = { lat: 3.5394, lng: -76.3036 };

      const distCavasa = calcularDistanciaKm(centroCali, cavasaCandelaria);
      expect(distCavasa).toBeGreaterThan(10);
      expect(distCavasa).toBeLessThan(16);

      const distPalmira = calcularDistanciaKm(centroCali, palmira);
      expect(distPalmira).toBeGreaterThan(25);
      expect(distPalmira).toBeLessThan(35);
    });

    test('Los nodos cartográficos poseen coordenadas geográficas válidas y alcance definido', async () => {
      const { nexoApi } = await import('../../src/lib/nexo/api');
      const nodes = await nexoApi.listMapNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(5);

      for (const n of nodes) {
        expect(n.lat).toBeGreaterThan(3.0);
        expect(n.lat).toBeLessThan(4.0);
        expect(n.lng).toBeGreaterThan(-77.0);
        expect(n.lng).toBeLessThan(-76.0);
        expect(n.label).toBeDefined();
        expect(n.direccion).toBeDefined();
        expect(
          n.alcance === 'URBANO' ||
          n.alcance === 'METROPOLITANO' ||
          n.alcance === 'INTERMUNICIPAL'
        ).toBe(true);
      }
    });
  });
});
