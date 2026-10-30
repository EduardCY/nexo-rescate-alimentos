'use client';

import { useState, useEffect } from 'react';

export interface CountdownState {
  horasRestantes: number;
  minutosRestantes: number;
  segundosRestantes: number;
  segundosTotales: number;
  tiempoFormateado: string;
  expirado: boolean;
  esMuyUrgente: boolean;
  esUrgenciaMedia: boolean;
}

/**
 * Calcula los segundos restantes entre la hora límite y el instante actual.
 * Soporta tanto cadenas ISO completas como formatos de hora local HH:mm.
 */
function calcularSegundosRestantes(horaLimite: string): number {
  const match = horaLimite.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (match) {
    const ahora = new Date();
    const horas = parseInt(match[1], 10);
    const minutos = parseInt(match[2], 10);
    const objetivo = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
      horas,
      minutos,
      0,
      0
    );
    return Math.max(0, Math.floor((objetivo.getTime() - ahora.getTime()) / 1000));
  }

  const ms = new Date(horaLimite).getTime() - Date.now();
  return isNaN(ms) ? 0 : Math.max(0, Math.floor(ms / 1000));
}

/**
 * Hook reactivo de cuenta regresiva para la ventana de inocuidad de donaciones (TASK-16 / CA-02.4).
 *
 * ¿Por qué?: Los alimentos perecederos en plazas de mercado cuentan con una ventana estricta de
 * retiro antes de perder su aptitud de consumo. Este hook actualiza cada segundo el tiempo restante
 * y dispara automáticamente la transición de expiración cuando el contador llega a cero.
 *
 * @param horaLimite Marca temporal ISO o cadena HH:mm de vencimiento.
 * @param onExpire Callback invocado exactamente cuando la oferta vence.
 */
export function useCountdown(
  horaLimite: string,
  onExpire?: () => void
): CountdownState {
  const [segundosTotales, setSegundosTotales] = useState<number>(() =>
    calcularSegundosRestantes(horaLimite)
  );

  useEffect(() => {
    const inicial = calcularSegundosRestantes(horaLimite);
    setSegundosTotales(inicial);
    if (inicial === 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      const seg = calcularSegundosRestantes(horaLimite);
      setSegundosTotales(seg);

      if (seg === 0) {
        clearInterval(timer);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [horaLimite, onExpire]);

  const horasRestantes = Math.floor(segundosTotales / 3600);
  const minutosRestantes = Math.floor((segundosTotales % 3600) / 60);
  const segundosRestantes = segundosTotales % 60;

  const tiempoFormateado = `${String(horasRestantes).padStart(2, '0')}:${String(
    minutosRestantes
  ).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`;

  return {
    horasRestantes,
    minutosRestantes,
    segundosRestantes,
    segundosTotales,
    tiempoFormateado,
    expirado: segundosTotales <= 0,
    esMuyUrgente: horasRestantes < 2,
    esUrgenciaMedia: horasRestantes >= 2 && horasRestantes < 4,
  };
}

export default useCountdown;
