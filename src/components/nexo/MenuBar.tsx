"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { ViewId } from "./NexoContext";
import { obtenerDonacionesPendientes } from "@/lib/db";
import { sincronizarColaOffline } from "@/lib/sync/offline-sync";

export interface MenuEntry {
  id: string;
  label: string;
  view?: ViewId;
  focusNgos?: boolean;
  href?: string;
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

    const sincronizar = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      try {
        await sincronizarColaOffline();
      } finally {
        await check();
      }
    };

    check();

    // Auto-sincronizar al cargar si hay red y elementos pendientes
    const t0 = setTimeout(() => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void sincronizar();
      }
    }, 400);

    const handleOnline = () => {
      setIsOnline(true);
      void sincronizar();
      setTimeout(() => {
        void sincronizar();
      }, 500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      void check();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("nexo:offline-queue-changed", check);
    window.addEventListener("nexo:offline-synced", check);
    const interval = setInterval(check, 8000);

    return () => {
      clearTimeout(t0);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("nexo:offline-queue-changed", check);
      window.removeEventListener("nexo:offline-synced", check);
      clearInterval(interval);
    };
  }, []);

  return (
    <nav aria-label="Menú principal" className="flex flex-wrap items-center justify-between border-b border-[#808080] bg-[#d4d0c8] px-1 py-[2px]">
      <div className="flex flex-wrap items-center">
        {items.map((it) => {
          if (it.href) {
            return (
              <Link
                key={it.id}
                id={`menu-${it.id}`}
                href={it.href}
                className="menu-item font-sans text-xs sm:text-[13px]"
              >
                <span className="underline font-bold">{it.label[0]}</span>
                {it.label.slice(1)}
              </Link>
            );
          }

          return (
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
          );
        })}
      </div>

      {/* Indicador de Conectividad Estilo Windows 98 en Barra de Menú */}
      <div className="flex items-center gap-1.5 px-2 py-0.5 font-mono text-[11px] text-black">
        {isOnline ? (
          <span className="bevel-in bg-[#e0ffd8] text-green-900 px-1.5 py-0.5 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            CONECTADO
          </span>
        ) : (
          <span className="bevel-in bg-[#fff4cc] text-amber-900 px-1.5 py-0.5 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            SIN INTERNET
          </span>
        )}
        {pendientes > 0 && (
          <button
            type="button"
            onClick={() => {
              if (isOnline) void sincronizarColaOffline();
            }}
            title={isOnline ? "Hacer clic para sincronizar donaciones con el servidor" : "Sin conexión a internet"}
            className="bevel-out bg-[#ffdddd] hover:bg-[#ffcccc] text-red-900 px-1.5 py-0.5 font-bold cursor-pointer text-[10px]"
          >
            [{pendientes} por sincronizar]
          </button>
        )}
      </div>
    </nav>
  );
}
