import {
  db,
  obtenerDonacionesPendientes,
  marcarDonacionSincronizada,
  registrarFalloDonacionOffline,
  asegurarIdempotencyKeyDonacion,
  obtenerMutacionesProcesables,
  marcarMutacionSincronizada,
  registrarFalloMutacion,
  obtenerLastSyncTimestamp,
  type DonacionOffline,
  type OutboxMutation,
  type RecursoDelta,
} from '@/lib/db';
import { publicarDonacion, tomarDonacion, obtenerCambiosDelta } from '@/actions/donaciones';
import { confirmarEntrega } from '@/actions/entregas';
import type { DonacionInput } from '@/lib/validations/donacion';
import type { EntregaInput } from '@/lib/validations/entrega';
import type { ZonaCali } from '@/types';

let sincronizandoEnCurso = false;
let sincronizandoDeltaEnCurso = false;

export interface ResultadoSincronizacion {
  total: number;
  sincronizadas: number;
  fallidas: number;
  codigos: string[];
  /** Elementos que el servidor ya había procesado (reintentos detectados por idempotencyKey). */
  duplicadas?: number;
  /** Mutaciones del outbox omitidas porque una anterior de la misma entidad sigue pendiente. */
  omitidas?: number;
}

const RESULTADO_VACIO = (): ResultadoSincronizacion => ({
  total: 0,
  sincronizadas: 0,
  fallidas: 0,
  codigos: [],
  duplicadas: 0,
  omitidas: 0,
});

function estaOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function mensajeDeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Si la hora límite quedó vencida mientras no había red, se proyecta a +2 horas para no atascar la cola. */
function asegurarHoraLimiteFutura(horaLimite: string): string {
  const parsed = new Date(horaLimite);
  if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    return new Date(Date.now() + 2 * 3600 * 1000).toISOString();
  }
  return horaLimite;
}

/** Convierte una DonacionOffline en el payload que valida el servidor. */
function aDonacionInput(item: DonacionOffline): DonacionInput {
  return {
    tipoAlimento: item.tipoAlimento,
    cantidadEstimada: item.cantidadEstimada,
    unidadMedida: (item.unidadMedida as 'kg' | 'canastillas' | 'bultos' | 'unidades') || 'kg',
    direccionRecogida: item.direccionRecogida,
    indicacionesPuesto: item.indicacionesPuesto,
    telefonoDonante: item.telefonoDonante,
    zona: item.zona as ZonaCali | undefined,
    coordenadas: item.coordenadas,
    horaLimite: asegurarHoraLimiteFutura(item.horaLimite),
    requiereFrio: item.requiereFrio,
    exencionSanitariaAceptada: true,
    donanteId: item.donanteId,
    donanteNombre: item.donanteNombre,
  };
}

// ---------------------------------------------------------------------------
// Resultado de procesar una mutación del outbox
// ---------------------------------------------------------------------------

type ResultadoMutacion =
  | { tipo: 'ok'; codigo?: string; duplicada: boolean }
  /** Fallo transitorio (red, 500): se reintenta en el próximo ciclo. */
  | { tipo: 'reintentable'; error: string }
  /** Rechazo de negocio (409, 410, 403...): no se reintenta automáticamente. */
  | { tipo: 'terminal'; error: string };

async function procesarMutacion(m: OutboxMutation): Promise<ResultadoMutacion> {
  try {
    switch (m.tipoOperacion) {
      case 'CREATE_DONACION': {
        const payload = m.payload as unknown as DonacionInput & { codigoLocal?: string };
        const res = await publicarDonacion(
          { ...payload, horaLimite: asegurarHoraLimiteFutura(payload.horaLimite) },
          { idempotencyKey: m.idempotencyKey, codigoOrigenOffline: payload.codigoLocal }
        );
        return res.exito
          ? { tipo: 'ok', codigo: res.codigo, duplicada: !!res.duplicada }
          : { tipo: 'reintentable', error: res.error };
      }

      case 'TAKE_DONACION': {
        const p = m.payload as { donacionId?: string; voluntarioId?: string; voluntarioNombre?: string };
        const res = await tomarDonacion(
          p.donacionId || m.entidadId,
          p.voluntarioId,
          p.voluntarioNombre,
          m.idempotencyKey
        );
        if (res.exito) {
          return { tipo: 'ok', codigo: res.donacion.codigo, duplicada: !!res.duplicado };
        }
        return res.codigo === 500
          ? { tipo: 'reintentable', error: res.mensaje }
          : { tipo: 'terminal', error: res.mensaje };
      }

      case 'CONFIRM_ENTREGA': {
        const payload = m.payload as unknown as EntregaInput;
        const res = await confirmarEntrega({ ...payload, donacionId: payload.donacionId || m.entidadId });
        if (res.exito) {
          return { tipo: 'ok', codigo: res.donacion.codigo, duplicada: false };
        }
        // Reintento tras corte de red: el acta ya se había cerrado en el servidor.
        if (res.codigo === 409 && /ya fue entregada/i.test(res.mensaje)) {
          return { tipo: 'ok', codigo: undefined, duplicada: true };
        }
        return res.codigo === 500
          ? { tipo: 'reintentable', error: res.mensaje }
          : { tipo: 'terminal', error: res.mensaje };
      }

      default:
        return { tipo: 'terminal', error: `Tipo de operación no soportado: ${String(m.tipoOperacion)}` };
    }
  } catch (err) {
    return { tipo: 'reintentable', error: mensajeDeError(err) };
  }
}

// ---------------------------------------------------------------------------
// Sincronización de la cola (donaciones_offline + outbox_mutations)
// ---------------------------------------------------------------------------

/**
 * Procesa y sincroniza todo lo encolado en IndexedDB (Dexie.js) cuando se restablece la conexión
 * a Internet (CA-01.5 / CA-PWA.4 / RNF-002):
 *
 *  1. `donaciones_offline`: donaciones creadas sin red, enviadas con su idempotencyKey.
 *  2. `outbox_mutations`: CREATE_DONACION, TAKE_DONACION y CONFIRM_ENTREGA en orden FIFO.
 *
 * Cada envío lleva la idempotencyKey de origen, de modo que un reintento tras un corte de red no
 * genera registros duplicados en el servidor. Incluye salvaguarda de hora límite: si una donación
 * tiene una hora límite vencida, se proyecta a una ventana futura segura (+2 horas).
 */
export async function sincronizarColaOffline(): Promise<ResultadoSincronizacion> {
  if (sincronizandoEnCurso || estaOffline()) {
    return RESULTADO_VACIO();
  }

  sincronizandoEnCurso = true;

  try {
    const resultado = RESULTADO_VACIO();

    // 1) Donaciones guardadas con guardarDonacionOffline()
    const donaciones: DonacionOffline[] = await obtenerDonacionesPendientes();

    for (const item of donaciones) {
      if (!item.exencionSanitariaAceptada) continue;
      resultado.total++;

      const targetId = item.id ?? item.localId;
      try {
        const idempotencyKey = await asegurarIdempotencyKeyDonacion(item);
        const res = await publicarDonacion(aDonacionInput(item), {
          idempotencyKey,
          codigoOrigenOffline: item.codigoLocal ?? item.codigoTemporal,
        });

        if (res.exito) {
          resultado.codigos.push(res.codigo);
          resultado.sincronizadas++;
          if (res.duplicada) resultado.duplicadas = (resultado.duplicadas ?? 0) + 1;
          if (targetId !== undefined) {
            await marcarDonacionSincronizada(targetId, res.codigo);
          }
        } else {
          resultado.fallidas++;
          if (targetId !== undefined) await registrarFalloDonacionOffline(targetId, res.error);
        }
      } catch (err) {
        resultado.fallidas++;
        if (targetId !== undefined) {
          await registrarFalloDonacionOffline(targetId, mensajeDeError(err)).catch(() => undefined);
        }
      }
    }

    // 2) Outbox auditable
    const mutaciones = await obtenerMutacionesProcesables();
    // Preserva el orden causal: si una mutación de una entidad falla de forma transitoria,
    // las siguientes de esa misma entidad esperan al próximo ciclo.
    const entidadesBloqueadas = new Set<string>();

    for (const m of mutaciones) {
      if (m.id === undefined) continue;

      if (entidadesBloqueadas.has(m.entidadId)) {
        resultado.omitidas = (resultado.omitidas ?? 0) + 1;
        continue;
      }

      resultado.total++;
      const res = await procesarMutacion(m);

      if (res.tipo === 'ok') {
        resultado.sincronizadas++;
        if (res.duplicada) resultado.duplicadas = (resultado.duplicadas ?? 0) + 1;
        if (res.codigo) resultado.codigos.push(res.codigo);
        await marcarMutacionSincronizada(m.id, {
          resultadoCodigo: res.codigo,
          duplicada: res.duplicada,
        });
      } else {
        resultado.fallidas++;
        await registrarFalloMutacion(m.id, res.error, { terminal: res.tipo === 'terminal' });
        if (res.tipo === 'reintentable') entidadesBloqueadas.add(m.entidadId);
      }
    }

    return resultado;
  } catch {
    return RESULTADO_VACIO();
  } finally {
    sincronizandoEnCurso = false;
  }
}

// ---------------------------------------------------------------------------
// Sincronización delta de catálogo y donaciones (CA-PWA.5)
// ---------------------------------------------------------------------------

export interface ResultadoSincronizacionDelta {
  productosActualizados: number;
  donacionesActualizadas: number;
  /** `last_sync_timestamp` aplicado tras la sincronización (null si el recurso nunca devolvió datos). */
  lastSyncCatalogo: string | null;
  lastSyncDonaciones: string | null;
  /** Motivo por el que no se ejecutó, si aplica. */
  omitida?: 'sin-conexion' | 'en-curso';
  error?: string;
}

function maximaMarca(actual: string | null, candidatas: string[]): string | null {
  let max = actual;
  for (const c of candidatas) {
    if (!max || new Date(c).getTime() > new Date(max).getTime()) max = c;
  }
  return max;
}

async function guardarMarca(recurso: RecursoDelta, valor: string | null): Promise<void> {
  if (!valor) return;
  await db.meta_sync.put({
    clave: `last_sync_timestamp:${recurso}`,
    valor,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Actualiza `catalogo_productos` y `donaciones_cache` trayendo solo los registros con
 * `updated_at > last_sync_timestamp` (CA-PWA.5). La marca avanza únicamente si los datos se
 * escribieron: datos y marca se guardan en una sola transacción de IndexedDB.
 *
 * Al aplicar el delta se retiran de la caché las donaciones que ya no son útiles offline
 * (ENTREGADA, EXPIRADA o CANCELADA) para no crecer indefinidamente.
 */
export async function sincronizarCatalogoDelta(): Promise<ResultadoSincronizacionDelta> {
  const vacio: ResultadoSincronizacionDelta = {
    productosActualizados: 0,
    donacionesActualizadas: 0,
    lastSyncCatalogo: null,
    lastSyncDonaciones: null,
  };

  if (estaOffline()) return { ...vacio, omitida: 'sin-conexion' };
  if (sincronizandoDeltaEnCurso) return { ...vacio, omitida: 'en-curso' };

  sincronizandoDeltaEnCurso = true;

  try {
    const [desdeCatalogo, desdeDonaciones] = await Promise.all([
      obtenerLastSyncTimestamp('catalogo_productos'),
      obtenerLastSyncTimestamp('donaciones_cache'),
    ]);

    const cambios = await obtenerCambiosDelta({
      catalogoProductos: desdeCatalogo,
      donacionesCache: desdeDonaciones,
    });

    const nuevaMarcaCatalogo = maximaMarca(
      desdeCatalogo,
      cambios.productos.map((p) => p.updatedAt)
    );
    const nuevaMarcaDonaciones = maximaMarca(
      desdeDonaciones,
      cambios.donaciones.map((d) => d.updatedAt)
    );

    const inactivas = cambios.donaciones.filter((d) => d.estado !== 'DISPONIBLE').map((d) => d.id);
    const activas = cambios.donaciones.filter((d) => d.estado === 'DISPONIBLE');

    await db.transaction('rw', db.catalogo_productos, db.donaciones_cache, db.meta_sync, async () => {
      if (cambios.productos.length > 0) await db.catalogo_productos.bulkPut(cambios.productos);
      if (activas.length > 0) await db.donaciones_cache.bulkPut(activas);
      if (inactivas.length > 0) await db.donaciones_cache.bulkDelete(inactivas);
      await guardarMarca('catalogo_productos', nuevaMarcaCatalogo);
      await guardarMarca('donaciones_cache', nuevaMarcaDonaciones);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nexo:catalog-synced', {
          detail: {
            productos: cambios.productos.length,
            donaciones: cambios.donaciones.length,
          },
        })
      );
    }

    return {
      productosActualizados: cambios.productos.length,
      donacionesActualizadas: cambios.donaciones.length,
      lastSyncCatalogo: nuevaMarcaCatalogo,
      lastSyncDonaciones: nuevaMarcaDonaciones,
    };
  } catch (err) {
    return { ...vacio, error: mensajeDeError(err) };
  } finally {
    sincronizandoDeltaEnCurso = false;
  }
}
