"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NexoProvider, useNexo, type ViewId } from "./NexoContext";
import WindowFrame from "./WindowFrame";
import MenuBar, { type MenuEntry } from "./MenuBar";
import DashboardView from "./DashboardView";
import DonationForm from "./DonationForm";
import MatchingView from "./MatchingView";
import ImpactView from "./ImpactView";
import RadarMap from "./RadarMap";
import { useSession } from "@/lib/auth/session-context";
import { obtenerMisionesAsignadasVoluntario, obtenerEntregasPorComedor } from "@/actions/entregas";
import { listarOrganizaciones, actualizarOrganizacion, type OrganizacionRegistrada } from "@/actions/organizaciones";
import type { Donacion, RolUsuario } from "@/types";
import {
  Store,
  Utensils,
  Truck,
  Compass,
  ShieldCheck,
  FileCheck,
  QrCode,
  Snowflake,
  LogIn,
  PlusCircle,
} from "lucide-react";

const MENUS_POR_ROL: Record<RolUsuario, MenuEntry[]> = {
  DONANTE: [
    { id: "donante_inicio", label: "Mi Comercio y Donaciones", view: "dashboard" },
    { id: "donante_publicar", label: "+ Publicar Donación", view: "donation" },
    { id: "donante_rastreo", label: "Rastrear Mis Lotes", href: "/rastreo" },
    { id: "donante_certificados", label: "Certificados Tributarios DIAN", view: "impact" },
  ],
  VOLUNTARIO: [
    { id: "vol_panel", label: "Mi Panel de Rescatista", view: "dashboard" },
    { id: "vol_catalogo", label: "Catálogo y Mapa de Rescates", href: "/donaciones" },
    { id: "vol_ruta", label: "Mi Ruta Activa", href: "/ruta-activa" },
    { id: "vol_rastreo", label: "Rastreo de Lote", href: "/rastreo" },
  ],
  RECEPTOR: [
    { id: "rec_panel", label: "Mi Comedor y Lotes en Camino", view: "dashboard" },
    { id: "rec_directorio", label: "Directorio de Comedores", view: "matching", focusNgos: true },
    { id: "rec_rastreo", label: "Rastreo de Custodia", href: "/rastreo" },
  ],
  COORDINADOR: [
    { id: "coord_panel", label: "Centro de Control y Mapa", view: "dashboard" },
    { id: "coord_matching", label: "Asignación y Comedores", view: "matching" },
    { id: "coord_catalogo", label: "Catálogo y Expiradas", href: "/donaciones" },
    { id: "coord_impacto", label: "Tablero de Impacto y CSV", href: "/impacto" },
    { id: "coord_rastreo", label: "Rastreo", href: "/rastreo" },
  ],
  ADMIN: [
    { id: "adm_panel", label: "Centro de Control Global", view: "dashboard" },
    { id: "adm_usuarios", label: "Consola de Usuarios RBAC", href: "/admin/usuarios" },
    { id: "adm_impacto", label: "Tablero de Impacto y CSV", href: "/impacto" },
    { id: "adm_matching", label: "Asignación y Comedores", view: "matching" },
    { id: "adm_catalogo", label: "Catálogo y Expiradas", href: "/donaciones" },
    { id: "adm_donar", label: "Publicar Donación", view: "donation" },
    { id: "adm_rastreo", label: "Rastreo", href: "/rastreo" },
  ],
};

const TITLES: Record<ViewId, string> = {
  dashboard: "PANEL OPERATIVO POR ROL",
  donation: "REGISTRAR DONACIÓN DE ALIMENTOS",
  matching: "ASIGNACIÓN DE ALIMENTOS Y DIRECTORIO DE COMEDORES",
  impact: "IMPACTO SOCIAL Y CERTIFICADO DE DONACIÓN",
};

/**
 * Portal exclusivo del Comerciante Donante (`DONANTE`).
 */
function PortalDonanteView() {
  const { sesion } = useSession();
  const { lots, setView } = useNexo();

  const misLotes = lots.filter(
    (l) =>
      !sesion?.organizacionNombre ||
      l.donor.toLowerCase().includes(sesion.organizacionNombre.toLowerCase()) ||
      l.donor.toLowerCase().includes(sesion.nombre.toLowerCase())
  );
  const lotesMostrar = misLotes.length > 0 ? misLotes : lots;

  return (
    <div className="flex flex-col gap-4">
      <div className="bevel-out bg-[#f0fdf4] p-3.5 text-black font-mono text-xs flex flex-wrap items-center justify-between gap-3 border-2 border-emerald-700">
        <div className="flex items-center gap-2.5">
          <Store className="w-6 h-6 text-emerald-700 shrink-0" />
          <div>
            <p className="font-extrabold text-sm text-emerald-950">
              PORTAL DEL COMERCIANTE DONANTE — {sesion?.organizacionNombre || sesion?.nombre}
            </p>
            <p className="text-[11px] text-slate-700">
              Zona {sesion?.zona || "CENTRO"} • {sesion?.direccion || "Santiago de Cali"} • Amparo Sanitario Ley 1990 de 2019
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("donation")}
            className="btn-green min-h-[44px] px-4 font-extrabold flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ PUBLICAR NUEVA DONACIÓN</span>
          </button>
          <button
            type="button"
            onClick={() => setView("impact")}
            className="btn-98 min-h-[44px] px-3 font-bold text-[#000080]"
          >
            Certificados Tributarios DIAN &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <RadarMap />
        </div>
        <section className="scada-panel lg:col-span-5 p-3 flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
            <h2 className="font-bold text-nexo-phosphor">
              ▣ MIS LOTES PUBLICADOS ({lotesMostrar.length})
            </h2>
            <Link href="/rastreo" className="text-[11px] text-nexo-cyan underline">
              Auditar Trazabilidad &gt;
            </Link>
          </div>
          {lotesMostrar.length === 0 ? (
            <div className="bevel-in bg-[#ffffe1] p-4 text-black my-auto">
              <p className="font-bold text-[#000080] mb-1">Aún no has publicado excedentes.</p>
              <p className="text-[11px] text-slate-700 mb-3">
                Publica en menos de 60 segundos tus excedentes aptos para consumo humano. Un voluntario los recogerá y entregará en un comedor comunitario cercano.
              </p>
              <button
                type="button"
                onClick={() => setView("donation")}
                className="btn-green min-h-[42px] px-4 font-bold"
              >
                + Publicar Primera Donación
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {lotesMostrar.map((l) => (
                <div key={l.id} className="bevel-out bg-white p-2.5 text-black flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-[#000080] text-white px-1.5 py-0.5 font-bold text-[10px]">
                        {l.id}
                      </span>
                      <span className="font-bold">{l.product}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {l.kg} kg • {l.coldChain} • Estado: <b>{l.estado || l.status}</b>
                    </p>
                  </div>
                  <Link
                    href={`/rastreo?codigo=${encodeURIComponent(l.id)}`}
                    className="btn-98 !py-1 !px-2.5 text-[10px] font-bold text-[#000080] shrink-0"
                  >
                    Rastrear &gt;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Portal exclusivo del Voluntario Logístico en Campo (`VOLUNTARIO`).
 */
function PortalVoluntarioView() {
  const { sesion } = useSession();
  const [misiones, setMisiones] = useState<Donacion[]>([]);

  useEffect(() => {
    obtenerMisionesAsignadasVoluntario(sesion?.userId)
      .then((lista) => setMisiones(lista))
      .catch(() => {});
  }, [sesion?.userId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bevel-out bg-[#fef3c7] p-3.5 text-black font-mono text-xs flex flex-wrap items-center justify-between gap-3 border-2 border-amber-600">
        <div className="flex items-center gap-2.5">
          <Truck className="w-6 h-6 text-amber-800 shrink-0" />
          <div>
            <p className="font-extrabold text-sm text-amber-950">
              PORTAL OPERATIVO DEL VOLUNTARIO — {sesion?.nombre}
            </p>
            <p className="text-[11px] text-slate-700">
              Zona Base: {sesion?.zona || "CENTRO"} • Transporte: {sesion?.vehiculoTipo || sesion?.medioTransporte || "Moto"} • Rescate y Custodia en Campo
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/donaciones"
            className="btn-green min-h-[44px] px-4 font-extrabold flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>EXPLORAR CATÁLOGO Y ACEPTAR RESCATE</span>
          </Link>
          <Link
            href="/ruta-activa"
            className="btn-98 min-h-[44px] px-3 font-bold text-[#000080] flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4" />
            <span>Mi Ruta Activa ({misiones.length})</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <RadarMap />
        </div>
        <section className="scada-panel lg:col-span-5 p-3 flex flex-col gap-2 font-mono text-xs">
          <h2 className="font-bold text-nexo-phosphor border-b border-slate-700 pb-1.5">
            ▣ MIS MISIONES DE RESCATE EN CURSO ({misiones.length})
          </h2>
          {misiones.length === 0 ? (
            <div className="bevel-in bg-[#ffffe1] p-4 text-black my-auto">
              <p className="font-bold text-[#000080] mb-1">No tienes rescates asignados en este momento.</p>
              <p className="text-[11px] text-slate-700 mb-3">
                Ingresa al Catálogo de Donaciones para filtrar por tu zona de Cali, seleccionar un comedor comunitario destino y aceptar una misión de rescate.
              </p>
              <Link
                href="/donaciones"
                className="btn-green min-h-[42px] px-4 font-bold inline-flex items-center gap-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>Ver Ofertas Disponibles en Cali</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {misiones.map((m) => (
                <div key={m.id} className="bevel-out bg-white p-3 text-black flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#000080] text-white px-2 py-0.5 font-bold">{m.codigo}</span>
                    <span className="bg-amber-200 text-amber-950 px-2 py-0.5 font-bold text-[10px]">
                      EN RUTA
                    </span>
                  </div>
                  <p className="font-bold text-sm text-[#000080]">
                    {m.tipoAlimento} ({m.cantidadEstimada} {m.unidadMedida})
                  </p>
                  <p className="text-[11px] text-slate-700">
                    <b>Recoger en:</b> {m.donanteNombre} ({m.direccionRecogida})
                  </p>
                  {m.comedorNombre && (
                    <p className="text-[11px] text-sky-900 font-bold">
                      <b>Entregar en:</b> {m.comedorNombre}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/ruta-activa?id=${encodeURIComponent(m.id)}`}
                      className="btn-98 flex-1 py-1.5 text-center font-bold text-[#000080]"
                    >
                      Hoja de Ruta GPS
                    </Link>
                    <Link
                      href={`/entregas/${encodeURIComponent(m.id)}`}
                      className="btn-green flex-1 py-1.5 text-center font-bold"
                    >
                      Confirmar Entrega &gt;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Portal exclusivo del Comedor Comunitario / Fundación Receptora (`RECEPTOR`).
 */
function PortalReceptorView() {
  const { sesion } = useSession();
  const { refreshData } = useNexo();
  const [entregasComedor, setEntregasComedor] = useState<Donacion[]>([]);
  const [miComedor, setMiComedor] = useState<OrganizacionRegistrada | null>(null);
  const [guardandoCapacidad, setGuardandoCapacidad] = useState(false);

  useEffect(() => {
    obtenerEntregasPorComedor(sesion?.organizacionId, sesion?.organizacionNombre)
      .then((lista) => setEntregasComedor(lista))
      .catch(() => {});

    listarOrganizaciones("RECEPTOR")
      .then((orgs) => {
        const encontrada = orgs.find(
          (o) =>
            o.id === sesion?.organizacionId ||
            (sesion?.organizacionNombre &&
              o.nombre.toLowerCase() === sesion.organizacionNombre.toLowerCase())
        );
        if (encontrada) setMiComedor(encontrada);
      })
      .catch(() => {});
  }, [sesion?.organizacionId, sesion?.organizacionNombre]);

  const handleToggleRefrigeracion = async () => {
    if (!miComedor || guardandoCapacidad) return;
    setGuardandoCapacidad(true);
    try {
      const res = await actualizarOrganizacion(miComedor.id, {
        tieneRefrigeracion: !miComedor.tieneRefrigeracion,
      });
      if (res.exito && res.organizacion) {
        setMiComedor(res.organizacion);
        await refreshData();
      }
    } finally {
      setGuardandoCapacidad(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bevel-out bg-[#e0f2fe] p-3.5 text-black font-mono text-xs flex flex-wrap items-center justify-between gap-3 border-2 border-sky-700">
        <div className="flex items-center gap-2.5">
          <Utensils className="w-6 h-6 text-sky-800 shrink-0" />
          <div>
            <p className="font-extrabold text-sm text-sky-950">
              PORTAL DEL COMEDOR COMUNITARIO RECEPTOR — {miComedor?.nombre || sesion?.organizacionNombre || sesion?.nombre}
            </p>
            <p className="text-[11px] text-slate-700">
              Zona {miComedor?.zona || sesion?.zona || "CENTRO"} • {miComedor?.capacidadRacionesDia || miComedor?.comensalesDiarios || sesion?.capacidadRacionesDia || sesion?.comensalesDiarios || 150} comensales/día •{" "}
              {(miComedor?.tieneRefrigeracion ?? sesion?.tieneRefrigeracion)
                ? "❄ Con Nevera / Cuarto Frío Operativo"
                : "Temperatura Ambiente (Sin Nevera)"}
            </p>
          </div>
        </div>

        {miComedor && (
          <button
            type="button"
            disabled={guardandoCapacidad}
            onClick={handleToggleRefrigeracion}
            className="btn-98 min-h-[42px] px-3 font-bold text-[#000080] flex items-center gap-1.5"
          >
            <Snowflake className="w-4 h-4 text-sky-700" />
            <span>
              {miComedor.tieneRefrigeracion
                ? "Cambiar a Sin Nevera"
                : "Activar Capacidad de Frío"}
            </span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6">
          <RadarMap />
        </div>
        <section className="scada-panel lg:col-span-6 p-3 flex flex-col gap-2 font-mono text-xs">
          <h2 className="font-bold text-nexo-phosphor border-b border-slate-700 pb-1.5">
            ▣ LOTES EN CAMINO Y RECIBIDOS EN NUESTRO COMEDOR ({entregasComedor.length})
          </h2>
          {entregasComedor.length === 0 ? (
            <div className="bevel-in bg-[#ffffe1] p-4 text-black my-auto">
              <p className="font-bold text-[#000080] mb-1">
                Tu comedor comunitario ya está activo y visible en el directorio de Cali.
              </p>
              <p className="text-[11px] text-slate-700">
                Cuando un comerciante donante, coordinador o voluntario asigne un rescate hacia tu comedor, aparecerá aquí para que puedas firmar el Acta Digital de Recepción Física.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {entregasComedor.map((d) => (
                <div key={d.id} className="bevel-out bg-white p-3 text-black flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#000080] text-white px-2 py-0.5 font-bold">{d.codigo}</span>
                    <span
                      className={`px-2 py-0.5 font-bold text-[10px] ${
                        d.estado === "ENTREGADA"
                          ? "bg-green-100 text-green-900"
                          : d.estado === "ASIGNADA"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-sky-100 text-sky-900"
                      }`}
                    >
                      ESTADO: {d.estado}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-[#000080]">
                    {d.tipoAlimento} ({d.cantidadEstimada} {d.unidadMedida})
                  </p>
                  <p className="text-[11px] text-slate-700">
                    Donante: <b>{d.donanteNombre}</b> • Voluntario: <b>{d.voluntarioNombre || "Por asignar"}</b>
                  </p>
                  <div className="flex gap-2 pt-1">
                    {d.estado === "ASIGNADA" && (
                      <Link
                        href={`/entregas/${encodeURIComponent(d.id)}`}
                        className="btn-green flex-1 py-1.5 text-center font-bold flex items-center justify-center gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Firmar Acta de Recepción en Comedor</span>
                      </Link>
                    )}
                    <Link
                      href={`/rastreo?codigo=${encodeURIComponent(d.codigo)}`}
                      className="btn-98 py-1.5 px-3 font-bold text-[#000080] flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Ver Trazabilidad</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Shell() {
  const { sesion } = useSession();
  const { view, setView, setFocusNgos, focusNgos, settings, lots } = useNexo();

  const rolActivo: RolUsuario = sesion?.rol || "COORDINADOR";
  const menuItems = MENUS_POR_ROL[rolActivo] || MENUS_POR_ROL.COORDINADOR;

  const activeId =
    menuItems.find((m) => m.view === view && !!m.focusNgos === (view === "matching" && focusNgos))?.id ??
    menuItems[0]?.id ??
    "archivo";

  const select = (m: MenuEntry) => {
    if (!m.view) return;
    setFocusNgos(!!m.focusNgos);
    setView(m.view);
  };

  return (
    <div className={settings.radarAnim ? "" : "anim-off"}>
      <WindowFrame
        title={`NEXO: RESCATE DE ALIMENTOS [${
          sesion ? `PORTAL ${sesion.rol} — ${sesion.nombre.toUpperCase()}` : TITLES[view]
        }]`}
        menu={<MenuBar items={menuItems} activeId={activeId} onSelect={select} />}
        statusLeft={`Listo • ${
          lots.filter((l) => (l.estado ? l.estado === "DISPONIBLE" : l.status === "available")).length
        } donaciones disponibles • Datos 100% Reales`}
        statusRight={sesion ? `Rol: ${sesion.rol} (${sesion.estadoCuenta})` : "NEXO • Sin Sesión Activa"}
      >
        {/* Banner de invitación a Login/Registro si el usuario aún no ha elegido rol */}
        {!sesion && (
          <div className="mb-4 bevel-out bg-[#ffffe1] p-3 text-black font-mono text-xs flex flex-wrap items-center justify-between gap-3 border-2 border-[#000080]">
            <div>
              <p className="font-extrabold text-[#000080] text-sm">
                BIENVENIDO A NEXO RESCATE DE ALIMENTOS (MODO CERO DATOS FICTICIOS)
              </p>
              <p className="text-[11px] text-slate-700 mt-0.5">
                Para vivir la experiencia dedicada de cada actor (Donante, Comedor Comunitario, Voluntario, Coordinador o Admin), inicia sesión o regístrate según tu rol.
              </p>
            </div>
            <Link
              href="/login"
              className="btn-green min-h-[42px] px-4 font-extrabold flex items-center gap-1.5 shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>INGRESAR / CREAR CUENTA POR ROL &gt;</span>
            </Link>
          </div>
        )}

        {view === "dashboard" && (
          <>
            {sesion?.rol === "DONANTE" ? (
              <PortalDonanteView />
            ) : sesion?.rol === "VOLUNTARIO" ? (
              <PortalVoluntarioView />
            ) : sesion?.rol === "RECEPTOR" ? (
              <PortalReceptorView />
            ) : (
              <DashboardView />
            )}
          </>
        )}
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
