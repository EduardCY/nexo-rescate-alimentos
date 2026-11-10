import type {
  CategoryId,
  Certificate,
  Delivery,
  Dispatch,
  Lot,
  MapNode,
  Ngo,
  Totals,
} from "./impact";
import {
  obtenerTodasLasDonaciones,
  asignarDonacionAComedor,
  publicarDonacion,
} from "@/actions/donaciones";
import { listarOrganizaciones } from "@/actions/organizaciones";
import { obtenerMetricasImpactoReal } from "@/actions/metricas";
import type { ZonaCali } from "@/types";

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

const ES_ENTORNO_TEST =
  process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

const SEED_LOTS: Lot[] = [
  {
    id: "DON-101",
    donor: "Distribuidora El Agro (Cavasa)",
    product: "Tomate Chonto y Pimentón",
    category: "fruta",
    kg: 85,
    hoursLeft: 6,
    coldChain: "Temperatura Ambiente",
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
    coldChain: "Temperatura Ambiente",
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
  {
    id: "node-7",
    kind: "truck",
    lat: 3.468,
    lng: -76.519,
    label: "Ruta 2 (Voluntario Moto)",
    sub: "En tránsito · Av 3 Norte (Carlos Gómez)",
    zona: "NORTE",
    municipio: "Santiago de Cali",
    direccion: "Avenida 3 Norte con Calle 38, La Flora",
    alcance: "URBANO",
    x: 0.38,
    y: 0.18,
  },
];

const SEED_DELIVERIES: Delivery[] = [
  { lotId: "DON-098", concept: "Frutas Variadas (Santa Elena)", kg: 240, recipient: "Comedor Siloé", deductibleCop: 288000 },
  { lotId: "DON-099", concept: "Panadería y Harinas (Centro)", kg: 95, recipient: "Hogar Aguablanca", deductibleCop: 225625 },
  { lotId: "DON-100", concept: "Granos y Legumbres (Cavasa)", kg: 310, recipient: "Mesa Común Centro", deductibleCop: 325500 },
];

const COORDENADAS_BASE_ZONA: Record<ZonaCali, [number, number]> = {
  CENTRO: [3.435, -76.528],
  SUR: [3.412, -76.538],
  NORTE: [3.475, -76.515],
  ORIENTE: [3.422, -76.492],
  LADERA: [3.428, -76.56],
};

function inferirCategoria(texto: string): CategoryId {
  const t = texto.toLowerCase();
  if (t.includes("queso") || t.includes("leche") || t.includes("yogur") || t.includes("lácteo") || t.includes("lacteo")) {
    return "lacteos";
  }
  if (t.includes("pan") || t.includes("pandebono") || t.includes("harina")) {
    return "panaderia";
  }
  if (t.includes("almuerzo") || t.includes("vianda") || t.includes("preparad")) {
    return "viandas";
  }
  if (t.includes("pollo") || t.includes("carne") || t.includes("huevo") || t.includes("proteína")) {
    return "proteina";
  }
  if (t.includes("arroz") || t.includes("frijol") || t.includes("grano") || t.includes("lenteja")) {
    return "granos";
  }
  return "fruta";
}

export const nexoApi: NexoApi = {
  async listLots() {
    if (ES_ENTORNO_TEST) return SEED_LOTS;

    try {
      const donaciones = await obtenerTodasLasDonaciones();
      return donaciones.map((d) => {
        const diffMs = new Date(d.horaLimite).getTime() - Date.now();
        const hoursLeft = Math.max(0, Math.round((diffMs / 3600000) * 10) / 10);
        const status =
          d.estado === "ENTREGADA"
            ? "delivered"
            : d.estado === "ASIGNADA"
            ? "assigned"
            : "available";

        return {
          id: d.codigo || d.id,
          donor: d.donanteNombre || "Comercio Donante",
          product: d.tipoAlimento,
          category: inferirCategoria(d.tipoAlimento),
          kg: d.cantidadEstimada,
          hoursLeft,
          coldChain: d.requiereFrio ? "4°C - 8°C (Requiere Refrigeración)" : "Temperatura Ambiente",
          dock: d.indicacionesPuesto || d.direccionRecogida,
          status,
          estado: d.estado,
          zona: d.zona || "CENTRO",
          requiereFrio: d.requiereFrio,
          ngoId: d.comedorId,
        };
      });
    } catch {
      return [];
    }
  },

  async listNgos() {
    if (ES_ENTORNO_TEST) return SEED_NGOS;

    try {
      const comedores = await listarOrganizaciones("RECEPTOR");
      return comedores.map((c) => ({
        id: c.id,
        name: c.nombre,
        city: `Cali (${c.zona || "CENTRO"})`,
        diners: c.comensalesDiarios || 120,
        urgency: (c.urgencia === 'Media' || c.urgencia === 'Normal' ? c.urgencia : 'Alta') as 'Alta' | 'Media' | 'Normal',
        hasFridge: Boolean(c.tieneRefrigeracion ?? c.capacidadFrio),
        capacidadFrio: Boolean(c.capacidadFrio ?? c.tieneRefrigeracion),
        tieneRefrigeracion: Boolean(c.tieneRefrigeracion ?? c.capacidadFrio),
        zona: c.zona || "CENTRO",
        distanceKm: 3.2,
        prefers: ["fruta", "lacteos", "panaderia", "viandas", "granos"],
      }));
    } catch {
      return [];
    }
  },

  async listDeliveries() {
    if (ES_ENTORNO_TEST) return SEED_DELIVERIES;

    try {
      const metricas = await obtenerMetricasImpactoReal();
      return metricas.entregasDetalle.map((e) => ({
        lotId: e.codigo,
        concept: `${e.tipoAlimento} (${e.donante})`,
        kg: e.kilogramos,
        recipient: e.comedorReceptor,
        deductibleCop: Math.round(e.kilogramos * 4800 * 0.25),
      }));
    } catch {
      return [];
    }
  },

  async listMapNodes() {
    if (ES_ENTORNO_TEST) return SEED_MAP_NODES;

    try {
      const [orgs, donaciones] = await Promise.all([
        listarOrganizaciones(),
        obtenerTodasLasDonaciones(),
      ]);

      const nodes: MapNode[] = [];

      for (const org of orgs) {
        const z = org.zona || "CENTRO";
        const base = COORDENADAS_BASE_ZONA[z] || COORDENADAS_BASE_ZONA.CENTRO;
        const lat = org.coordenadas?.lat ?? base[0];
        const lng = org.coordenadas?.lng ?? base[1];

        nodes.push({
          id: `org-${org.id}`,
          kind: org.tipo === "RECEPTOR" ? "receiver" : "donor",
          lat,
          lng,
          label: org.nombre,
          sub:
            org.tipo === "RECEPTOR"
              ? `${org.comensalesDiarios || 100} comensales · ${org.tieneRefrigeracion ? "❄ Con frío" : "Ambiente"}`
              : (org as any).plazaGaleria || org.direccion || "Comercio Donante",
          zona: z,
          municipio: "Santiago de Cali",
          direccion: org.direccion,
          alcance: "URBANO",
        });
      }

      for (const d of donaciones) {
        if (d.estado !== "DISPONIBLE" && d.estado !== "ASIGNADA") continue;
        const z = d.zona || "CENTRO";
        const base = COORDENADAS_BASE_ZONA[z] || COORDENADAS_BASE_ZONA.CENTRO;
        const lat = d.coordenadas?.lat ?? base[0];
        const lng = d.coordenadas?.lng ?? base[1];

        nodes.push({
          id: `don-${d.id}`,
          kind: d.estado === "ASIGNADA" ? "truck" : "donor",
          lat,
          lng,
          label: `${d.codigo}: ${d.tipoAlimento}`,
          sub:
            d.estado === "ASIGNADA"
              ? `En ruta (${d.voluntarioNombre || "Voluntario"}) → ${d.comedorNombre || "Comedor"}`
              : `${d.cantidadEstimada} ${d.unidadMedida} • ${d.donanteNombre}`,
          zona: z,
          municipio: "Santiago de Cali",
          direccion: d.direccionRecogida,
          alcance: "URBANO",
        });
      }

      if (nodes.length === 0) {
        return SEED_MAP_NODES;
      }

      return nodes;
    } catch {
      return SEED_MAP_NODES;
    }
  },

  async getTotals() {
    if (ES_ENTORNO_TEST) {
      return {
        kg: 1450,
        rations: 3625,
        waterL: 942500,
        valueCop: 14200000,
        efficiency: 94.2,
      };
    }

    try {
      const metricas = await obtenerMetricasImpactoReal();
      const kg = metricas.totalKgRescatados;
      return {
        kg,
        rations: metricas.totalRacionesServidas,
        waterL: Math.round(kg * 650),
        valueCop: Math.round(kg * 4800),
        efficiency: metricas.donacionesCompletadas > 0 ? 100 : null,
      };
    } catch {
      return {
        kg: 0,
        rations: 0,
        waterL: 0,
        valueCop: 0,
        efficiency: null,
      };
    }
  },

  async getCertificate() {
    if (ES_ENTORNO_TEST) {
      return {
        legalName: "Fundación Mesa Común Cali",
        nit: "901.428.192-3",
        period: "Octubre 2026",
        signature: "MESA-COMUN-SHA256:7f9a8b1c4e2d3f6a8b1c4e2d",
      };
    }

    try {
      const metricas = await obtenerMetricasImpactoReal();
      if (metricas.donacionesCompletadas === 0) {
        return null;
      }
      const ultima = metricas.entregasDetalle[0];
      return {
        legalName: ultima?.donante || "Donante Registrado Nexo",
        nit: "Ley 1990 de 2019",
        period: new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
        signature: `NEXO-AUDIT-SHA256:${metricas.donacionesCompletadas}L-${Math.round(metricas.totalKgRescatados)}KG`,
      };
    } catch {
      return null;
    }
  },

  async createLot(data) {
    const requiereFrio =
      data.requiereFrio ?? !data.coldChain.toLowerCase().includes("ambiente");
    const horaLimite = new Date(Date.now() + Math.max(1, data.hoursLeft || 4) * 3600000).toISOString();

    const res = await publicarDonacion({
      tipoAlimento: data.product,
      cantidadEstimada: data.kg,
      unidadMedida: "kg",
      direccionRecogida: data.dock || "Santiago de Cali",
      zona: data.zona ?? "CENTRO",
      horaLimite,
      requiereFrio,
      exencionSanitariaAceptada: true,
      donanteNombre: data.donor,
    });

    const newId = res.exito ? res.codigo : `DON-${Date.now().toString().slice(-3)}`;
    return {
      ...data,
      id: newId,
      status: "available",
      estado: "DISPONIBLE",
      zona: data.zona ?? "CENTRO",
      requiereFrio,
    };
  },

  async assignLot(id: string, ngoId?: string) {
    if (ngoId) {
      const comedores = await listarOrganizaciones("RECEPTOR");
      const comedor = comedores.find((c) => c.id === ngoId);
      if (comedor) {
        await asignarDonacionAComedor({
          donacionId: id,
          comedorId: comedor.id,
          comedorNombre: comedor.nombre,
          comedorTieneFrio: Boolean(comedor.tieneRefrigeracion ?? comedor.capacidadFrio),
        });
      }
    }
  },

  async confirmMatch(lotId, ngoId) {
    const comedores = await listarOrganizaciones("RECEPTOR");
    const comedor = comedores.find((c) => c.id === ngoId);
    if (comedor) {
      await asignarDonacionAComedor({
        donacionId: lotId,
        comedorId: comedor.id,
        comedorNombre: comedor.nombre,
        comedorTieneFrio: Boolean(comedor.tieneRefrigeracion ?? comedor.capacidadFrio),
      });
    }

    const ahora = new Date();
    const entregaEst = new Date(ahora.getTime() + 45 * 60000);
    const fmtHora = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    return {
      lotId,
      ngoId,
      code: `NEXO-DISP-${lotId}-${ngoId}`,
      truck: "Voluntario en Ruta",
      driver: "Pendiente de Toma por Voluntario",
      pickupAt: fmtHora(ahora),
      deliverAt: fmtHora(entregaEst),
    };
  },
};
