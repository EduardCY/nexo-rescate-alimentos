"use client";

import React, { useState } from "react";
import { useNexo } from "./NexoContext";
import KpiCard from "./KpiCard";
import TaxCertificateTable from "./TaxCertificateTable";
import { DEDUCTION_RATE, fmt, fmtCop } from "@/lib/nexo/impact";

export default function ImpactView() {
  const { totals, deliveries, certificate } = useNexo();
  const [showSig, setShowSig] = useState(false);
  const totalKg = deliveries.reduce((s, r) => s + r.kg, 0);
  const dash = (v?: string) => (v && v.trim() ? v : "—");

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Impacto en sostenibilidad">
        <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ IMPACTO EN SOSTENIBILIDAD · FAO / ODS 12.3</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <KpiCard big label="Huella de carbono evitada (TON CO2)" value={totals.co2Ton.toFixed(1)} unit="TON" tone="cyan" />
          <KpiCard big label="Agua virtual protegida (litros)" value={fmt.format(totals.waterL)} unit="L" tone="green" />
          <KpiCard big label="Valor comercial rescatado (COP)" value={fmtCop(totals.valueCop)} unit="COP" tone="amber" />
        </div>
      </section>

      <section aria-label="Certificado de deducción tributaria">
        <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-phosphor">▣ CERTIFICACIÓN PARA DEDUCCIÓN TRIBUTARIA · DIAN / LEY 1990 DE 2019</h2>
        <article className="print-area bg-white p-4 text-black bevel-out sm:p-6">
          <header className="border-b-2 border-black pb-3">
            <p className="font-mono text-[11px] text-slate-600">CERTIFICADO DE DONACIÓN DE ALIMENTOS</p>
            <h3 className="text-lg font-bold">Certificación de donaciones para beneficio tributario</h3>
          </header>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-xs md:grid-cols-4">
            <div><dt className="text-slate-500">RAZÓN SOCIAL</dt><dd className="font-bold">{dash(certificate?.legalName)}</dd></div>
            <div><dt className="text-slate-500">NIT</dt><dd className="font-bold">{dash(certificate?.nit)}</dd></div>
            <div><dt className="text-slate-500">PERIODO LIQUIDADO</dt><dd className="font-bold">{dash(certificate?.period)}</dd></div>
            <div><dt className="text-slate-500">TOTAL KG DONADOS</dt><dd id="cert-kg" className="font-bold">{fmt.format(totalKg)} kg</dd></div>
          </dl>
          <div className="mt-4"><TaxCertificateTable rows={deliveries} /></div>
          <p className="mt-2 font-mono text-[10px] text-slate-500">
            Valor deducible estimado = valor comercial × {Math.round(DEDUCTION_RATE * 100)}%. Estimación referencial; validar con contador público antes de presentar a la DIAN.
          </p>
          {showSig && (
            <p className="mt-3 break-all bg-slate-100 p-2 font-mono text-[11px] bevel-in">
              {certificate?.signature ? `✔ Firma digital · ${certificate.signature}` : "Firma digital no disponible."}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
            <button id="btn-signature" className="btn-98 px-4" onClick={() => setShowSig((s) => !s)}>
              {showSig ? "Ocultar Firma Digital" : "Ver Firma Digital"}
            </button>
            <button id="btn-pdf" className="btn-blue px-4 py-2 text-xs" onClick={() => window.print()}>
              DESCARGAR PDF
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
