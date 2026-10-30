"use client";

import React from "react";
import { useNexo } from "./NexoContext";
import { DonacionWizard } from "@/components/donaciones/DonacionWizard";

/**
 * Vista de registro de donaciones en el shell principal (NexoApp).
 * Unificada con el DonacionWizard canónico en 3 pasos para todas las resoluciones
 * de pantalla (móvil y escritorio completo), satisfaciendo RNF-001, TASK-02 y TASK-04.
 */
export default function DonationForm() {
  const { pushLog, setView } = useNexo();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between bg-[#000080] text-white px-2.5 py-1 text-xs font-mono font-bold">
        <span>▣ REGISTRAR DONACIÓN DE ALIMENTOS (LEY 1990 DE 2019)</span>
        <button
          type="button"
          onClick={() => setView("dashboard")}
          className="btn-98 !py-0.5 !px-2 text-[10px] text-black font-mono font-bold"
        >
          &lt; Volver al Panel
        </button>
      </div>

      <DonacionWizard
        onCompleted={(codigo, isOffline) => {
          pushLog(
            isOffline ? "warn" : "ok",
            `Lote ${codigo} registrado (${isOffline ? "guardado local en Dexie" : "publicado en Supabase"}).`
          );
        }}
      />
    </div>
  );
}
