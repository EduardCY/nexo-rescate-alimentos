/**
 * [TASK-17] CMP-02 · Catálogo, Filtros y Cadena de Frío
 * Criterios BDD: CA-02.1, CA-02.2, CA-02.3, CA-02.4
 *
 * Aislamiento: fixtures locales, sin red, sin Supabase, sin Dexie real.
 * Los escenarios sin código de producción quedan como test.todo y se
 * convierten en pruebas reales cuando su responsable suba la lógica.
 */
import { describe, test } from 'vitest';

// Reloj de referencia fijo (en CA-02.4 se usa con vi.useFakeTimers / vi.setSystemTime)
const AHORA = new Date('2026-10-29T15:00:00.000Z');
const enMinutos = (m: number) => new Date(AHORA.getTime() + m * 60_000).toISOString();

// AJUSTA: nombres de campos al modelo real de src/types/index.ts
export const DONACIONES_FIXTURE = [
  { id: 'D-01', estado: 'DISPONIBLE', zona: 'NORTE',   requiereFrio: false, horaLimite: enMinutos(120) },
  { id: 'D-02', estado: 'DISPONIBLE', zona: 'SUR',     requiereFrio: true,  horaLimite: enMinutos(90) },
  { id: 'D-03', estado: 'ASIGNADA',   zona: 'LADERA',  requiereFrio: false, horaLimite: enMinutos(60) },
  { id: 'D-04', estado: 'ENTREGADA',  zona: 'ORIENTE', requiereFrio: false, horaLimite: enMinutos(-240) },
  { id: 'D-05', estado: 'EXPIRADA',   zona: 'CENTRO',  requiereFrio: false, horaLimite: enMinutos(-30) },
  { id: 'D-06', estado: 'DISPONIBLE', zona: 'CENTRO',  requiereFrio: false, horaLimite: enMinutos(-5) }, // vencida, aún marcada disponible
  { id: 'D-07', estado: 'DISPONIBLE', zona: 'LADERA',  requiereFrio: true,  horaLimite: enMinutos(45) },
  { id: 'D-08', estado: 'DISPONIBLE', zona: 'ORIENTE', requiereFrio: false, horaLimite: enMinutos(30) },
];

export const ORGANIZACIONES_FIXTURE = [
  { id: 'ORG-CON-FRIO', capacidadFrio: true },
  { id: 'ORG-SIN-FRIO', capacidadFrio: false },
];

describe('CMP-02 · Catálogo, Filtros y Cadena de Frío', () => {
  describe('CA-02.1 · El catálogo solo muestra donaciones disponibles', () => {
    // Dado un conjunto de donaciones en estados DISPONIBLE, ASIGNADA, ENTREGADA y EXPIRADA
    // Cuando se consulta el catálogo
    // Entonces solo aparecen las DISPONIBLES
    // FALTA: parte de [RESPONSABLE DEL CATÁLOGO / CONSULTA DE DONACIONES]. Hoy el filtro está
    // dentro de componentes con otro modelo ("available"), no hay función que se pueda llamar.
    test.todo('excluye ofertas en estado ASIGNADA, ENTREGADA o EXPIRADA');
  });

  describe('CA-02.2 · Lotes con cadena de frío', () => {
    // Dado un lote con requiereFrio: true
    // Entonces muestra la bandera visual de frío
    // Y no puede asignarse a una organización sin capacidad frigorífica
    // PENDIENTE DE REVISAR: scoreMatch (src/lib/nexo/impact.ts). Se escribe cuando se vea su firma.
    test.todo('un lote con frío no es elegible para una organización sin capacidad frigorífica');
    // FALTA: parte de [RESPONSABLE DE LA UI DEL CATÁLOGO] si la bandera visual no existe en LotCard.
    test.todo('un lote con requiereFrio: true muestra la bandera visual de frío');
  });

  describe('CA-02.3 · Filtro por sector de Cali', () => {
    // Dado donaciones de LADERA, NORTE, SUR, ORIENTE y CENTRO
    // Cuando se filtra por un sector, el resultado es determinístico y solo de ese sector
    // FALTA: parte de [RESPONSABLE DEL FILTRO POR ZONA]. La zona existe solo como tipo.
    test.todo('filtra por LADERA');
    test.todo('filtra por NORTE');
    test.todo('filtra por SUR');
    test.todo('filtra por ORIENTE');
    test.todo('filtra por CENTRO');
  });

  describe('CA-02.4 · Ofertas vencidas', () => {
    // Dado una oferta con horaLimite menor a Date.now()
    // Entonces su estado es expirado y no aparece en la colección disponible
    // FALTA: parte de [RESPONSABLE DE LA LÓGICA DE EXPIRACIÓN]. EXPIRADA existe solo como tipo.
    test.todo('una oferta con horaLimite vencida retorna estado expirado');
    test.todo('una oferta vencida se oculta de la colección disponible');
  });
});