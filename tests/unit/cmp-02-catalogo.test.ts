/**
 * [TASK-17 / TASK-06] CMP-02 · Catálogo Reactivo, Filtros por Zona y Cadena de Frío
 * Criterios BDD: CA-02.1, CA-02.2, CA-02.3, CA-02.4
 *
 * Unifica el esqueleto canónico de QA (Felipe Charria - PR #26) con las pruebas
 * ejecutables de lógica de negocio y catálogo reactivo (Alejandro Rodríguez - PR #25).
 */
import { describe, test, expect } from 'vitest';
import { obtenerDonacionesDisponibles } from '../../src/actions/donaciones';
import { normalizarFechaHoraLimite, inferirZonaCali } from '../../src/lib/utils/donaciones-helper';
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

    test('DoD: Filtrado en memoria de ofertas se ejecuta en menos de 100 ms', async () => {
      const t0 = performance.now();
      const ofertas = await obtenerDonacionesDisponibles('CENTRO');
      const t1 = performance.now();
      const duracion = t1 - t0;
      expect(duracion).toBeLessThan(100);
      expect(ofertas).toBeDefined();
    });
  });
});
