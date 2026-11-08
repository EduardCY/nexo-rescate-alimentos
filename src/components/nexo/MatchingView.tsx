"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useNexo } from "./NexoContext";
import MatchingCard from "./MatchingCard";
import TerminalLog from "./TerminalLog";
import ColdChainBadge from "@/components/donaciones/ColdChainBadge";
import { bestMatch, scoreMatch, requiresCold, type NgoUrgency } from "@/lib/nexo/impact";
import { crearOrganizacion } from "@/actions/organizaciones";
import type { ZonaCali } from "@/types";

const URG: Record<NgoUrgency, string> = {
  Alta: "bg-nexo-alert text-white",
  Media: "bg-nexo-amber text-black",
  Normal: "bg-nexo-phosphor text-black",
};

/**
 * Componente SVG para representar el código QR de despacho sin requerir dependencias externas.
 */
function RetroQrCode({ code }: { code: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-[84px] h-[84px] bg-white p-1" role="img" aria-label={`Código QR: ${code}`}>
      <rect x="5" y="5" width="26" height="26" fill="black" />
      <rect x="9" y="9" width="18" height="18" fill="white" />
      <rect x="13" y="13" width="10" height="10" fill="black" />

      <rect x="69" y="5" width="26" height="26" fill="black" />
      <rect x="73" y="9" width="18" height="18" fill="white" />
      <rect x="77" y="13" width="10" height="10" fill="black" />

      <rect x="5" y="69" width="26" height="26" fill="black" />
      <rect x="9" y="73" width="18" height="18" fill="white" />
      <rect x="13" y="77" width="10" height="10" fill="black" />

      <rect x="36" y="8" width="8" height="8" fill="black" />
      <rect x="48" y="12" width="6" height="6" fill="black" />
      <rect x="38" y="22" width="6" height="14" fill="black" />
      <rect x="48" y="24" width="12" height="6" fill="black" />

      <rect x="8" y="38" width="6" height="6" fill="black" />
      <rect x="18" y="42" width="8" height="12" fill="black" />
      <rect x="34" y="44" width="14" height="14" fill="black" />
      <rect x="54" y="38" width="10" height="6" fill="black" />
      <rect x="70" y="40" width="8" height="12" fill="black" />
      <rect x="84" y="44" width="8" height="8" fill="black" />

      <rect x="38" y="64" width="8" height="10" fill="black" />
      <rect x="50" y="68" width="12" height="6" fill="black" />
      <rect x="70" y="64" width="14" height="14" fill="black" />
      <rect x="42" y="80" width="14" height="8" fill="black" />
      <rect x="62" y="84" width="8" height="8" fill="black" />
      <rect x="80" y="82" width="12" height="10" fill="black" />
    </svg>
  );
}

export default function MatchingView() {
  const { lots, ngos, logs, dispatch, validateMatch, focusNgos, refreshData, pushLog } = useNexo();
  const candidates = lots.filter(
    (l) => (l.estado ? l.estado === "DISPONIBLE" : l.status === "available") || l.id === dispatch?.lotId
  );
  const [lotId, setLotId] = useState<string>(candidates[0]?.id ?? "");
  const [ngoSeleccionadaManual, setNgoSeleccionadaManual] = useState<string>("");

  // Estado para formulario de creación de nuevo Comedor Comunitario
  const [mostrarFormComedor, setMostrarFormComedor] = useState(false);
  const [nombreComedor, setNombreComedor] = useState("");
  const [zonaComedor, setZonaComedor] = useState<ZonaCali>("LADERA");
  const [direccionComedor, setDireccionComedor] = useState("");
  const [comensales, setComensales] = useState("180");
  const [tieneFrio, setTieneFrio] = useState(true);
  const [urgenciaComedor, setUrgenciaComedor] = useState<NgoUrgency>("Alta");
  const [guardandoComedor, setGuardandoComedor] = useState(false);

  useEffect(() => {
    if (!candidates.some((l) => l.id === lotId)) setLotId(candidates[0]?.id ?? "");
  }, [candidates, lotId]);

  const lot = lots.find((l) => l.id === lotId);
  const match = useMemo(() => {
    if (!lot) return null;
    if (ngoSeleccionadaManual) {
      const targetNgo = ngos.find((n) => n.id === ngoSeleccionadaManual);
      if (targetNgo) {
        const sc = scoreMatch(lot, targetNgo);
        if (sc.eligible) return sc;
      }
    }
    return bestMatch(lot, ngos);
  }, [lot, ngos, ngoSeleccionadaManual]);

  const validated = !!lot && dispatch?.lotId === lot.id;
  const dispNgo = ngos.find((n) => n.id === dispatch?.ngoId);

  const handleCrearComedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreComedor.trim() || !direccionComedor.trim() || guardandoComedor) return;
    setGuardandoComedor(true);
    try {
      const res = await crearOrganizacion({
        tipo: "RECEPTOR",
        nombre: nombreComedor.trim(),
        zona: zonaComedor,
        direccion: direccionComedor.trim(),
        comensalesDiarios: Number(comensales) || 120,
        tieneRefrigeracion: tieneFrio,
        urgencia: urgenciaComedor,
      });
      if (res.exito) {
        pushLog("ok", `Comedor comunitario registrado: ${res.organizacion.nombre} (Zona ${zonaComedor}).`);
        setNombreComedor("");
        setDireccionComedor("");
        setMostrarFormComedor(false);
        await refreshData();
      } else {
        pushLog("warn", res.error);
      }
    } finally {
      setGuardandoComedor(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className={`flex flex-col gap-2 ${focusNgos ? "outline outline-2 outline-offset-4 outline-nexo-cyan" : ""}`} aria-label="Requerimientos de ONGs">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">
            ▣ COMEDORES Y FUNDACIONES RECEPTORAS ({ngos.length})
          </h2>
          <button
            type="button"
            onClick={() => setMostrarFormComedor(!mostrarFormComedor)}
            className="btn-98 !py-0.5 !px-2 text-[10px] font-mono font-bold text-[#000080]"
          >
            {mostrarFormComedor ? "Cancelar" : "+ Nuevo Comedor"}
          </button>
        </div>

        {mostrarFormComedor && (
          <form onSubmit={handleCrearComedor} className="bevel-out bg-white p-3 text-black font-mono text-xs flex flex-col gap-2">
            <div className="titlebar px-2 py-1 text-white font-bold text-[11px]">
              REGISTRAR COMEDOR COMUNITARIO RECEPTOR
            </div>
            <div>
              <label className="retro-label" htmlFor="new-comedor-nombre">Nombre del comedor *</label>
              <input
                id="new-comedor-nombre"
                type="text"
                required
                value={nombreComedor}
                onChange={(e) => setNombreComedor(e.target.value)}
                placeholder="Ej. Comedor Comunitario Siloé Esperanza"
                className="retro-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="retro-label" htmlFor="new-comedor-zona">Zona de Cali *</label>
                <select
                  id="new-comedor-zona"
                  value={zonaComedor}
                  onChange={(e) => setZonaComedor(e.target.value as ZonaCali)}
                  className="retro-field"
                >
                  <option value="CENTRO">CENTRO</option>
                  <option value="NORTE">NORTE</option>
                  <option value="SUR">SUR</option>
                  <option value="ORIENTE">ORIENTE</option>
                  <option value="LADERA">LADERA</option>
                </select>
              </div>
              <div>
                <label className="retro-label" htmlFor="new-comedor-comensales">Comensales/día *</label>
                <input
                  id="new-comedor-comensales"
                  type="number"
                  min="10"
                  required
                  value={comensales}
                  onChange={(e) => setComensales(e.target.value)}
                  className="retro-field"
                />
              </div>
            </div>
            <div>
              <label className="retro-label" htmlFor="new-comedor-dir">Dirección en Cali *</label>
              <input
                id="new-comedor-dir"
                type="text"
                required
                value={direccionComedor}
                onChange={(e) => setDireccionComedor(e.target.value)}
                placeholder="Ej. Calle 1 Oeste # 50-12, Siloé"
                className="retro-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div>
                <label className="retro-label" htmlFor="new-comedor-urg">Prioridad *</label>
                <select
                  id="new-comedor-urg"
                  value={urgenciaComedor}
                  onChange={(e) => setUrgenciaComedor(e.target.value as NgoUrgency)}
                  className="retro-field"
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer pt-3">
                <input
                  type="checkbox"
                  checked={tieneFrio}
                  onChange={(e) => setTieneFrio(e.target.checked)}
                  className="w-4 h-4 accent-[#000080]"
                />
                <span className="font-bold text-[11px]">❄ Tiene nevera</span>
              </label>
            </div>
            <button type="submit" disabled={guardandoComedor} className="btn-green py-1.5 font-bold">
              {guardandoComedor ? "Guardando..." : "Guardar Comedor Comunitario"}
            </button>
          </form>
        )}

        {ngos.length === 0 && !mostrarFormComedor && (
          <div className="bevel-in bg-[#ffffe1] p-3 text-black font-mono text-xs">
            <p className="font-bold text-[#000080] mb-1">No hay comedores comunitarios registrados aún.</p>
            <p className="text-[11px] text-slate-700 mb-2">
              Haz clic en &quot;+ Nuevo Comedor&quot; para registrar un comedor comunitario real y asignarle donaciones.
            </p>
            <button
              type="button"
              onClick={() => setMostrarFormComedor(true)}
              className="btn-green px-3 py-1.5 text-xs font-bold"
            >
              + Registrar Primer Comedor Comunitario
            </button>
          </div>
        )}

        {ngos.map((n) => {
          const s = lot ? scoreMatch(lot, n) : null;
          const isBest = match?.ngo.id === n.id;
          return (
            <article
              key={n.id}
              onClick={() => s?.eligible && setNgoSeleccionadaManual(n.id)}
              className={`bg-white p-2.5 text-black bevel-in cursor-pointer transition-all ${
                isBest ? "ring-2 ring-nexo-phosphor" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold">{n.name}</h3>
                <span className={`shrink-0 px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${URG[n.urgency]}`}>
                  Prioridad {n.urgency}
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                {n.city} · {n.diners} comensales · {n.hasFridge ? "❄ con nevera" : "Temperatura Ambiente (sin nevera)"} · {n.distanceKm} km
              </p>
              {s && !s.eligible && <p className="font-mono text-[11px] font-bold text-red-700 mt-1">✖ No elegible: {s.reason}</p>}
              {isBest && <p className="font-mono text-[11px] font-bold text-green-700 mt-1">★ Comedor seleccionado para asignación</p>}
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-3" aria-label="Motor de emparejamiento">
        <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ ASIGNACIÓN DE ALIMENTOS</h2>
        <div className="scada-panel p-3">
          <label className="mb-1 block font-mono text-[10px] uppercase text-slate-400" htmlFor="sel-lot">Lote activo</label>
          <select id="sel-lot" className="retro-field" value={lotId} onChange={(e) => setLotId(e.target.value)}>
            {candidates.length === 0 && <option value="">Sin lotes disponibles</option>}
            {candidates.map((l) => (
              <option key={l.id} value={l.id}>{l.id} · {l.product} · {l.kg} kg · {l.hoursLeft}h</option>
            ))}
          </select>
          {lot && (lot.requiereFrio ?? requiresCold(lot.coldChain)) ? (
            <div className="mt-2.5">
              <ColdChainBadge requiereFrio={true} mostrarAdvertencia={true} size="sm" />
            </div>
          ) : lot ? (
            <div className="mt-2.5 font-mono text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded inline-block">
              Condición térmica: <b>Temperatura Ambiente</b>
            </div>
          ) : null}
          <p className="mt-2 font-mono text-[11px] leading-snug text-slate-400">
            Criterios: ① cercanía al lugar de recogida ② tiempo antes del vencimiento ③ necesidad del comedor. Se descartan comedores sin refrigeración si el alimento requiere frío.
          </p>
        </div>
        <MatchingCard lot={lot} match={match} validated={validated} onValidate={() => lot && match && validateMatch(lot.id, match.ngo.id)} />
      </section>

      <section className="flex flex-col gap-3" aria-label="Guía de despacho">
        <h2 className="font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ INFORMACIÓN DE TRANSPORTE Y ENTREGA</h2>
        <div className="bevel-out p-3 text-black">
          {dispatch && dispNgo ? (
            <div className="flex gap-3">
              <div className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed">
                <p><b>Unidad:</b> {dispatch.truck ?? "—"}</p>
                <p><b>Conductor:</b> {dispatch.driver ?? "—"}</p>
                <p><b>Retiro est.:</b> {dispatch.pickupAt ?? "—"}</p>
                <p><b>Entrega est.:</b> {dispatch.deliverAt ?? "—"}</p>
                <p className="truncate"><b>Destino:</b> {dispNgo.name}</p>
                <p><b>Lote:</b> {dispatch.lotId}</p>
              </div>
              <div className="bg-white p-1 bevel-in" title={dispatch.code}>
                <RetroQrCode code={dispatch.code} />
              </div>
            </div>
          ) : (
            <p className="font-mono text-xs text-slate-700">Sin transporte asignado. Confirma el envío a un comedor para programar el vehículo y generar el código de entrega.</p>
          )}
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-widest text-slate-400">Actividad reciente del sistema</h3>
          <TerminalLog entries={logs} heightClass="h-64" />
        </div>
      </section>
    </div>
  );
}
