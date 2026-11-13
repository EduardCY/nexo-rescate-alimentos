import fs from 'node:fs';
import path from 'node:path';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  publicarDonacion,
  tomarDonacion,
  liberarDonacionAsignada,
  eliminarDonacion,
} from '@/actions/donaciones';
import { confirmarEntrega } from '@/actions/entregas';
import * as supabaseServer from '@/lib/supabase/server';

describe('Pruebas de Rechazo, Integridad y PWA Offline-First (Entrega 3C)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(supabaseServer, 'esSupabaseConfigurado').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('CA-02.2: debe rechazar (403) tomar una donación con cadena de frío para comedor sin nevera', async () => {
    const pub = await publicarDonacion({
      tipoAlimento: 'Yogur y Queso Fresco',
      cantidadEstimada: 25,
      unidadMedida: 'kg',
      direccionRecogida: 'Local 18 Galería Alameda, Cali',
      horaLimite: new Date(Date.now() + 3600_000).toISOString(),
      requiereFrio: true,
      exencionSanitariaAceptada: true,
      zona: 'SUR',
    });
    expect(pub.exito).toBe(true);
    if (!pub.exito) return;

    const res = await tomarDonacion(pub.codigo, 'rec-sin-frio', 'Comedor Sin Nevera', undefined, {
      comedorId: 'com-sin-frio',
      comedorNombre: 'Comedor Sin Nevera',
      comedorTieneFrio: false,
      esRecogidaPropiaComedor: true,
    });

    expect(res.exito).toBe(false);
    expect(res.codigo).toBe(403);
    expect(res.mensaje).toContain('refrigeración');
  });

  test('CA-03.5: debe rechazar liberación de misión en estado inválido (409), inexistente (404) o por tercero (403)', async () => {
    const vacio = await liberarDonacionAsignada('');
    expect(vacio.exito).toBe(false);
    expect(vacio.codigo).toBe(400);

    const noExiste = await liberarDonacionAsignada('DON-INEXISTENTE-999');
    expect(noExiste.exito).toBe(false);
    expect(noExiste.codigo).toBe(404);

    const pub = await publicarDonacion({
      tipoAlimento: 'Plátano Hartón',
      cantidadEstimada: 30,
      unidadMedida: 'kg',
      direccionRecogida: 'Plaza Santa Elena Puesto 10',
      horaLimite: new Date(Date.now() + 3600_000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      zona: 'CENTRO',
    });
    expect(pub.exito).toBe(true);
    if (!pub.exito) return;

    // En DISPONIBLE no puede liberarse (409)
    const dispRes = await liberarDonacionAsignada(pub.codigo);
    expect(dispRes.exito).toBe(false);
    expect(dispRes.codigo).toBe(409);

    // Tomar primero por vol-10
    const toma = await tomarDonacion(pub.codigo, 'vol-10', 'Voluntario Asignado');
    expect(toma.exito).toBe(true);

    // Otro voluntario intenta liberar -> 403
    const ajeno = await liberarDonacionAsignada(pub.codigo, 'Intento ajeno', {
      id: 'vol-99',
      rol: 'VOLUNTARIO',
    });
    expect(ajeno.exito).toBe(false);
    expect(ajeno.codigo).toBe(403);

    // Voluntario asignado libera -> 200 y vuelve a DISPONIBLE
    const ok = await liberarDonacionAsignada(pub.codigo, 'Falla mecánica', {
      id: 'vol-10',
      rol: 'VOLUNTARIO',
    });
    expect(ok.exito).toBe(true);
    expect(ok.codigo).toBe(200);
  });

  test('CA-04.4: debe rechazar (400) merma negativa o mayor al total del lote y descontar merma válida', async () => {
    const pub = await publicarDonacion({
      tipoAlimento: 'Tomate Chonto',
      cantidadEstimada: 40,
      unidadMedida: 'kg',
      direccionRecogida: 'Cavasa Bodega 5',
      horaLimite: new Date(Date.now() + 3600_000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
      zona: 'ORIENTE',
    });
    expect(pub.exito).toBe(true);
    if (!pub.exito) return;

    await tomarDonacion(pub.codigo, 'vol-merma', 'Voluntario Merma');

    const mermaNegativa = await confirmarEntrega({
      donacionId: pub.codigo,
      nombreReceptor: 'Encargada Comedor Siloé',
      estadoFisico: 'BUENO',
      mermaKg: -5,
      voluntarioId: 'vol-merma',
    });
    expect(mermaNegativa.exito).toBe(false);
    expect(mermaNegativa.codigo).toBe(400);

    const mermaExcedida = await confirmarEntrega({
      donacionId: pub.codigo,
      nombreReceptor: 'Encargada Comedor Siloé',
      estadoFisico: 'REGULAR',
      mermaKg: 45,
      voluntarioId: 'vol-merma',
    });
    expect(mermaExcedida.exito).toBe(false);
    expect(mermaExcedida.codigo).toBe(400);

    const mermaValida = await confirmarEntrega({
      donacionId: pub.codigo,
      nombreReceptor: 'Encargada Comedor Siloé',
      estadoFisico: 'BUENO',
      mermaKg: 4,
      voluntarioId: 'vol-merma',
    });
    expect(mermaValida.exito).toBe(true);
    if (mermaValida.exito) {
      expect(mermaValida.donacion.cantidadEstimada).toBe(36);
    }
  });

  test('CA-01.1 / CMP-01: publicarDonacion no debe simular éxito si Supabase configurado falla', async () => {
    vi.spyOn(supabaseServer, 'esSupabaseConfigurado').mockReturnValue(true);
    const singleMock = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'violación de política RLS' },
    });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const insertMock = vi.fn().mockReturnValue({ select: selectMock });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    vi.spyOn(supabaseServer, 'createClient').mockReturnValue({ from: fromMock } as never);

    const res = await publicarDonacion({
      tipoAlimento: 'Arroz Blanco',
      cantidadEstimada: 20,
      unidadMedida: 'kg',
      direccionRecogida: 'Calle 15 # 10-20, Cali',
      horaLimite: new Date(Date.now() + 3600_000).toISOString(),
      requiereFrio: false,
      exencionSanitariaAceptada: true,
    });

    expect(res.exito).toBe(false);
    if (!res.exito) {
      expect(res.error).toContain('RLS');
    }
  });

  test('CA-05.1: eliminarDonacion debe rechazar si se omite el rol o si es rol operativo', async () => {
    const sinRol = await eliminarDonacion('seed-01');
    expect(sinRol.exito).toBe(false);

    const rolVoluntario = await eliminarDonacion('seed-01', 'VOLUNTARIO');
    expect(rolVoluntario.exito).toBe(false);

    const rolDonante = await eliminarDonacion('seed-01', 'DONANTE');
    expect(rolDonante.exito).toBe(false);
  });

  test('CA-PWA.1 / CA-PWA.2 / CA-PWA.3: public/sw.js pre-cachea rutas críticas, usa SWR en navegación y responde JSON 503 sin filtrar HTML', () => {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const sw = fs.readFileSync(swPath, 'utf8');

    for (const ruta of ["'/'", "'/login'", "'/donar'", "'/donaciones'", "'/ruta-activa'", "'/rastreo'", "'/~offline'"]) {
      expect(sw).toContain(ruta);
    }
    expect(sw).toContain('Stale-While-Revalidate');
    expect(sw).toContain('fetchConTimeout');
    expect(sw).toContain('3000');
    expect(sw).toContain('status: 503');
  });
});
