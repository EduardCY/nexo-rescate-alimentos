import React from "react";
import { fmt, fmtCop, type Delivery } from "@/lib/nexo/impact";

export default function TaxCertificateTable({ rows }: { rows: Delivery[] }) {
  const totalKg = rows.reduce((s, r) => s + r.kg, 0);
  const total = rows.reduce((s, r) => s + r.deductibleCop, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs text-black">
        <thead>
          <tr className="bg-[#000080] font-mono text-white">
            <th className="px-2 py-1.5">CONCEPTO</th>
            <th className="px-2 py-1.5 text-right">KILOS VALIDADOS</th>
            <th className="px-2 py-1.5">DESTINATARIO RECEPTOR</th>
            <th className="px-2 py-1.5 text-right">VALOR DEDUCIBLE EST.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-center font-mono text-slate-500">Sin donaciones validadas en el periodo.</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.lotId} className={i % 2 ? "bg-slate-100" : "bg-white"}>
              <td className="px-2 py-1.5">{r.concept}</td>
              <td className="px-2 py-1.5 text-right font-mono">{fmt.format(r.kg)} kg</td>
              <td className="px-2 py-1.5">{r.recipient}</td>
              <td className="px-2 py-1.5 text-right font-mono font-bold text-green-700">{fmtCop(r.deductibleCop)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-black bg-slate-200 font-bold">
            <td className="px-2 py-1.5">TOTAL</td>
            <td className="px-2 py-1.5 text-right font-mono">{fmt.format(totalKg)} kg</td>
            <td />
            <td id="cert-total" className="px-2 py-1.5 text-right font-mono text-green-700">{fmtCop(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
