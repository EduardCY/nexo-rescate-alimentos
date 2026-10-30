/**
 * [TASK-10] CMP-03 · Toma concurrente de donaciones con bloqueo de segunda toma
 *
 * Escenario principal: dos peticiones simultáneas con Promise.all() sobre DON-CONCURRENT-01
 * jamás deben asignar la donación a dos voluntarios.
 *
 * Los escenarios quedan como test.todo porque tomarDonacion() aún no existe en src/.
 * Esta suite aporta evidencia empírica (repetición con distintos órdenes de llegada),
 * no una demostración matemática: la garantía real depende de que la asignación sea
 * una operación atómica en la base de datos.
 */
import { describe, test } from 'vitest';

describe('CMP-03 · Toma concurrente de donaciones (TASK-10)', () => {
  // FALTA: parte de [RESPONSABLE DE tomarDonacion / CMP-03]. La función no existe en src/;
  // solo hay una versión de juguete dentro de tests/mvp-rules.test.ts (síncrona, sin carrera).
  // Contrato esperado: tomarDonacion(idDonacion, idVoluntario, nombre)
  //   -> { exito: true, codigo: 200 } al ganador
  //   -> { exito: false, codigo: 409, mensaje } al perdedor
  // Resultado esperado en almacenamiento: estado = 'ASIGNADA' y voluntarioId = ganador.
  // FALTA: parte de [RESPONSABLE DEL MODELO DE DATOS]. La persistencia real es Supabase
  // (src/actions/donaciones.ts) y la tabla no tiene columnas de voluntario; en src/lib/db.ts
  // "estado" es solo de sincronización (PENDIENTE/SINCRONIZADO/ERROR).
  test.todo('dos tomas simultáneas con Promise.all: una gana (200) y la otra recibe 409');
  test.todo('el registro DON-CONCURRENT-01 queda ASIGNADA con el voluntarioId del ganador');
  test.todo('100 iteraciones alternando el orden de llegada: nunca hay dos ganadores');
  test.todo('25 voluntarios simultáneos: exactamente uno gana');
});