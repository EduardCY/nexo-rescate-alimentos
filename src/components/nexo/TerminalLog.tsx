"use client";

import React, { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/nexo/impact";

const LEVEL_STYLE: Record<LogEntry["level"], string> = {
  info: "text-nexo-cyan",
  ok: "text-nexo-phosphor",
  warn: "text-nexo-amber",
};

export default function TerminalLog({ entries, heightClass = "h-48" }: { entries: LogEntry[]; heightClass?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      className={`${heightClass} overflow-y-auto bg-black bevel-in-dark p-2 font-vt text-[17px] leading-[1.15]`}
    >
      {entries.map((e) => (
        <p key={e.id} className={LEVEL_STYLE[e.level]}>
          <span className="text-slate-500">[{e.ts}]</span> {e.level === "ok" ? "✔" : e.level === "warn" ? "!" : ">"} {e.msg}
        </p>
      ))}
      <p className="text-nexo-phosphor">
        &gt; <span className="cursor-blink">█</span>
      </p>
    </div>
  );
}
