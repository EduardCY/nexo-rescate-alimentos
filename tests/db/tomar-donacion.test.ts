/**
 * TASK-08 · Pruebas de integración del RPC `tomar_donacion` (CMP-03 · ADR-001)
 * contra un PostgreSQL REAL (no simulado), incluida la prueba de concurrencia
 * exigida por el DoD de CMP-03: dos peticiones simultáneas nunca asignan la
 * misma donación dos veces.
 *
 * Por qué procesos `psql` y no un mock: el bloqueo `SELECT ... FOR UPDATE` solo
 * existe entre conexiones distintas. Cada `psql` es una conexión independiente;
 * todas esperan a una misma hora de arranque y disparan la llamada a la vez.
 *
 * Se ejecuta SOLO si existe `TEST_DATABASE_URL` (para no romper `npm run test`
 * en máquinas sin base de datos). Requisitos de esa base:
 *   - Migraciones de `supabase/migrations/` aplicadas en orden.
 *   - Roles `anon` y `authenticated` (ya existen en Supabase) con los privilegios
 *     de tabla por defecto de Supabase; el RLS es lo que decide el acceso.
 *   - `psql` disponible en el PATH.
 *
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/nexo_test npm run test
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DATABASE_URL = process.env.TEST_DATABASE_URL;
const execFileAsync = promisify(execFile);

interface ResultadoRpc {
  exito: boolean;
  codigo: number;
  mensaje: string;
  [clave: string]: unknown;
}

interface Voluntario {
  id: string;
  nombre: string;
}

const MSG_CONFLICTO =
  'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.';
const MSG_NO_VIGENTE = 'La oferta seleccionada ya no se encuentra vigente para recogida.';

/** Ejecuta cada sentencia con `-c` dentro de UNA misma sesión y devuelve la última línea no vacía. */
async function psql(sentencias: string[]): Promise<string> {
  const args = ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-d', DATABASE_URL as string];
  for (const sql of sentencias) {
    args.push('-c', sql);
  }
  const { stdout } = await execFileAsync('psql', args);
  const lineas = stdout.split('\n').filter((l) => l.trim() !== '');
  return lineas.length > 0 ? lineas[lineas.length - 1] : '';
}

/** Llama al RPC con el rol `anon`, igual que lo haría supabase-js con la anon key. */
async function tomar(
  donacionId: string,
  voluntarioId: string,
  nombre: string,
  previas: string[] = []
): Promise<ResultadoRpc> {
  const salida = await psql([
    'SET ROLE anon',
    ...previas,
    `SELECT tomar_donacion('${donacionId}'::uuid, '${voluntarioId}'::uuid, '${nombre}')::text`,
  ]);
  return JSON.parse(salida) as ResultadoRpc;
}

/** Dispara N llamadas desde conexiones distintas a una misma hora de arranque. */
async function tomarSimultaneo(donacionId: string, voluntarios: Voluntario[]): Promise<ResultadoRpc[]> {
  const arranque = new Date(Date.now() + 2500).toISOString();
  const espera = `SELECT pg_sleep(GREATEST(0, EXTRACT(EPOCH FROM ('${arranque}'::timestamptz - clock_timestamp()))))`;
  return Promise.all(
    voluntarios.map((v) => tomar(donacionId, v.id, v.nombre, [espera]))
  );
}

const usuariosCreados: string[] = [];
const donacionesCreadas: string[] = [];

async function crearUsuario(rol: 'VOLUNTARIO' | 'DONANTE' | 'RECEPTOR', nombre: string): Promise<Voluntario> {
  const id = randomUUID();
  await psql([
    `INSERT INTO usuarios (id, nombre, email, rol, telefono)
     VALUES ('${id}', '${nombre}', '${id}@test.nexo', '${rol}', '3000000000')`,
  ]);
  usuariosCreados.push(id);
  return { id, nombre };
}

async function crearDonacion(
  donanteId: string,
  opciones: { estado?: string; horaLimite?: string } = {}
): Promise<string> {
  const id = randomUUID();
  const estado = opciones.estado ?? 'DISPONIBLE';
  const horaLimite = opciones.horaLimite ?? "NOW() + interval '4 hours'";
  await psql([
    `INSERT INTO donaciones
       (id, donante_id, donante_nombre, tipo_alimento, cantidad_estimada, unidad_medida,
        direccion_recogida, hora_limite, estado, exencion_sanitaria_aceptada)
     VALUES ('${id}', '${donanteId}', 'Donante Test', 'Tomate', 50, 'kg',
             'Plaza Cavasa', ${horaLimite}, '${estado}', true)`,
  ]);
  donacionesCreadas.push(id);
  return id;
}

async function leerDonacion(id: string): Promise<{ estado: string; voluntario_id: string | null }> {
  const salida = await psql([
    `SELECT json_build_object('estado', estado, 'voluntario_id', voluntario_id)::text FROM donaciones WHERE id = '${id}'`,
  ]);
  return JSON.parse(salida) as { estado: string; voluntario_id: string | null };
}

async function contarEventos(id: string, estadoNuevo: string): Promise<number> {
  const salida = await psql([
    `SELECT count(*) FROM trazabilidad_eventos WHERE donacion_id = '${id}' AND estado_nuevo = '${estadoNuevo}'`,
  ]);
  return Number(salida);
}

describe.skipIf(!DATABASE_URL)('TASK-08 · tomar_donacion contra PostgreSQL real', () => {
  let donante: Voluntario;
  let juan: Voluntario;
  let carlos: Voluntario;

  beforeAll(async () => {
    const roles = await psql(["SELECT count(*) FROM pg_roles WHERE rolname IN ('anon', 'authenticated')"]);
    if (Number(roles) !== 2) {
      throw new Error("La base de pruebas necesita los roles 'anon' y 'authenticated' (existen por defecto en Supabase).");
    }
    donante = await crearUsuario('DONANTE', 'Donante Test');
    juan = await crearUsuario('VOLUNTARIO', 'Juan Perez');
    carlos = await crearUsuario('VOLUNTARIO', 'Carlos Gomez');
  }, 30000);

  afterAll(async () => {
    if (donacionesCreadas.length > 0) {
      const ids = donacionesCreadas.map((i) => `'${i}'`).join(',');
      await psql([`DELETE FROM donaciones WHERE id IN (${ids})`]);
    }
    if (usuariosCreados.length > 0) {
      const ids = usuariosCreados.map((i) => `'${i}'`).join(',');
      await psql([`DELETE FROM usuarios WHERE id IN (${ids})`]);
    }
  }, 30000);

  it('CA-03.1: el primer solicitante recibe 200, queda ASIGNADA y se audita (llamando como anon)', async () => {
    const id = await crearDonacion(donante.id);

    const res = await tomar(id, juan.id, juan.nombre);

    expect(res.codigo).toBe(200);
    expect(res.exito).toBe(true);
    expect(res.estado).toBe('ASIGNADA');
    expect(res.direccion_recogida).toBe('Plaza Cavasa');
    expect(typeof res.asignada_at).toBe('string');

    const fila = await leerDonacion(id);
    expect(fila).toEqual({ estado: 'ASIGNADA', voluntario_id: juan.id });
    expect(await contarEventos(id, 'ASIGNADA')).toBe(1);
  });

  it('CA-03.2: una segunda toma secuencial recibe 409 y no cambia al responsable', async () => {
    const id = await crearDonacion(donante.id);
    await tomar(id, juan.id, juan.nombre);

    const res = await tomar(id, carlos.id, carlos.nombre);

    expect(res.codigo).toBe(409);
    expect(res.exito).toBe(false);
    expect(res.mensaje).toBe(MSG_CONFLICTO);
    expect((await leerDonacion(id)).voluntario_id).toBe(juan.id);
    expect(await contarEventos(id, 'ASIGNADA')).toBe(1);
  });

  it.each(['EXPIRADA', 'CANCELADA'])('CA-03.3: una donación %s responde 410 con el mensaje de oferta no vigente', async (estado) => {
    const id = await crearDonacion(donante.id, { estado });

    const res = await tomar(id, juan.id, juan.nombre);

    expect(res.codigo).toBe(410);
    expect(res.mensaje).toBe(MSG_NO_VIGENTE);
    expect((await leerDonacion(id)).estado).toBe(estado);
  });

  it('una donación DISPONIBLE con hora límite vencida pasa a EXPIRADA, responde 410 y deja evento', async () => {
    const id = await crearDonacion(donante.id, { horaLimite: "NOW() - interval '1 minute'" });

    const res = await tomar(id, juan.id, juan.nombre);

    expect(res.codigo).toBe(410);
    expect(res.mensaje).toBe(MSG_NO_VIGENTE);
    expect((await leerDonacion(id)).estado).toBe('EXPIRADA');
    expect(await contarEventos(id, 'EXPIRADA')).toBe(1);
  });

  it('regresión: una donación ASIGNADA con hora vencida NO se expira; la segunda toma recibe 409', async () => {
    const id = await crearDonacion(donante.id);
    await tomar(id, juan.id, juan.nombre);
    await psql([`UPDATE donaciones SET hora_limite = NOW() - interval '1 minute' WHERE id = '${id}'`]);

    const res = await tomar(id, carlos.id, carlos.nombre);

    expect(res.codigo).toBe(409);
    expect(await leerDonacion(id)).toEqual({ estado: 'ASIGNADA', voluntario_id: juan.id });
    expect(await contarEventos(id, 'EXPIRADA')).toBe(0);
  });

  it('un voluntario inexistente recibe 404 controlado (sin excepción SQL) y la donación sigue DISPONIBLE', async () => {
    const id = await crearDonacion(donante.id);

    const res = await tomar(id, randomUUID(), 'Fantasma');

    expect(res.codigo).toBe(404);
    expect((await leerDonacion(id)).estado).toBe('DISPONIBLE');
  });

  it('un DONANTE no puede tomar donaciones (403)', async () => {
    const id = await crearDonacion(donante.id);

    const res = await tomar(id, donante.id, donante.nombre);

    expect(res.codigo).toBe(403);
    expect((await leerDonacion(id)).estado).toBe('DISPONIBLE');
  });

  it('parámetros nulos responden 400', async () => {
    const salida = await psql([
      'SET ROLE anon',
      "SELECT tomar_donacion(NULL::uuid, NULL::uuid, NULL::varchar)::text",
    ]);
    expect((JSON.parse(salida) as ResultadoRpc).codigo).toBe(400);
  });

  it('el cliente anon NO puede cambiar el estado con un UPDATE directo: solo el RPC muta', async () => {
    const id = await crearDonacion(donante.id);

    await psql(['SET ROLE anon', `UPDATE donaciones SET estado = 'ASIGNADA' WHERE id = '${id}'`]);

    expect((await leerDonacion(id)).estado).toBe('DISPONIBLE');
  });

  it('DoD CMP-03: 20 voluntarios simultáneos sobre la MISMA donación -> exactamente un 200 y diecinueve 409', async () => {
    const id = await crearDonacion(donante.id);
    const competidores: Voluntario[] = [];
    for (let i = 0; i < 20; i++) {
      competidores.push(await crearUsuario('VOLUNTARIO', `Voluntario ${i + 1}`));
    }

    const resultados = await tomarSimultaneo(id, competidores);

    const exitos = resultados.filter((r) => r.codigo === 200);
    const conflictos = resultados.filter((r) => r.codigo === 409);
    expect(exitos).toHaveLength(1);
    expect(conflictos).toHaveLength(19);

    const ganador = exitos[0].voluntario_id as string;
    expect(await leerDonacion(id)).toEqual({ estado: 'ASIGNADA', voluntario_id: ganador });
    expect(await contarEventos(id, 'ASIGNADA')).toBe(1);
  }, 60000);

  it('DoD CMP-03: 4 donaciones disputadas a la vez por 6 voluntarios cada una -> un solo ganador por donación', async () => {
    const donaciones: string[] = [];
    for (let i = 0; i < 4; i++) {
      donaciones.push(await crearDonacion(donante.id));
    }
    const competidores: Voluntario[] = [];
    for (let i = 0; i < 6; i++) {
      competidores.push(await crearUsuario('VOLUNTARIO', `Competidor ${i + 1}`));
    }

    const porDonacion = await Promise.all(donaciones.map((d) => tomarSimultaneo(d, competidores)));

    for (let i = 0; i < donaciones.length; i++) {
      expect(porDonacion[i].filter((r) => r.codigo === 200)).toHaveLength(1);
      expect(porDonacion[i].filter((r) => r.codigo === 409)).toHaveLength(5);
      expect(await contarEventos(donaciones[i], 'ASIGNADA')).toBe(1);
    }
  }, 90000);
});
