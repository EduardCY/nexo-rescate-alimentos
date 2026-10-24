import React from 'react';

export type KpiTone = 'green' | 'cyan' | 'amber' | 'violet';

const TONES: Record<KpiTone, { text: string; bg: string; border: string }> = {
  green: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  cyan: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  violet: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
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
    <section className={`glass-card p-4 sm:p-5 relative overflow-hidden border ${t.border}`} aria-label={label}>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</h3>
      <p className={`mt-2 font-mono font-black leading-none ${t.text} ${big ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-3xl'}`}>
        {value}
        <span className="ml-2 text-xs sm:text-sm font-medium text-slate-400 opacity-90">{unit}</span>
      </p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </section>
  );
}
