import {
  obtenerDonacionesPendientes,
  marcarDonacionSincronizada,
  type DonacionOffline,
} from '@/lib/db';
import { publicarDonacion } from '@/actions/donaciones';
import type { ZonaCali } from '@/types';

let sincronizandoEnCurso = false;

export interface ResultadoSincronizacion {
  total: number;
  sincronizadas: number;
  fallidas: number;
  codigos: string[];
}

/**
 * Procesa y sincroniza todas las donaciones encoladas en IndexedDB (Dexie.js)
 * cuando se restablece la conexión a Internet (CA-01.5 / RNF-002).
 *
 * Incluye salvaguarda de hora límite: si una donación almacenada localmente
 * tiene una hora límite vencida, la proyecta a una ventana futura segura (+2 horas)
 * para que no quede atascada permanentemente en la cola local.
 */
export async function sincronizarColaOffline(): Promise<ResultadoSincronizacion> {
  if (sincronizandoEnCurso) {
    return { total: 0, sincronizadas: 0, fallidas: 0, codigos: [] };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { total: 0, sincronizadas: 0, fallidas: 0, codigos: [] };
  }

  sincronizandoEnCurso = true;

  try {
    const items: DonacionOffline[] = await obtenerDonacionesPendientes();
    if (items.length === 0) {
      return { total: 0, sincronizadas: 0, fallidas: 0, codigos: [] };
    }

    const codigos: string[] = [];
    let sincronizadas = 0;
    let fallidas = 0;

    for (const item of items) {
      if (!item.exencionSanitariaAceptada) continue;

      try {
        // Asegurar que la hora límite sea futura al momento de sincronizar
        let horaLimiteSegura = item.horaLimite;
        const parsedFecha = new Date(item.horaLimite);
        if (isNaN(parsedFecha.getTime()) || parsedFecha.getTime() <= Date.now()) {
          horaLimiteSegura = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        }

        const res = await publicarDonacion({
          tipoAlimento: item.tipoAlimento,
          cantidadEstimada: item.cantidadEstimada,
          unidadMedida: (item.unidadMedida as 'kg' | 'canastillas' | 'bultos' | 'unidades') || 'kg',
          direccionRecogida: item.direccionRecogida,
          indicacionesPuesto: item.indicacionesPuesto,
          telefonoDonante: item.telefonoDonante,
          zona: item.zona as ZonaCali | undefined,
          coordenadas: item.coordenadas,
          horaLimite: horaLimiteSegura,
          requiereFrio: item.requiereFrio,
          exencionSanitariaAceptada: true,
          donanteId: item.donanteId,
          donanteNombre: item.donanteNombre,
        });

        if (res.exito) {
          codigos.push(res.codigo);
          sincronizadas++;
          const targetId = item.id ?? item.localId;
          if (targetId !== undefined) {
            await marcarDonacionSincronizada(targetId, res.codigo);
          }
        } else {
          fallidas++;
        }
      } catch {
        fallidas++;
      }
    }

    return {
      total: items.length,
      sincronizadas,
      fallidas,
      codigos,
    };
  } catch {
    return { total: 0, sincronizadas: 0, fallidas: 0, codigos: [] };
  } finally {
    sincronizandoEnCurso = false;
  }
}
