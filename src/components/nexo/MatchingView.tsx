"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNexo } from "./NexoContext";
import MatchingCard from "./MatchingCard";
import TerminalLog from "./TerminalLog";
import ColdChainBadge from "@/components/donaciones/ColdChainBadge";
import { bestMatch, scoreMatch, requiresCold, type NgoUrgency } from "@/lib/nexo/impact";

const URG: Record<NgoUrgency, string> = {
  Alta: "bg-nexo-alert text-white",
  Media: "bg-nexo-amber text-black",
  Normal: "bg-nexo-phosphor text-black",
};

/**
 * Componente SVG para representar el código QR de despacho sin requerir dependencias externas.
 */
function RetroQrCode({ code }: { code: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-[84px] h-[84px] bg-white p-1" role="img" aria-label={`Código QR: ${code}`}>
      {/* Esquinas superiores e inferior izquierda (marcadores de posición clásicos) */}
      <rect x="5" y="5" width="26" height="26" fill="black" />
      <rect x="9" y="9" width="18" height="18" fill="white" />
      <rect x="13" y="13" width="10" height="10" fill="black" />

      <rect x="69" y="5" width="26" height="26" fill="black" />
      <rect x="73" y="9" width="18" height="18" fill="white" />
      <rect x="77" y="13" width="10" height="10" fill="black" />

      <rect x="5" y="69" width="26" height="26" fill="black" />
      <rect x="9" y="73" width="18" height="18" fill="white" />
      <rect x="13" y="77" width="10" height="10" fill="black" />

      {/* Matriz técnica simulada de datos */}
      <rect x="36" y="8" width="8" height="8" fill="black" />
      <rect x="48" y="12" width="6" height="6" fill="black" />
      <rect x="38" y="22" width="6" height="14" fill="black" />
      <rect x="48" y="24" width="12" height="6" fill="black" />

      <rect x="8" y="38" width="6" height="6" fill="black" />
      <rect x="18" y="42" width="8" height="12" fill="black" />
      <rect x="34" y="44" width="14" height="14" fill="black" />
      <rect x="54" y="38" width="10" height="6" fill="black" />
      <rect x="70" y="40" width="8" height="12" fill="black" />
      <rect x="84" y="44" width="8" height="8" fill="black" />

      <rect x="38" y="64" width="8" height="10" fill="black" />
      <rect x="50" y="68" width="12" height="6" fill="black" />
      <rect x="70" y="64" width="14" height="14" fill="black" />
      <rect x="42" y="80" width="14" height="8" fill="black" />
      <rect x="62" y="84" width="8" height="8" fill="black" />
      <rect x="80" y="82" width="12" height="10" fill="black" />
    </svg>
  );
}

export default function MatchingView() {
  const { lots, ngos, logs, dispatch, validateMatch, focusNgos } = useNexo();
  const candidates = lots.filter((l) => l.status === "available" || l.id === dispatch?.lotId);
  const [lotId, setLotId] = useState<string>(candidates[0]?.id ?? "");

  useEffect(() => {
    if (!candidates.some((l) => l.id === lotId)) setLotId(candidates[0]?.id ?? "");
  }, [candidates, lotId]);

  const lot = lots.find((l) => l.id === lotId);
  const match = useMemo(() => (lot ? bestMatch(lot, ngos) : null), [lot, ngos]);
  const validated = !!lot && dispatch?.lotId === lot.id;
  const dispNgo = ngos.find((n) => n.id === dispatch?.ngoId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className={`flex flex-col gap-2 ${focusNgos ? "outline outline-2 outline-offset-4 outline-nexo-cyan" : ""}`} aria-label="Requerimientos de ONGs">
        <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ REQUERIMIENTOS DE ONGs</h2>
        {ngos.length === 0 && <p className="font-mono text-xs text-slate-500">No hay fundaciones registradas.</p>}
        {ngos.map((n) => {
          const s = lot ? scoreMatch(lot, n) : null;
          const isBest = match?.ngo.id === n.id;
          return (
            <article key={n.id} className={`bg-white p-2.5 text-black bevel-in ${isBest ? "ring-2 ring-nexo-phosphor" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold">{n.name}</h3>
                <span className={`shrink-0 px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${URG[n.urgency]}`}>Urgencia {n.urgency}</span>
              </div>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                {n.city} · {n.diners} comensales · {n.hasFridge ? "❄ con nevera" : "sin nevera"} · {n.distanceKm} km
              </p>
              {s && !s.eligible && <p className="font-mono text-[11px] font-bold text-red-700 mt-1">✖ No elegible: {s.reason}</p>}
              {isBest && <p className="font-mono text-[11px] font-bold text-green-700 mt-1">★ Mejor candidato</p>}
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-3" aria-label="Motor de emparejamiento">
        <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ MOTOR DE EMPAREJAMIENTO</h2>
        <div className="scada-panel p-3">
          <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400" htmlFor="sel-lot">Lote activo</label>
          <select id="sel-lot" className="retro-field" value={lotId} onChange={(e) => setLotId(e.target.value)}>
            {candidates.length === 0 && <option value="">Sin lotes</option>}
            {candidates.map((l) => (
              <option key={l.id} value={l.id}>{l.id} · {l.product} · {l.kg} kg · {l.hoursLeft}h</option>
            ))}
          </select>
          {lot && requiresCold(lot.coldChain) && (
            <div className="mt-2.5">
              <ColdChainBadge requiereFrio={true} mostrarAdvertencia={true} size="sm" />
            </div>
          )}
          <p className="mt-2 font-mono text-[11px] leading-snug text-slate-400">
            Criterios: ① proximidad geográfica + horas de vencimiento ② afinidad alimentaria ③ urgencia de la ONG. Se descartan receptores sin cadena de frío o que no lleguen antes del vencimiento.
          </p>
        </div>
        <MatchingCard lot={lot} match={match} validated={validated} onValidate={() => lot && match && validateMatch(lot.id, match.ngo.id)} />
      </section>

      <section className="flex flex-col gap-3" aria-label="Guía de despacho">
        <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ GUÍA DE DESPACHO & CHOFER</h2>
        <div className="bevel-out p-3 text-black">
          {dispatch && dispNgo ? (
            <div className="flex gap-3">
              <div className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed">
                <p><b>Unidad:</b> {dispatch.truck ?? "—"}</p>
                <p><b>Conductor:</b> {dispatch.driver ?? "—"}</p>
                <p><b>Retiro est.:</b> {dispatch.pickupAt ?? "—"}</p>
                <p><b>Entrega est.:</b> {dispatch.deliverAt ?? "—"}</p>
                <p className="truncate"><b>Destino:</b> {dispNgo.name}</p>
                <p className="truncate"><b>Lote:</b> {dispatch.lotId}</p>
              </div>
              <div className="bg-white p-1 bevel-in" title={dispatch.code}>
                <RetroQrCode code={dispatch.code} />
              </div>
            </div>
          ) : (
            <p className="font-mono text-xs text-slate-700">Sin despacho activo. Valida un match para asignar unidad, conductor y generar el QR de entrega.</p>
          )}
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-400">Trazabilidad · consola en vivo</h3>
          <TerminalLog entries={logs} heightClass="h-64" />
        </div>
      </section>
    </div>
  );
}
