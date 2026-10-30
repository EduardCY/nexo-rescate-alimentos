"use client";

import React from "react";
import Link from "next/link";
import { useNexo } from "./NexoContext";
import RadarMap from "./RadarMap";
import LotCard from "./LotCard";
import KpiCard from "./KpiCard";
import { CO2_KG_PER_KG, fmt, type Lot } from "@/lib/nexo/impact";

const esDisponible = (lot: Lot) => (lot.estado ? lot.estado === "DISPONIBLE" : lot.status === "available");

export default function DashboardView() {
  const { lots, assignLot, setView, totals } = useNexo();
  const available = lots.filter(esDisponible);
  const sorted = [...lots].sort(
    (a, b) => Number(!esDisponible(a)) - Number(!esDisponible(b)) || a.hoursLeft - b.hoursLeft
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RadarMap />
        </div>
        <section className="scada-panel flex flex-col lg:col-span-5" aria-label="Excedentes disponibles">
          <div className="flex items-center justify-between border-b border-slate-700 px-3 py-1.5">
            <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ EXCEDENTES DISPONIBLES</h2>
            <span id="lots-count" className="bg-nexo-phosphor px-2 py-0.5 font-mono text-[11px] font-extrabold text-black">
              {available.length} LOTES
            </span>
          </div>
          <div className="flex max-h-[360px] min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2">
            {sorted.length === 0 && (
              <p className="m-auto font-mono text-xs text-slate-500">No hay lotes registrados.</p>
            )}
            {sorted.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                action={
                  esDisponible(lot) ? (
                    <button id={`assign-${lot.id}`} className="btn-98 font-mono" onClick={() => assignLot(lot.id)}>
                      Asignar &gt;
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      {lot.estado === "ENTREGADA" || lot.status === "delivered" ? "ENTREGADO ✔" : "ASIGNADO ✔"}
                    </span>
                  )
                }
              />
            ))}
          </div>
          <div className="p-2 flex flex-col sm:flex-row gap-2">
            <button id="btn-new-lot" className="btn-green flex-1 py-2 text-xs sm:text-sm font-bold" onClick={() => setView("donation")}>
              + REGISTRAR DONACIÓN
            </button>
            <Link href="/donaciones" className="btn-98 flex-1 py-2 text-xs sm:text-sm font-bold font-mono text-[#000080] flex items-center justify-center">
              VER CATÁLOGO &gt;
            </Link>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Alimentos Rescatados" value={fmt.format(totals.kg)} unit="KG" tone="green" />
        <KpiCard label="CO2 Emisiones Evitadas" value={totals.co2Ton.toFixed(1)} unit="TON" tone="cyan" hint={`Factor ${CO2_KG_PER_KG} kg CO2e/kg`} />
        <KpiCard label="Raciones Servidas" value={fmt.format(totals.rations)} unit="PTS" tone="amber" />
        <KpiCard label="Eficiencia Logística" value={totals.efficiency === null ? "—" : totals.efficiency.toFixed(1)} unit="%" tone="violet" />
      </div>
    </div>
  );
}
