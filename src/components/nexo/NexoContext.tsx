"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { nexoApi, type NewLot } from "@/lib/nexo/api";
import {
  CO2_KG_PER_KG,
  bestMatch,
  type Certificate,
  type Delivery,
  type Dispatch,
  type LogEntry,
  type Lot,
  type MapNode,
  type Ngo,
  type Totals,
} from "@/lib/nexo/impact";

export type ViewId = "dashboard" | "donation" | "matching" | "impact";

export interface Settings {
  crt: boolean;
  radarAnim: boolean;
}

interface NexoStore {
  view: ViewId;
  setView: (v: ViewId) => void;
  focusNgos: boolean;
  setFocusNgos: (b: boolean) => void;
  lots: Lot[];
  ngos: Ngo[];
  mapNodes: MapNode[];
  logs: LogEntry[];
  dispatch: Dispatch | null;
  deliveries: Delivery[];
  certificate: Certificate | null;
  settings: Settings;
  setSettings: (s: Settings) => void;
  totals: Totals & { co2Ton: number };
  pushLog: (level: LogEntry["level"], msg: string) => void;
  addLot: (lot: NewLot) => Promise<Lot | null>;
  assignLot: (id: string) => Promise<void>;
  validateMatch: (lotId: string, ngoId: string) => Promise<void>;
}

const Ctx = createContext<NexoStore | null>(null);

const two = (n: number) => String(n).padStart(2, "0");
const hhmmss = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;

const EMPTY_TOTALS: Totals = { kg: 0, rations: 0, waterL: 0, valueCop: 0, efficiency: null };

export function NexoProvider({ 
  children, 
  initialView = "dashboard" 
}: { 
  children: React.ReactNode; 
  initialView?: ViewId; 
}) {
  const [view, setView] = useState<ViewId>(initialView);
  const [focusNgos, setFocusNgos] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [baseTotals, setBaseTotals] = useState<Totals>(EMPTY_TOTALS);
  const [settings, setSettings] = useState<Settings>({ crt: false, radarAnim: true });
  const logId = useRef(1);
  const lotsRef = useRef(lots);
  lotsRef.current = lots;
  const ngosRef = useRef(ngos);
  ngosRef.current = ngos;

  const pushLog = useCallback((level: LogEntry["level"], msg: string) => {
    const entry: LogEntry = { id: logId.current++, ts: hhmmss(new Date()), level, msg };
    setLogs((l) => [...l.slice(-60), entry]);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      nexoApi.listLots(),
      nexoApi.listNgos(),
      nexoApi.listDeliveries(),
      nexoApi.listMapNodes(),
      nexoApi.getTotals(),
      nexoApi.getCertificate(),
    ])
      .then(([l, n, d, m, t, c]) => {
        if (!alive) return;
        setLots(l);
        setNgos(n);
        setDeliveries(d);
        setMapNodes(m);
        setBaseTotals(t);
        setCertificate(c);
      })
      .catch(() => alive && pushLog("warn", "No se pudieron cargar los datos del servidor."));
    return () => {
      alive = false;
    };
  }, [pushLog]);

  const addLot = useCallback(
    async (data: NewLot) => {
      try {
        const lot = await nexoApi.createLot(data);
        setLots((l) => [lot, ...l]);
        pushLog("ok", `Lote ${lot.id} publicado: ${lot.product} (${lot.kg} kg) - ${lot.donor}.`);
        return lot;
      } catch {
        pushLog("warn", "No se pudo publicar el lote.");
        return null;
      }
    },
    [pushLog],
  );

  const assignLot = useCallback(
    async (id: string) => {
      const lot = lotsRef.current.find((l) => l.id === id);
      const isAvailable = lot ? (lot.estado ? lot.estado === "DISPONIBLE" : lot.status === "available") : false;
      if (!lot || !isAvailable) return;
      const m = bestMatch(lot, ngosRef.current);
      try {
        await nexoApi.assignLot(id, m?.ngo.id);
        setLots((ls) =>
          ls.map((l) =>
            l.id === id ? { ...l, status: "assigned", estado: "ASIGNADA", ngoId: m?.ngo.id } : l
          )
        );
        pushLog("info", `Lote ${id} asignado${m ? ` a ${m.ngo.name}` : " (sin receptor elegible)"}.`);
      } catch {
        pushLog("warn", `No se pudo asignar el lote ${id}.`);
      }
    },
    [pushLog],
  );

  const validateMatch = useCallback(
    async (lotId: string, ngoId: string) => {
      const lot = lotsRef.current.find((l) => l.id === lotId);
      const ngo = ngosRef.current.find((n) => n.id === ngoId);
      const isDelivered = lot ? (lot.estado === "ENTREGADA" || lot.status === "delivered") : true;
      if (!lot || !ngo || isDelivered) return;
      try {
        const d = await nexoApi.confirmMatch(lotId, ngoId);
        setDispatch(d);
        setLots((ls) =>
          ls.map((l) =>
            l.id === lotId ? { ...l, status: "assigned", estado: "ASIGNADA", ngoId } : l
          )
        );
        pushLog("ok", `Asignación confirmada: ${lot.id} → ${ngo.name}.`);
      } catch {
        pushLog("warn", `No se pudo confirmar la asignación de ${lot.id}.`);
      }
    },
    [pushLog],
  );

  const totals = { ...baseTotals, co2Ton: (baseTotals.kg * CO2_KG_PER_KG) / 1000 };

  const value: NexoStore = {
    view, setView, focusNgos, setFocusNgos, lots, ngos, mapNodes, logs, dispatch, deliveries, certificate,
    settings, setSettings, totals, pushLog, addLot, assignLot, validateMatch,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNexo(): NexoStore {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNexo debe usarse dentro de <NexoProvider>");
  return c;
}
