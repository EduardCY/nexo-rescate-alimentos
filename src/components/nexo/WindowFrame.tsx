"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { useSession } from "@/lib/auth/session-context";

interface Props {
  title: string;
  icon?: React.ReactNode;
  menu?: React.ReactNode;
  statusLeft?: string;
  statusRight?: string;
  children: React.ReactNode;
}

export default function WindowFrame({ title, icon, menu, statusLeft, statusRight, children }: Props) {
  const [maximized, setMaximized] = useState(false);
  const { sesion } = useSession();

  const ctl = "btn-98 !px-0 !py-0 w-[24px] h-[22px] flex items-center justify-center text-[12px] font-bold leading-none";

  const rol = sesion?.rol;
  const puedeVerRuta = rol === "VOLUNTARIO" || rol === "RECEPTOR" || rol === "COORDINADOR" || rol === "ADMIN";
  const puedePublicar = rol === "DONANTE" || rol === "ADMIN";
  const puedeAdmin = rol === "ADMIN" || rol === "COORDINADOR";

  return (
    <div className={maximized ? "p-0" : "p-2 sm:p-4 lg:p-6"}>
      <div
        className={`bevel-out mx-auto p-[3px] shadow-[8px_8px_0_rgba(0,0,0,0.55)] ${maximized ? "max-w-none" : "max-w-[1440px]"}`}
        role="application"
        aria-label="NEXO Rescate de Alimentos"
      >
        <header className="titlebar flex items-center gap-2 px-2 py-1">
          {icon || <Terminal className="w-4 h-4 text-white shrink-0" aria-hidden />}
          <h1 className="flex-1 truncate text-white font-mono font-bold text-[13px] tracking-wide">{title}</h1>
          <div className="flex gap-[3px]">
            <button
              className={ctl}
              onClick={() => setMaximized((m) => !m)}
              aria-label={maximized ? "Restaurar tamaño" : "Pantalla completa"}
              title={maximized ? "Restaurar" : "Maximizar"}
            >
              {maximized ? "❐" : "□"}
            </button>
          </div>
        </header>
        {menu}
        <main className="bg-[#0b1020] m-[2px] mt-1 p-3 sm:p-4 bevel-in-dark">{children}</main>
        <footer className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-black font-mono">
          <div className="bevel-in flex-1 px-2.5 py-1.5 truncate text-[11px] bg-[#f5f5f5]">{statusLeft}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href="/donaciones"
              className="bevel-out px-3 py-1.5 min-h-[38px] hover:bg-slate-200 active:translate-y-px text-xs font-bold inline-flex items-center gap-1 bg-[#ece9d8]"
              title="Abrir Catálogo de Alimentos"
            >
              <span>📱 Catálogo</span>
            </Link>
            {puedeVerRuta && (
              <Link
                href="/ruta-activa"
                className="bevel-out px-3 py-1.5 min-h-[38px] hover:bg-slate-200 active:translate-y-px text-xs font-bold inline-flex items-center gap-1 bg-[#ece9d8]"
                title="Ver Hoja de Ruta en Curso"
              >
                <span>🚚 Ruta Activa</span>
              </Link>
            )}
            {puedePublicar && (
              <Link
                href="/donar"
                className="bevel-out px-3 py-1.5 min-h-[38px] hover:bg-slate-200 active:translate-y-px text-xs font-bold text-emerald-900 inline-flex items-center gap-1 bg-emerald-100"
                title="Publicar Nuevo Excedente"
              >
                <span>+ Publicar Alimento</span>
              </Link>
            )}
            {puedeAdmin && (
              <Link
                href="/admin/usuarios"
                className="bevel-out px-3 py-1.5 min-h-[38px] hover:bg-slate-200 active:translate-y-px text-xs font-bold text-indigo-900 inline-flex items-center gap-1 bg-indigo-50"
                title="Consola de Gobernanza RBAC"
              >
                <span>👥 Usuarios</span>
              </Link>
            )}
          </div>
          <div className="bevel-in px-2.5 py-1.5 hidden sm:block text-[11px] bg-[#f5f5f5]">{statusRight}</div>
        </footer>
      </div>
    </div>
  );
}
