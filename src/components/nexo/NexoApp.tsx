"use client";

import React from "react";
import { NexoProvider, useNexo, type ViewId } from "./NexoContext";
import WindowFrame from "./WindowFrame";
import MenuBar, { type MenuEntry } from "./MenuBar";
import DashboardView from "./DashboardView";
import DonationForm from "./DonationForm";
import MatchingView from "./MatchingView";
import ImpactView from "./ImpactView";

const MENU: MenuEntry[] = [
  { id: "archivo", label: "Inicio", view: "dashboard" },
  { id: "donaciones", label: "Donar Alimentos", view: "donation" },
  { id: "rutas", label: "Asignación de Comedores", view: "matching" },
  { id: "fundaciones", label: "Directorio de Comedores", view: "matching", focusNgos: true },
  { id: "certificados", label: "Certificados de Donación", view: "impact" },
];

const TITLES: Record<ViewId, string> = {
  dashboard: "PANEL PRINCIPAL — RESCATE DE ALIMENTOS",
  donation: "REGISTRAR DONACIÓN DE ALIMENTOS",
  matching: "ASIGNACIÓN DE ALIMENTOS A COMEDORES",
  impact: "IMPACTO SOCIAL Y CERTIFICADO DE DONACIÓN",
};

function Shell() {
  const { view, setView, setFocusNgos, focusNgos, settings, lots } = useNexo();

  const activeId = MENU.find((m) => m.view === view && !!m.focusNgos === (view === "matching" && focusNgos))?.id ?? "archivo";

  const select = (m: MenuEntry) => {
    if (!m.view) return;
    setFocusNgos(!!m.focusNgos);
    setView(m.view);
  };

  return (
    <div className={settings.radarAnim ? "" : "anim-off"}>
      <WindowFrame
        title={`NEXO: RESCATE DE ALIMENTOS [${TITLES[view]}]`}
        menu={<MenuBar items={MENU} activeId={activeId} onSelect={select} />}
        statusLeft={`Listo • ${lots.filter((l) => (l.estado ? l.estado === "DISPONIBLE" : l.status === "available")).length} donaciones activas • Plazas de Cali`}
        statusRight="NEXO • Versión Comunitaria"
      >
        {view === "dashboard" && <DashboardView />}
        {view === "donation" && <DonationForm />}
        {view === "matching" && <MatchingView />}
        {view === "impact" && <ImpactView />}
      </WindowFrame>
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
