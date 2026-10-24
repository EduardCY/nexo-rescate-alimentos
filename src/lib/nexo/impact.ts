export type CategoryId =
  | "fruta"
  | "panaderia"
  | "lacteos"
  | "viandas"
  | "proteina"
  | "granos";

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  copPerKg: number;
  waterLPerKg: number;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: "fruta", label: "Fruta & Verdura Fresca", copPerKg: 4800, waterLPerKg: 650 },
  { id: "panaderia", label: "Panadería & Bollería", copPerKg: 9500, waterLPerKg: 1600 },
  { id: "lacteos", label: "Lácteos & Derivados", copPerKg: 6200, waterLPerKg: 1020 },
  { id: "viandas", label: "Viandas & Comida Preparada", copPerKg: 12000, waterLPerKg: 2500 },
  { id: "proteina", label: "Proteína Animal", copPerKg: 18000, waterLPerKg: 6000 },
  { id: "granos", label: "Granos & Abarrotes", copPerKg: 4200, waterLPerKg: 2500 },
];

export const categoryById = (id: CategoryId): CategoryInfo =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export const COLD_CHAIN_OPTIONS = [
  "Ambiente (sin refrigeración)",
  "4°C - 8°C",
  "0°C - 4°C",
  "Congelado (-18°C)",
] as const;
export type ColdChain = (typeof COLD_CHAIN_OPTIONS)[number];
export const requiresCold = (c: string) => c !== COLD_CHAIN_OPTIONS[0];

export const CO2_KG_PER_KG = 2.101;
export const KG_PER_RATION = 0.4;
export const DEDUCTION_RATE = 0.25;

export interface Impact {
  rations: number;
  co2Kg: number;
  waterL: number;
  valueCop: number;
  deductibleCop: number;
}

export function calcImpact(kg: number, categoryId: CategoryId): Impact {
  const safe = Number.isFinite(kg) && kg > 0 ? kg : 0;
  const cat = categoryById(categoryId);
  const valueCop = safe * cat.copPerKg;
  return {
    rations: Math.floor(safe / KG_PER_RATION),
    co2Kg: safe * CO2_KG_PER_KG,
    waterL: safe * cat.waterLPerKg,
    valueCop,
    deductibleCop: valueCop * DEDUCTION_RATE,
  };
}

export type Urgency = "CRÍTICO" | "ALTO" | "NORMAL";
export function urgencyOf(hoursLeft: number): Urgency {
  if (hoursLeft < 5) return "CRÍTICO";
  if (hoursLeft < 12) return "ALTO";
  return "NORMAL";
}

export type LotStatus = "available" | "assigned" | "delivered";

export interface Lot {
  id: string;
  donor: string;
  product: string;
  category: CategoryId;
  kg: number;
  hoursLeft: number;
  coldChain: string;
  dock: string;
  status: LotStatus;
  ngoId?: string;
}

export type NgoUrgency = "Alta" | "Media" | "Normal";

export interface Ngo {
  id: string;
  name: string;
  city: string;
  diners: number;
  urgency: NgoUrgency;
  hasFridge: boolean;
  distanceKm: number;
  prefers: CategoryId[];
}

export interface MatchScore {
  ngo: Ngo;
  eligible: boolean;
  reason?: string;
  total: number;
  proximity: number;
  urgency: number;
  affinity: number;
  etaMin: number;
}

const URGENCY_SCORE: Record<NgoUrgency, number> = { Alta: 100, Media: 65, Normal: 35 };
const AVG_SPEED_KMH = 30;

export function scoreMatch(lot: Lot, ngo: Ngo): MatchScore {
  const etaMin = Math.round((ngo.distanceKm / AVG_SPEED_KMH) * 60);
  const proximity = Math.max(0, 100 - ngo.distanceKm * 4);
  const urgency = URGENCY_SCORE[ngo.urgency];
  const affinity = ngo.prefers.includes(lot.category) ? 100 : 35;
  const total = Math.round(proximity * 0.35 + urgency * 0.3 + affinity * 0.25 + (lot.hoursLeft < 8 ? urgency : 70) * 0.1);
  let eligible = true;
  let reason: string | undefined;
  if (requiresCold(lot.coldChain) && !ngo.hasFridge) {
    eligible = false;
    reason = "Sin cadena de frío";
  } else if (etaMin > lot.hoursLeft * 60) {
    eligible = false;
    reason = "Vence antes de llegar";
  }
  return { ngo, eligible, reason, total, proximity, urgency, affinity, etaMin };
}

export function bestMatch(lot: Lot, ngos: Ngo[]): MatchScore | null {
  const scored = ngos.map((n) => scoreMatch(lot, n)).filter((s) => s.eligible);
  scored.sort((a, b) => b.total - a.total);
  return scored[0] ?? null;
}

export interface LogEntry {
  id: number;
  ts: string;
  level: "info" | "ok" | "warn";
  msg: string;
}

export interface Dispatch {
  lotId: string;
  ngoId: string;
  code: string;
  truck?: string;
  driver?: string;
  pickupAt?: string;
  deliverAt?: string;
}

export interface Delivery {
  lotId: string;
  concept: string;
  kg: number;
  recipient: string;
  deductibleCop: number;
}

export interface Totals {
  kg: number;
  rations: number;
  waterL: number;
  valueCop: number;
  efficiency: number | null;
}

export interface Certificate {
  legalName: string;
  nit: string;
  period: string;
  signature?: string;
}

export type MapNodeKind = "donor" | "receiver" | "agro" | "truck";

export interface MapNode {
  id: string;
  kind: MapNodeKind;
  x: number;
  y: number;
  label: string;
  sub?: string;
}

export const fmt = new Intl.NumberFormat("en-US");
export const fmtCop = (n: number) =>
  "$ " + new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n));
