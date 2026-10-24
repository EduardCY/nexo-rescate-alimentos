'use client';

import React from 'react';
import { urgencyOf, type Lot, type Urgency } from '@/lib/nexo/impact';
import { Clock, Snowflake, MapPin } from 'lucide-react';

export const URGENCY_BADGE: Record<Urgency, string> = {
  'CRÍTICO': 'bg-red-500/15 text-red-300 border border-red-500/30',
  ALTO: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  NORMAL: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
};

export function UrgencyBadge({ hoursLeft }: { hoursLeft: number }) {
  const u = urgencyOf(hoursLeft);
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${URGENCY_BADGE[u]}`}>
      {u === 'CRÍTICO' ? 'Crítico < 5h' : u}
    </span>
  );
}

export default function LotCard({
  lot,
  action,
}: {
  lot: Pick<Lot, 'product' | 'kg' | 'hoursLeft' | 'donor' | 'coldChain'> & { status?: Lot['status'] };
  action?: React.ReactNode;
}) {
  const hasHours = lot.hoursLeft > 0;
  return (
    <article className="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white transition-all hover:border-emerald-500/30">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm sm:text-base font-bold text-white">{lot.product}</h3>
          {hasHours && <UrgencyBadge hoursLeft={lot.hoursLeft} />}
        </div>
        <p className="truncate text-xs text-slate-400 flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-slate-500" />
          {lot.donor}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {lot.kg} kg
          </span>
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            {hasHours ? `${lot.hoursLeft}h restantes` : '—'}
          </span>
          {lot.coldChain && (
            <span className="text-cyan-400 flex items-center gap-1">
              <Snowflake className="w-3 h-3 text-cyan-400" />
              {lot.coldChain}
            </span>
          )}
        </div>
      </div>
      {action && <div className="self-end sm:self-center shrink-0">{action}</div>}
    </article>
  );
}
