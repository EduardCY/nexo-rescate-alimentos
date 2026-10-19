"use client";

import React, { useState } from "react";
import { useNexo } from "./NexoContext";
import type { MapNodeKind } from "@/lib/nexo/impact";

const KIND: Record<MapNodeKind, { color: string; title: string }> = {
  donor: { color: "#00e676", title: "DONANTE" },
  receiver: { color: "#00b0ff", title: "RECEPTOR" },
  agro: { color: "#f59e0b", title: "AGRO" },
  truck: { color: "#ef4444", title: "EN RUTA" },
};

const W = 600;
const H = 380;

export default function RadarMap() {
  const { settings, mapNodes } = useNexo();
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ cx: W / 2, cy: H / 2 });

  const transform = `translate(${W / 2 - center.cx * zoom} ${H / 2 - center.cy * zoom}) scale(${zoom})`;

  const centerFleet = () => {
    const trucks = mapNodes.filter((n) => n.kind === "truck");
    const pool = trucks.length ? trucks : mapNodes;
    if (!pool.length) {
      setZoom(1);
      setCenter({ cx: W / 2, cy: H / 2 });
      return;
    }
    setZoom(1.5);
    setCenter({
      cx: (pool.reduce((s, n) => s + n.x, 0) / pool.length) * W,
      cy: (pool.reduce((s, n) => s + n.y, 0) / pool.length) * H,
    });
  };

  return (
    <section className="scada-panel flex flex-col" aria-label="Mapa logístico">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-1.5">
        <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ MAPA LOGÍSTICO · CALI / TULUÁ</h2>
        <span className="font-mono text-[10px] text-nexo-phosphor">● {mapNodes.length} NODOS</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className={`h-auto w-full bg-[#060b16] ${settings.radarAnim ? "" : "anim-off"}`} role="img" aria-label="Radar de nodos logísticos">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M30 0H0V30" fill="none" stroke="#12304d" strokeWidth="0.6" />
            </pattern>
            <radialGradient id="sweepGrad">
              <stop offset="0%" stopColor="#00e676" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00e676" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          <g transform={transform}>
            {[60, 120, 180, 240].map((r) => (
              <circle key={r} cx="300" cy="190" r={r} fill="none" stroke="#0e4a3a" strokeWidth="0.8" strokeDasharray="3 4" />
            ))}
            <g className="radar-sweep">
              <path d="M300,190 L300,-50 A240,240 0 0 1 470,20 Z" fill="url(#sweepGrad)" />
              <line x1="300" y1="190" x2="300" y2="-50" stroke="#00e676" strokeWidth="1.2" opacity="0.7" />
            </g>
            {mapNodes.map((n) => {
              const k = KIND[n.kind];
              const x = n.x * W;
              const y = n.y * H;
              return (
                <g key={n.id}>
                  <circle className="node-pulse" cx={x} cy={y} r="8" fill={k.color} opacity="0.5" />
                  <rect x={x - 6} y={y - 6} width="12" height="12" fill={k.color} stroke="#000" strokeWidth="1.5" />
                  <text x={x + 14} y={y - 4} fill={k.color} fontSize="11" fontWeight="bold" fontFamily="monospace">{k.title}</text>
                  <text x={x + 14} y={y + 9} fill="#cbd5e1" fontSize="9.5" fontFamily="monospace">{n.label}{n.sub ? ` · ${n.sub}` : ""}</text>
                </g>
              );
            })}
          </g>
        </svg>

        {mapNodes.length === 0 && (
          <p className="absolute inset-x-0 bottom-3 text-center font-mono text-[11px] text-slate-400">SIN NODOS ACTIVOS</p>
        )}

        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button className="btn-98 font-mono" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))}>[+] Zoom</button>
          <button className="btn-98 font-mono" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.25).toFixed(2)))}>[-] Zoom</button>
          <button className="btn-98 font-mono" onClick={centerFleet}>[o] Centrar Flota</button>
          <button className="btn-98 font-mono" onClick={() => { setZoom(1); setCenter({ cx: W / 2, cy: H / 2 }); }}>Reiniciar</button>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-700 px-3 py-1.5 font-mono text-[10px] text-slate-300">
        <li><span className="text-nexo-phosphor">■</span> Donante</li>
        <li><span className="text-red-400">■</span> En ruta</li>
        <li><span className="text-nexo-amber">■</span> Agro</li>
        <li><span className="text-nexo-cyan">■</span> Receptor</li>
      </ul>
    </section>
  );
}
