"use client";

import React, { useState } from "react";
import { Terminal } from "lucide-react";

interface Props {
  title: string;
  menu: React.ReactNode;
  statusLeft?: string;
  statusRight?: string;
  children: React.ReactNode;
}

export default function WindowFrame({ title, menu, statusLeft, statusRight, children }: Props) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [closed, setClosed] = useState(false);

  if (closed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 font-mono text-nexo-phosphor">
        <p className="text-glow-green text-lg">&gt; SESIÓN FINALIZADA. NEXO v2.0 desconectado.<span className="cursor-blink">_</span></p>
        <button className="btn-98" onClick={() => setClosed(false)}>
          Reiniciar sistema
        </button>
      </div>
    );
  }

  const ctl = "btn-98 !px-0 !py-0 w-[22px] h-[20px] flex items-center justify-center text-[12px] font-bold leading-none";

  return (
    <div className={maximized ? "p-0" : "p-2 sm:p-4 lg:p-6"}>
      <div
        className={`bevel-out mx-auto p-[3px] shadow-[8px_8px_0_rgba(0,0,0,0.55)] ${maximized ? "max-w-none" : "max-w-[1440px]"}`}
        role="application"
        aria-label="NEXO Rescate de Alimentos"
      >
        <header className="titlebar flex items-center gap-2 px-1.5 py-[3px]">
          <Terminal className="w-4 h-4 text-white shrink-0" aria-hidden />
          <h1 className="flex-1 truncate text-white font-mono font-bold text-[13px] tracking-wide">{title}</h1>
          <div className="flex gap-[3px]">
            <button className={ctl} onClick={() => setMinimized((m) => !m)} aria-label="Minimizar" title="Minimizar">
              _
            </button>
            <button className={ctl} onClick={() => setMaximized((m) => !m)} aria-label="Maximizar" title="Maximizar">
              □
            </button>
            <button className={`${ctl} ml-[2px]`} onClick={() => setClosed(true)} aria-label="Cerrar" title="Cerrar">
              X
            </button>
          </div>
        </header>
        {menu}
        {!minimized && (
          <>
            <main className="bg-[#0b1020] m-[2px] mt-1 p-3 sm:p-4 bevel-in-dark">{children}</main>
            <footer className="flex flex-wrap items-center gap-1 mt-1 text-[11px] text-black font-mono">
              <div className="bevel-in flex-1 px-2 py-0.5 truncate">{statusLeft}</div>
              <div className="flex items-center gap-1">
                <a
                  href="/donaciones"
                  className="bevel-out px-2 py-0.5 hover:bg-slate-200 active:translate-y-px text-[11px] font-bold"
                  title="Abrir Catálogo Móvil (CMP-02)"
                >
                  📱 Catálogo Móvil
                </a>
                <a
                  href="/ruta-activa"
                  className="bevel-out px-2 py-0.5 hover:bg-slate-200 active:translate-y-px text-[11px] font-bold"
                  title="Abrir Ruta Activa Móvil (CMP-03)"
                >
                  🚚 Ruta Activa
                </a>
              </div>
              <div className="bevel-in px-2 py-0.5 hidden sm:block">{statusRight}</div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
