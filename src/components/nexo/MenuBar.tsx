"use client";

import React, { useEffect, useState } from "react";
import type { ViewId } from "./NexoContext";
import { obtenerDonacionesPendientes } from "@/lib/db";

export interface MenuEntry {
  id: string;
  label: string;
  view?: ViewId;
  focusNgos?: boolean;
}

interface Props {
  items: MenuEntry[];
  activeId: string;
  onSelect: (item: MenuEntry) => void;
}

export default function MenuBar({ items, activeId, onSelect }: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const check = async () => {
      try {
        const p = await obtenerDonacionesPendientes();
        setPendientes(p.length);
      } catch {
        // En SSR o entornos sin IndexedDB
      }
    };

    check();
    const handleOnline = () => { setIsOnline(true); check(); };
    const handleOffline = () => { setIsOnline(false); check(); };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = setInterval(check, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <nav aria-label="Menú principal" className="flex flex-wrap items-center justify-between border-b border-[#808080] bg-[#d4d0c8] px-1 py-[2px]">
      <div className="flex flex-wrap items-center">
        {items.map((it) => (
          <button
            key={it.id}
            id={`menu-${it.id}`}
            className="menu-item font-sans text-xs sm:text-[13px]"
            aria-current={activeId === it.id ? "page" : undefined}
            onClick={() => onSelect(it)}
          >
            <span className="underline font-bold">{it.label[0]}</span>
            {it.label.slice(1)}
          </button>
        ))}
      </div>

      {/* Indicador de Conectividad Estilo Windows 98 en Barra de Menú */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 font-mono text-[11px] text-black">
        {isOnline ? (
          <span className="bevel-in bg-[#e0ffd8] text-green-900 px-1.5 py-0.5 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            ONLINE
          </span>
        ) : (
          <span className="bevel-in bg-[#fff4cc] text-amber-900 px-1.5 py-0.5 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            MODO OFFLINE
          </span>
        )}
        {pendientes > 0 && (
          <span className="bevel-in bg-[#ffdddd] text-red-900 px-1 py-0.5 font-bold">
            [{pendientes} pend.]
          </span>
        )}
      </div>
    </nav>
  );
}
