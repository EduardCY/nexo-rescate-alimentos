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

export const nexoApi: NexoApi = {
  async listLots() {
    return [];
  },
  async listNgos() {
    return [];
  },
  async listDeliveries() {
    return [];
  },
  async listMapNodes() {
    return [];
  },
  async getTotals() {
    return { kg: 0, rations: 0, waterL: 0, valueCop: 0, efficiency: null };
  },
  async getCertificate() {
    return null;
  },
  async createLot(data) {
    return { ...data, id: `local-${Date.now()}`, status: "available" };
  },
  async assignLot() {},
  async confirmMatch(lotId, ngoId) {
    return { lotId, ngoId, code: `${lotId}:${ngoId}` };
  },
};
