"use client";

import React, { useState } from "react";
import { useNexo } from "./NexoContext";
import LotCard from "./LotCard";
import {
  CATEGORIES,
  COLD_CHAIN_OPTIONS,
  calcImpact,
  categoryById,
  fmt,
  fmtCop,
  urgencyOf,
  type CategoryId,
} from "@/lib/nexo/impact";

const INITIAL = {
  donor: "",
  category: "fruta" as CategoryId,
  kg: "",
  hours: "",
  cold: COLD_CHAIN_OPTIONS[0] as string,
  dock: "",
  legal: false,
};

export default function DonationForm() {
  const { addLot, setView } = useNexo();
  const [f, setF] = useState(INITIAL);
  const set = <K extends keyof typeof INITIAL>(k: K, v: (typeof INITIAL)[K]) => setF((s) => ({ ...s, [k]: v }));

  const kg = parseFloat(f.kg);
  const hours = parseFloat(f.hours);
  const kgOk = Number.isFinite(kg) && kg > 0;
  const hoursOk = Number.isFinite(hours) && hours > 0;
  const valid = kgOk && hoursOk && f.donor.trim() !== "" && f.dock.trim() !== "" && f.legal;
  const impact = calcImpact(kgOk ? kg : 0, f.category);
  const cat = categoryById(f.category);
  const urgency = urgencyOf(hoursOk ? hours : 99);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const lot = await addLot({
      donor: f.donor.trim(),
      product: cat.label,
      category: f.category,
      kg,
      hoursLeft: hours,
      coldChain: f.cold,
      dock: f.dock.trim(),
    });
    if (!lot) return;
    setF(INITIAL);
    setView("dashboard");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form onSubmit={publish} className="bevel-out p-4" aria-label="Formulario de donación rápida">
        <h2 className="mb-3 bg-[#000080] px-2 py-1 font-mono text-xs font-bold tracking-wide text-white">
          ▣ ALTA DE LOTE EXCEDENTE · DONACIÓN RÁPIDA
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="retro-label" htmlFor="f-donor">Establecimiento donante</label>
            <input id="f-donor" className="retro-field" placeholder="Nombre del establecimiento" value={f.donor} onChange={(e) => set("donor", e.target.value)} />
          </div>
          <div>
            <label className="retro-label" htmlFor="f-cat">Tipo / categoría</label>
            <select id="f-cat" className="retro-field" value={f.category} onChange={(e) => set("category", e.target.value as CategoryId)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="retro-label" htmlFor="f-kg">Cantidad estimada (Kg / Litros)</label>
            <input id="f-kg" type="number" min="1" step="1" className="retro-field" placeholder="0" value={f.kg} onChange={(e) => set("kg", e.target.value)} />
          </div>
          <div>
            <label className="retro-label" htmlFor="f-hours">Ventana límite de retiro (horas restantes)</label>
            <input id="f-hours" type="number" min="1" step="1" className="retro-field" placeholder="0" value={f.hours} onChange={(e) => set("hours", e.target.value)} />
          </div>
          <div>
            <label className="retro-label" htmlFor="f-cold">Protocolo de cadena de frío</label>
            <select id="f-cold" className="retro-field" value={f.cold} onChange={(e) => set("cold", e.target.value)}>
              {COLD_CHAIN_OPTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="retro-label" htmlFor="f-dock">Ubicación muelle de carga (dirección / puerta)</label>
            <input id="f-dock" className="retro-field" placeholder="Dirección y puerta de carga" value={f.dock} onChange={(e) => set("dock", e.target.value)} />
          </div>
          <label className="flex items-start gap-2 sm:col-span-2 text-xs text-black cursor-pointer">
            <input id="f-legal" type="checkbox" className="mt-0.5 h-4 w-4 accent-[#000080]" checked={f.legal} onChange={(e) => set("legal", e.target.checked)} />
            <span>Declaro que los alimentos son inocuos y están empacados aptos para consumo humano.</span>
          </label>
        </div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-98 px-4" onClick={() => setF(INITIAL)}>Descartar</button>
          <button id="btn-publish" type="submit" className="btn-green px-4 py-2 text-xs sm:text-sm" disabled={!valid}>
            PUBLICAR LOTE PARA RESCATE INMEDIATO
          </button>
        </div>
        {!valid && <p className="mt-2 text-right font-mono text-[11px] text-red-700">* Completa los campos y acepta la declaración de inocuidad.</p>}
      </form>

      <div className="flex flex-col gap-3">
        <section className="scada-panel p-3" aria-label="Previsualización del lote">
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ LIVE PREVIEW · LOTE</h2>
          <LotCard lot={{ product: cat.label, kg: kgOk ? kg : 0, hoursLeft: hoursOk ? hours : 0, donor: f.donor || "—", coldChain: f.cold }} />
          <p className="mt-2 font-mono text-[11px] text-slate-400">
            Prioridad de despacho: {hoursOk ? <b className={urgency === "CRÍTICO" ? "text-red-400" : urgency === "ALTO" ? "text-nexo-amber" : "text-nexo-phosphor"}>{urgency}</b> : "—"}
          </p>
          <p className="mt-3 font-mono text-slate-300">
            Raciones estimadas:{" "}
            <span id="preview-rations" className="text-3xl font-extrabold text-nexo-amber text-glow-amber">{fmt.format(impact.rations)}</span>
          </p>
        </section>

        <section className="scada-panel p-3" aria-label="Cálculo de impacto">
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-cyan">▣ CÁLCULO DE IMPACTO EN TIEMPO REAL</h2>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="bevel-in-dark bg-black/40 p-2">
              <dt className="font-mono text-[10px] uppercase text-slate-400">CO2 emisiones evitadas</dt>
              <dd id="preview-co2" className="font-mono text-xl font-extrabold text-nexo-cyan text-glow-cyan">{impact.co2Kg.toFixed(1)} <span className="text-xs">kg</span></dd>
            </div>
            <div className="bevel-in-dark bg-black/40 p-2">
              <dt className="font-mono text-[10px] uppercase text-slate-400">Agua virtual preservada</dt>
              <dd id="preview-water" className="font-mono text-xl font-extrabold text-nexo-phosphor text-glow-green">{fmt.format(Math.round(impact.waterL))} <span className="text-xs">L</span></dd>
            </div>
          </dl>
          <div className="mt-2 bevel-in-dark bg-black/40 p-2">
            <p className="font-mono text-[10px] uppercase text-slate-400">Valoración económica deducible estimada</p>
            <p id="preview-cop" className="font-mono text-2xl font-extrabold text-nexo-amber text-glow-amber">{fmtCop(impact.deductibleCop)} <span className="text-xs">COP</span></p>
            <p className="font-mono text-[10px] text-slate-500">Valor comercial {fmtCop(impact.valueCop)} · estimación ilustrativa, no constituye asesoría tributaria.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
