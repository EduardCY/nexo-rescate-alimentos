import React from "react";

export type KpiTone = "green" | "cyan" | "amber" | "violet";

const TONES: Record<KpiTone, { text: string; glow: string; bar: string }> = {
  green: { text: "text-nexo-phosphor", glow: "text-glow-green", bar: "bg-nexo-phosphor" },
  cyan: { text: "text-nexo-cyan", glow: "text-glow-cyan", bar: "bg-nexo-cyan" },
  amber: { text: "text-nexo-amber", glow: "text-glow-amber", bar: "bg-nexo-amber" },
  violet: { text: "text-violet-400", glow: "text-glow-violet", bar: "bg-violet-400" },
};

interface Props {
  label: string;
  value: string;
  unit: string;
  tone: KpiTone;
  hint?: string;
  big?: boolean;
}

export default function KpiCard({ label, value, unit, tone, hint, big }: Props) {
  const t = TONES[tone];
  return (
    <section className="scada-panel relative overflow-hidden p-3 sm:p-4" aria-label={label}>
      <div className={`absolute left-0 top-0 h-full w-1 ${t.bar}`} aria-hidden />
      <h3 className="pl-2 font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</h3>
      <p className={`pl-2 mt-2 font-mono font-extrabold leading-none ${t.text} ${t.glow} ${big ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>
        {value}
        <span className="ml-2 text-xs sm:text-sm font-bold opacity-80">{unit}</span>
      </p>
      {hint && <p className="pl-2 mt-2 font-mono text-[10px] text-slate-500">{hint}</p>}
    </section>
  );
}
