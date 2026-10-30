import type {
  Certificate,
  Delivery,
  Dispatch,
  Lot,
  MapNode,
  Ngo,
  Totals,
} from "./impact";

export type NewLot = Omit<Lot, "id" | "status">;

export interface NexoApi {
  listLots(): Promise<Lot[]>;
  listNgos(): Promise<Ngo[]>;
  listDeliveries(): Promise<Delivery[]>;
  listMapNodes(): Promise<MapNode[]>;
  getTotals(): Promise<Totals>;
  getCertificate(): Promise<Certificate | null>;
  createLot(data: NewLot): Promise<Lot>;
  assignLot(id: string, ngoId?: string): Promise<void>;
  confirmMatch(lotId: string, ngoId: string): Promise<Dispatch>;
}

const SEED_LOTS: Lot[] = [
  {
    id: "DON-101",
    donor: "Distribuidora El Agro (Cavasa)",
    product: "Tomate Chonto y Pimentón",
    category: "fruta",
    kg: 85,
    hoursLeft: 6,
    coldChain: "Ambiente (sin refrigeración)",
    dock: "Módulo 3 Bodega 12",
    status: "available",
    estado: "DISPONIBLE",
    zona: "ORIENTE",
    requiereFrio: false,
  },
  {
    id: "DON-102",
    donor: "Puesto 45 Doña Rosa (Santa Elena)",
    product: "Plátano Hartón Maduro",
    category: "fruta",
    kg: 120,
    hoursLeft: 12,
    coldChain: "Ambiente (sin refrigeración)",
    dock: "Puesto 45 Galería",
    status: "available",
    estado: "DISPONIBLE",
    zona: "CENTRO",
    requiereFrio: false,
  },
  {
    id: "DON-103",
    donor: "Lácteos del Valle (Alameda)",
    product: "Queso Costeño y Cuajada",
    category: "lacteos",
    kg: 30,
    hoursLeft: 4,
    coldChain: "4°C - 8°C",
    dock: "Local 18 Galería Alameda",
    status: "available",
    estado: "DISPONIBLE",
    zona: "SUR",
    requiereFrio: true,
  },
];

const SEED_NGOS: Ngo[] = [
  {
    id: "ngo-siloe",
    name: "Comedor Comunitario Siloé",
    city: "Cali (Ladera)",
    diners: 280,
    urgency: "Alta",
    hasFridge: true,
    capacidadFrio: true,
    tieneRefrigeracion: true,
    zona: "LADERA",
    distanceKm: 5.4,
    prefers: ["fruta", "lacteos", "viandas"],
  },
  {
    id: "ngo-aguablanca",
    name: "Hogar de Paso Aguablanca",
    city: "Cali (Oriente)",
    diners: 420,
    urgency: "Alta",
    hasFridge: true,
    capacidadFrio: true,
    tieneRefrigeracion: true,
    zona: "ORIENTE",
    distanceKm: 7.8,
    prefers: ["fruta", "panaderia", "granos"],
  },
  {
    id: "ngo-centro",
    name: "Fundación Mesa Común Centro",
    city: "Cali (Centro)",
    diners: 150,
    urgency: "Media",
    hasFridge: false,
    capacidadFrio: false,
    tieneRefrigeracion: false,
    zona: "CENTRO",
    distanceKm: 2.1,
    prefers: ["fruta", "panaderia"],
  },
];

const SEED_MAP_NODES: MapNode[] = [
  {
    id: "node-1",
    kind: "donor",
    lat: 3.4258,
    lng: -76.5244,
    label: "Santa Elena",
    sub: "Puesto 45 Doña Rosa",
    zona: "CENTRO",
    municipio: "Santiago de Cali",
    direccion: "Galería Santa Elena - Sector Muelle 2",
    alcance: "URBANO",
    x: 0.35,
    y: 0.45,
  },
  {
    id: "node-2",
    kind: "agro",
    lat: 3.4111,
    lng: -76.4161,
    label: "Cavasa Central",
    sub: "Módulo 3 Bodega 12",
    zona: "ORIENTE",
    municipio: "Candelaria",
    direccion: "Km 11 Vía Cali - Candelaria, Cavasa",
    alcance: "METROPOLITANO",
    x: 0.75,
    y: 0.25,
  },
  {
    id: "node-3",
    kind: "receiver",
    lat: 3.4285,
    lng: -76.5572,
    label: "Comedor Siloé",
    sub: "280 comensales",
    zona: "LADERA",
    municipio: "Santiago de Cali",
    direccion: "Calle 1 Oeste # 50-12, Siloé",
    alcance: "URBANO",
    x: 0.25,
    y: 0.7,
  },
  {
    id: "node-4",
    kind: "receiver",
    lat: 3.4182,
    lng: -76.4895,
    label: "Hogar Aguablanca",
    sub: "420 comensales",
    zona: "ORIENTE",
    municipio: "Santiago de Cali",
    direccion: "Carrera 27 # 78-10, Aguablanca",
    alcance: "URBANO",
    x: 0.55,
    y: 0.65,
  },
  {
    id: "node-5",
    kind: "truck",
    lat: 3.4315,
    lng: -76.541,
    label: "Ruta 1 (Voluntario Carromoto)",
    sub: "En tránsito · Calle 5ta",
    zona: "CENTRO",
    municipio: "Santiago de Cali",
    direccion: "Calle 5 con Carrera 27, San Fernando",
    alcance: "URBANO",
    x: 0.42,
    y: 0.48,
  },
  {
    id: "node-6",
    kind: "donor",
    lat: 3.4372,
    lng: -76.5389,
    label: "Plaza Alameda",
    sub: "Local 18 Lácteos",
    zona: "SUR",
    municipio: "Santiago de Cali",
    direccion: "Plaza Alameda - Pasillo Central",
    alcance: "URBANO",
    x: 0.48,
    y: 0.38,
  },
];

const SEED_DELIVERIES: Delivery[] = [
  { lotId: "DON-098", concept: "Frutas Variadas (Santa Elena)", kg: 240, recipient: "Comedor Siloé", deductibleCop: 288000 },
  { lotId: "DON-099", concept: "Panadería y Harinas (Centro)", kg: 95, recipient: "Hogar Aguablanca", deductibleCop: 225625 },
  { lotId: "DON-100", concept: "Granos y Legumbres (Cavasa)", kg: 310, recipient: "Mesa Común Centro", deductibleCop: 325500 },
];

export const nexoApi: NexoApi = {
  async listLots() {
    return SEED_LOTS;
  },
  async listNgos() {
    return SEED_NGOS;
  },
  async listDeliveries() {
    return SEED_DELIVERIES;
  },
  async listMapNodes() {
    return SEED_MAP_NODES;
  },
  async getTotals() {
    return {
      kg: 1450,
      rations: 3625,
      waterL: 942500,
      valueCop: 14200000,
      efficiency: 94.2,
    };
  },
  async getCertificate() {
    return {
      legalName: "Fundación Mesa Común Cali",
      nit: "901.428.192-3",
      period: "Octubre 2026",
      signature: "MESA-COMUN-SHA256:7f9a8b1c4e2d3f6a8b1c4e2d",
    };
  },
  async createLot(data) {
    const newId = `DON-${Date.now().toString().slice(-3)}`;
    return {
      ...data,
      id: newId,
      status: "available",
      estado: "DISPONIBLE",
      zona: data.zona ?? "CENTRO",
      requiereFrio: data.requiereFrio ?? !data.coldChain.toLowerCase().includes("ambiente"),
    };
  },
  async assignLot() {},
  async confirmMatch(lotId, ngoId) {
    return {
      lotId,
      ngoId,
      code: `NEXO-DISP-${lotId}-${ngoId}`,
      truck: "Unidad 04 (Carromoto Piaggio)",
      driver: "Carlos Restrepo (Voluntario)",
      pickupAt: "14:30",
      deliverAt: "15:45",
    };
  },
};
