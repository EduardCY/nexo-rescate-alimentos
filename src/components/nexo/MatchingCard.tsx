"use client";

import React from "react";
import type { Lot, MatchScore } from "@/lib/nexo/impact";
import { requiresCold } from "@/lib/nexo/impact";
import ColdChainBadge from "@/components/donaciones/ColdChainBadge";

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[11px]">
      <span className="w-24 text-slate-400">{label}</span>
      <div className="h-2 flex-1 bg-black bevel-in-dark">
        <div className="h-full bg-nexo-phosphor" style={{ width: `${Math.round(value)}%` }} />
      </div>
      <span className="w-8 text-right text-nexo-phosphor">{Math.round(value)}</span>
    </div>
  );
}

interface Props {
  lot: Lot | undefined;
  match: MatchScore | null;
  validated: boolean;
  onValidate: () => void;
}

export default function MatchingCard({ lot, match, validated, onValidate }: Props) {
  return (
    <section className="scada-panel p-3" aria-label="Sugerencia de match">
      <h3 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-cyan">▣ COMEDOR RECOMENDADO</h3>
      {!lot || !match ? (
        <p className="font-mono text-xs text-nexo-amber">
          {lot ? "⚠ Ningún comedor cumple las condiciones de refrigeración o tiempo de llegada para este lote." : "No hay donaciones pendientes de asignar en este momento."}
        </p>
      ) : (
        <>
          <div className="bg-white p-2 text-black bevel-in">
            <p className="font-mono text-[11px] text-slate-600">{lot.id} · {lot.product} · {lot.kg} kg · vence en {lot.hoursLeft}h</p>
            {requiresCold(lot.coldChain) && (
              <div className="my-1.5">
                <ColdChainBadge requiereFrio={true} mostrarAdvertencia={true} size="sm" />
              </div>
            )}
            <p className="text-center font-mono text-lg font-bold">⇣</p>
            <p className="text-sm font-bold">{match.ngo.name}</p>
            <p className="font-mono text-[11px] text-slate-600">
              {match.ngo.city} · {match.ngo.distanceKm} km · Llegada estimada en {match.etaMin} min · {match.ngo.diners} comensales
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <Bar label="Cercanía" value={match.proximity} />
            <Bar label="Necesidad" value={match.urgency} />
            <Bar label="Tipo Alimento" value={match.affinity} />
          </div>
          <p className="mt-2 font-mono text-[11px] leading-snug text-slate-300">
            <b className="text-nexo-amber">Motivo:</b> prioridad {match.ngo.urgency.toLowerCase()}, entrega estimada en {match.etaMin} minutos con {lot.hoursLeft}h de vigencia
            {match.affinity === 100 ? ", comedor adecuado para este tipo de alimento" : ""}
            {lot.coldChain !== "Ambiente (sin refrigeración)" ? " y cuenta con refrigeración verificada" : ""}.
          </p>
          <p className="mt-1 font-mono text-sm text-nexo-phosphor">NIVEL DE COMPATIBILIDAD: <b>{match.total} de 100</b></p>
          <button id="btn-validate-match" className="btn-green mt-3 w-full py-2.5 text-sm" onClick={onValidate} disabled={validated}>
            {validated ? "ASIGNACIÓN CONFIRMADA ✔" : "CONFIRMAR ENVÍO A ESTE COMEDOR"}
          </button>
        </>
      )}
    </section>
  );
}
