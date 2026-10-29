import { describe, test, expect } from 'vitest';
import { obtenerDonacionesDisponibles } from '../../src/actions/donaciones';
import { normalizarFechaHoraLimite, inferirZonaCali } from '../../src/lib/utils/donaciones-helper';
import type { ZonaCali } from '../../src/types';

describe('CMP-02: Catálogo Reactivo y Filtros por Zona (TASK-06)', () => {
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

  test('CA-02.1: Obtiene solo donaciones en estado DISPONIBLE y no expiradas', async () => {
    const ofertas = await obtenerDonacionesDisponibles('TODAS');
    expect(ofertas.length).toBeGreaterThan(0);
    const ahora = Date.now();

    for (const d of ofertas) {
      expect(d.estado).toBe('DISPONIBLE');
      expect(new Date(d.horaLimite).getTime()).toBeGreaterThan(ahora);
    }
  });

  test('CA-02.3: Filtra correctamente por cada una de las 5 zonas de Cali', async () => {
    const zonas: ZonaCali[] = ['NORTE', 'CENTRO', 'SUR', 'ORIENTE', 'LADERA'];

    for (const zona of zonas) {
      const ofertasZona = await obtenerDonacionesDisponibles(zona);
      for (const d of ofertasZona) {
        expect(d.zona).toBe(zona);
      }
    }
  });

  test('CA-02.4: El listado viene ordenado por urgencia (hora límite ascendente)', async () => {
    const ofertas = await obtenerDonacionesDisponibles('TODAS');
    for (let i = 0; i < ofertas.length - 1; i++) {
      const t1 = new Date(ofertas[i].horaLimite).getTime();
      const t2 = new Date(ofertas[i + 1].horaLimite).getTime();
      expect(t1).toBeLessThanOrEqual(t2);
    }
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