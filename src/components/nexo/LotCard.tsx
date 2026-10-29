"use client";

import React from "react";
import { urgencyOf, type Lot, type Urgency } from "@/lib/nexo/impact";

export const URGENCY_BADGE: Record<Urgency, string> = {
  "CRÍTICO": "bg-nexo-alert text-white",
  ALTO: "bg-nexo-amber text-black",
  NORMAL: "bg-nexo-phosphor text-black",
};

export function UrgencyBadge({ hoursLeft }: { hoursLeft: number }) {
  const u = urgencyOf(hoursLeft);
  return (
    <span className={`px-2 py-0.5 font-mono text-[10px] font-extrabold ${URGENCY_BADGE[u]}`}>
      {u === "CRÍTICO" ? "CRÍTICO < 5H" : u}
    </span>
  );
}

export default function LotCard({
  lot,
  action,
}: {
  lot: Pick<Lot, "product" | "kg" | "hoursLeft" | "donor" | "coldChain"> & { status?: Lot["status"] };
  action?: React.ReactNode;
}) {
  const hasHours = lot.hoursLeft > 0;
  return (
    <article className="flex items-center justify-between gap-3 bg-white p-2.5 text-black bevel-in select-none">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold leading-tight">{lot.product}</h3>
        <p className="truncate font-mono text-[11px] text-slate-700 mt-0.5">{lot.donor}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-800">
          <b className="bg-[#e2e2e2] px-1 py-0.2 bevel-in">{lot.kg} kg</b> · ⏱ {hasHours ? `${lot.hoursLeft}h` : "—"} · ❄ {lot.coldChain}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {hasHours && <UrgencyBadge hoursLeft={lot.hoursLeft} />}
        {action}
      </div>
    </article>
  );
}
