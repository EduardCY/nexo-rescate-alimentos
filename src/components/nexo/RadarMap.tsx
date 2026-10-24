'use client';

import React, { useState } from 'react';
import type { MapNode, MapNodeKind } from '@/lib/nexo/impact';
import { ZoomIn, ZoomOut, Compass, Navigation } from 'lucide-react';

const NODOS_DEFECTO: MapNode[] = [
  { id: '1', kind: 'donor', x: 0.35, y: 0.45, label: 'Plaza Santa Elena', sub: 'Puestos 12 y 45' },
  { id: '2', kind: 'agro', x: 0.75, y: 0.25, label: 'Cavasa Mayorista', sub: 'Módulo 3 Bodega 8' },
  { id: '3', kind: 'receiver', x: 0.25, y: 0.70, label: 'Comedor Siloé', sub: 'Capacidad 250 raciones' },
  { id: '4', kind: 'receiver', x: 0.55, y: 0.65, label: 'Comedor Aguablanca', sub: 'Capacidad 400 raciones' },
  { id: '5', kind: 'truck', x: 0.42, y: 0.48, label: 'Ruta 1 (Voluntario Carromoto)', sub: 'Hacia Siloé' },
];

const KIND: Record<MapNodeKind, { color: string; title: string }> = {
  donor: { color: '#10b981', title: 'DONANTE' },
  receiver: { color: '#0ea5e9', title: 'COMEDOR' },
  agro: { color: '#f59e0b', title: 'CENTRAL AGRO' },
  truck: { color: '#ef4444', title: 'EN RUTA' },
};

const W = 600;
const H = 380;

interface RadarMapProps {
  nodes?: MapNode[];
}

export default function RadarMap({ nodes = NODOS_DEFECTO }: RadarMapProps) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ cx: W / 2, cy: H / 2 });

  const transform = `translate(${W / 2 - center.cx * zoom} ${H / 2 - center.cy * zoom}) scale(${zoom})`;

  const centerFleet = () => {
    const trucks = nodes.filter((n) => n.kind === 'truck');
    const pool = trucks.length ? trucks : nodes;
    if (!pool.length) {
      setZoom(1);
      setCenter({ cx: W / 2, cy: H / 2 });
      return;
    }
    setZoom(1.4);
    setCenter({
      cx: (pool.reduce((s, n) => s + n.x, 0) / pool.length) * W,
      cy: (pool.reduce((s, n) => s + n.y, 0) / pool.length) * H,
    });
  };

  return (
    <section className="glass-panel overflow-hidden flex flex-col" aria-label="Mapa logístico de rescate">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Red Logística en Tiempo Real · Cali & Valle
          </h2>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
          ● {nodes.length} Nodos Activos
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full bg-slate-950/80" role="img" aria-label="Radar logístico de distribución">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0H0V30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
            <radialGradient id="sweepGrad">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          
          <g transform={transform}>
            {[60, 120, 180, 240].map((r) => (
              <circle key={r} cx="300" cy="190" r={r} fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />
            ))}

            {nodes.map((n) => {
              const k = KIND[n.kind];
              const x = n.x * W;
              const y = n.y * H;
              return (
                <g key={n.id}>
                  <circle cx={x} cy={y} r="10" fill={k.color} opacity="0.3" className="animate-pulse" />
                  <rect x={x - 6} y={y - 6} width="12" height="12" rx="2" fill={k.color} stroke="#0f172a" strokeWidth="1.5" />
                  <text x={x + 12} y={y - 2} fill={k.color} fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                    {k.title}
                  </text>
                  <text x={x + 12} y={y + 11} fill="#e2e8f0" fontSize="10" fontFamily="sans-serif">
                    {n.label}{n.sub ? ` · ${n.sub}` : ''}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-3 top-3 flex flex-col gap-1.5">
          <button 
            type="button"
            className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
            onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}
            aria-label="Acercar mapa"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            type="button"
            className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}
            aria-label="Alejar mapa"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            type="button"
            className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-200 flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
            onClick={centerFleet}
            aria-label="Centrar flota de transporte"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-300 bg-slate-900/50">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Donante (Plaza)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Centro Agro (Cavasa)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> Comedor Comunitario</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Transporte en Ruta</span>
      </div>
    </section>
  );
}
