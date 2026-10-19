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
    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${URGENCY_BADGE[u]}`}>
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
    <article className="flex items-center gap-3 bg-white p-2 text-black bevel-in">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold">{lot.product}</h3>
        <p className="truncate font-mono text-[11px] text-slate-600">{lot.donor}</p>
        <p className="mt-0.5 font-mono text-[11px] text-slate-700">
          <b>{lot.kg} kg</b> · ⏱ {hasHours ? `${lot.hoursLeft}h` : "—"} · ❄ {lot.coldChain}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {hasHours && <UrgencyBadge hoursLeft={lot.hoursLeft} />}
        {action}
      </div>
    </article>
  );
}
