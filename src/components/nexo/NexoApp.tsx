"use client";

import React, { useState } from "react";
import { NexoProvider, useNexo, type ViewId } from "./NexoContext";
import WindowFrame from "./WindowFrame";
import MenuBar, { type MenuEntry } from "./MenuBar";
import DashboardView from "./DashboardView";
import DonationForm from "./DonationForm";
import MatchingView from "./MatchingView";
import ImpactView from "./ImpactView";

const MENU: MenuEntry[] = [
  { id: "archivo", label: "Dashboard", view: "dashboard" },
  { id: "donaciones", label: "Donar Alimentos", view: "donation" },
  { id: "rutas", label: "Rutas y Asignación", view: "matching" },
  { id: "fundaciones", label: "Comedores y Fundaciones", view: "matching", focusNgos: true },
  { id: "certificados", label: "Certificados de Impacto", view: "impact" },
  { id: "config", label: "Configuración" },
];

const TITLES: Record<ViewId, string> = {
  dashboard: "DASHBOARD MASTER — LOGÍSTICA & RESCATE",
  donation: "ALTA DE LOTE EXCEDENTE",
  matching: "PORTAL DE ASIGNACIÓN A COMEDORES",
  impact: "IMPACTO AMBIENTAL Y DEDUCCIÓN TRIBUTARIA",
};

function ConfigDialog({ onClose }: { onClose: () => void }) {
  const { settings, setSettings } = useNexo();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Configuración">
      <div className="bevel-out w-full max-w-sm p-[3px]">
        <div className="titlebar flex items-center justify-between px-2 py-[3px] font-mono text-[13px] font-bold text-white">
          <span>Configuración del Sistema</span>
          <button className="btn-98 !px-0 !py-0 h-[20px] w-[22px] flex items-center justify-center" onClick={onClose} aria-label="Cerrar">X</button>
        </div>
        <div className="flex flex-col gap-3 p-4 text-sm text-black">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#000080]" checked={settings.crt} onChange={(e) => setSettings({ ...settings, crt: e.target.checked })} />
            Efecto monitor CRT (scanlines)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#000080]" checked={settings.radarAnim} onChange={(e) => setSettings({ ...settings, radarAnim: e.target.checked })} />
            Animaciones del radar logístico
          </label>
          <div className="flex justify-end pt-2">
            <button className="btn-98 px-6 py-1.5" onClick={onClose}>Aceptar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { view, setView, setFocusNgos, focusNgos, settings, lots } = useNexo();
  const [config, setConfig] = useState(false);

  const activeId = config
    ? "config"
    : MENU.find((m) => m.view === view && !!m.focusNgos === (view === "matching" && focusNgos))?.id ?? "archivo";

  const select = (m: MenuEntry) => {
    if (!m.view) return setConfig(true);
    setFocusNgos(!!m.focusNgos);
    setView(m.view);
  };

  return (
    <div className={`${settings.crt ? "crt-on" : ""} ${settings.radarAnim ? "" : "anim-off"}`}>
      <WindowFrame
        title={`NEXO: RESCATE DE ALIMENTOS [${TITLES[view]}]`}
        menu={<MenuBar items={MENU} activeId={activeId} onSelect={select} />}
        statusLeft={`Listo • ${lots.filter((l) => l.status === "available").length} lotes disponibles • Plazas de Cali`}
        statusRight="NEXO v2.0 (Win98 Edition)"
      >
        {view === "dashboard" && <DashboardView />}
        {view === "donation" && <DonationForm />}
        {view === "matching" && <MatchingView />}
        {view === "impact" && <ImpactView />}
      </WindowFrame>
      {config && <ConfigDialog onClose={() => setConfig(false)} />}
    </div>
  );
}

export default function NexoApp({ initialView = "dashboard" }: { initialView?: ViewId }) {
  return (
    <NexoProvider initialView={initialView}>
      <Shell />
    </NexoProvider>
  );
}