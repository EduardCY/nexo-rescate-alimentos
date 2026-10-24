"use client";

import React, { useState } from "react";
import { useNexo } from "./NexoContext";
import LotCard from "./LotCard";
import {
  CATEGORIES,
  COLD_CHAIN_OPTIONS,
  calcImpact,
  categoryById,
  fmt,
  fmtCop,
  urgencyOf,
  requiresCold,
  type CategoryId,
} from "@/lib/nexo/impact";
import { publicarDonacion } from "@/actions/donaciones";
import { guardarDonacionOffline } from "@/lib/db";
import { DonacionInputSchema, type DonacionInput } from "@/lib/validations/donacion";

const INITIAL = {
  donor: "Comercio Plaza Santa Elena",
  category: "fruta" as CategoryId,
  kg: "45",
  hours: "6",
  cold: COLD_CHAIN_OPTIONS[0] as string,
  dock: "Plaza Santa Elena - Puesto 45",
  legal: true,
};

export default function DonationForm() {
  const { addLot, setView, pushLog } = useNexo();
  const [f, setF] = useState(INITIAL);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<{ codigo: string; offline: boolean } | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const set = <K extends keyof typeof INITIAL>(k: K, v: (typeof INITIAL)[K]) => {
    setErrorValidacion(null);
    setF((s) => ({ ...s, [k]: v }));
  };

  const kg = parseFloat(f.kg);
  const hours = parseFloat(f.hours);
  const kgOk = Number.isFinite(kg) && kg > 0;
  const hoursOk = Number.isFinite(hours) && hours > 0;
  const valid = kgOk && hoursOk && f.donor.trim() !== "" && f.dock.trim() !== "" && f.legal;
  const impact = calcImpact(kgOk ? kg : 0, f.category);
  const cat = categoryById(f.category);
  const urgency = urgencyOf(hoursOk ? hours : 99);

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || cargando) return;
    setCargando(true);
    setErrorValidacion(null);

    try {
      // Cálculo de hora límite futura en formato ISO a partir de las horas restantes
      const fechaLimite = new Date(Date.now() + hours * 3600 * 1000).toISOString();

      // Construcción del payload conforme a la especificación de negocio (RF-001, RF-017)
      const payload: DonacionInput = {
        tipoAlimento: `${cat.label}`,
        cantidadEstimada: kg,
        unidadMedida: 'kg',
        direccionRecogida: f.dock.trim(),
        horaLimite: fechaLimite,
        requiereFrio: requiresCold(f.cold),
        exencionSanitariaAceptada: true,
        donanteNombre: f.donor.trim(),
      };

      // Validación previa con Zod
      const parseResult = DonacionInputSchema.safeParse(payload);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || (parseResult.error as unknown as { errors?: Array<{ message: string }> }).errors || [];
        setErrorValidacion(issues.map((i) => i.message).join('. '));
        setCargando(false);
        return;
      }

      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      let codigoAsignado = `DON-${Date.now().toString().slice(-3)}`;
      let esOffline = false;

      if (isOnline) {
        // Ejecución en servidor con Supabase (Server Action)
        const res = await publicarDonacion(parseResult.data);
        if (res.exito) {
          codigoAsignado = res.codigo;
          pushLog("ok", `Donación ${codigoAsignado} registrada en servidor Supabase.`);
        } else {
          // Si el servidor falla, guardamos en la base de datos local Dexie (RNF-002)
          const localId = await guardarDonacionOffline(parseResult.data);
          codigoAsignado = `OFFLINE-DON-${localId}`;
          esOffline = true;
          pushLog("warn", `Fallo remoto. Guardado local en Dexie: ${codigoAsignado}`);
        }
      } else {
        // Modo sin red: persistencia local inmediata en plaza
        const localId = await guardarDonacionOffline(parseResult.data);
        codigoAsignado = `OFFLINE-DON-${localId}`;
        esOffline = true;
        pushLog("warn", `Modo offline (sin red). Guardado en Dexie: ${codigoAsignado}`);
      }

      // Registro en el contexto en vivo de la aplicación para actualizar dashboard
      await addLot({
        donor: f.donor.trim(),
        product: cat.label,
        category: f.category,
        kg,
        hoursLeft: hours,
        coldChain: f.cold,
        dock: f.dock.trim(),
      });

      setMensajeExito({ codigo: codigoAsignado, offline: esOffline });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar el lote';
      setErrorValidacion(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Columna Izquierda: Formulario Clásico Windows 98 */}
      <form onSubmit={publish} className="bevel-out p-3 sm:p-4 flex flex-col justify-between" aria-label="Formulario de donación rápida">
        <div>
          <h2 className="mb-3 bg-[#000080] px-2 py-1 font-mono text-xs font-bold tracking-wide text-white flex items-center justify-between">
            <span>▣ ALTA DE LOTE EXCEDENTE · DONACIÓN RÁPIDA (CMP-01)</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-normal">&lt; 45s</span>
          </h2>

          {/* Diálogo de éxito estilo mensaje de sistema */}
          {mensajeExito && (
            <div className="mb-3 bevel-in bg-[#ffffe1] p-3 text-black text-xs font-mono border border-[#808080]">
              <p className="font-bold text-[#000080] text-sm">
                ✔ {mensajeExito.offline ? 'REGISTRO LOCAL EN PLAZA EXITOSO' : 'LOTE PUBLICADO EN LA RED'}
              </p>
              <p className="mt-1">
                Código de seguimiento: <b className="text-black bg-white px-1.5 py-0.5 bevel-in">{mensajeExito.codigo}</b>
              </p>
              <p className="mt-1 text-slate-700">
                {mensajeExito.offline 
                  ? 'Guardado en almacenamiento Dexie. Se sincronizará automáticamente con Supabase al detectar señal.'
                  : 'Notificación despachada a comedores comunitarios de Cali.'}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button 
                  type="button" 
                  className="btn-98 px-3"
                  onClick={() => { setMensajeExito(null); setF(INITIAL); }}
                >
                  Registrar otro lote
                </button>
                <button 
                  type="button" 
                  className="btn-98 px-3"
                  onClick={() => setView('dashboard')}
                >
                  Ir al Dashboard &gt;
                </button>
              </div>
            </div>
          )}

          {errorValidacion && (
            <div className="mb-3 bg-red-100 border border-red-500 p-2 text-red-800 text-xs font-mono bevel-in">
              ✖ Error: {errorValidacion}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="retro-label" htmlFor="f-donor">Establecimiento / Puesto Donante *</label>
              <input 
                id="f-donor" 
                className="retro-field" 
                placeholder="Nombre del puesto o comercio (ej. Puesto 45 Doña Rosa)" 
                value={f.donor} 
                onChange={(e) => set("donor", e.target.value)} 
                required
              />
            </div>

            <div>
              <label className="retro-label" htmlFor="f-cat">Tipo / Categoría de Alimento *</label>
              <select 
                id="f-cat" 
                className="retro-field cursor-pointer" 
                value={f.category} 
                onChange={(e) => set("category", e.target.value as CategoryId)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="retro-label" htmlFor="f-kg">Cantidad Estimada (Kilogramos) *</label>
              <input 
                id="f-kg" 
                type="number" 
                min="0.1" 
                step="any" 
                className="retro-field font-bold" 
                placeholder="0" 
                value={f.kg} 
                onChange={(e) => set("kg", e.target.value)} 
                required
              />
            </div>

            <div>
              <label className="retro-label" htmlFor="f-hours">Ventana Límite de Retiro (Horas) *</label>
              <input 
                id="f-hours" 
                type="number" 
                min="1" 
                max="72" 
                step="1" 
                className="retro-field font-bold" 
                placeholder="Horas restantes (ej. 4)" 
                value={f.hours} 
                onChange={(e) => set("hours", e.target.value)} 
                required
              />
            </div>

            <div>
              <label className="retro-label" htmlFor="f-cold">Protocolo Cadena de Frío *</label>
              <select 
                id="f-cold" 
                className="retro-field cursor-pointer" 
                value={f.cold} 
                onChange={(e) => set("cold", e.target.value)}
              >
                {COLD_CHAIN_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="retro-label" htmlFor="f-dock">Ubicación Muelle / Dirección de Recogida *</label>
              <input 
                id="f-dock" 
                className="retro-field" 
                placeholder="Plaza, módulo, bodega o puerta de carga" 
                value={f.dock} 
                onChange={(e) => set("dock", e.target.value)} 
                required
              />
            </div>

            {/* Compuerta Legal Obligatoria Ley 1990 de 2019 */}
            <div className="sm:col-span-2 bevel-in bg-[#ece9d8] p-2 mt-1">
              <label className="flex items-start gap-2.5 text-xs text-black cursor-pointer select-none">
                <input 
                  id="f-legal" 
                  type="checkbox" 
                  className="mt-0.5 h-4 w-4 accent-[#000080] shrink-0 cursor-pointer" 
                  checked={f.legal} 
                  onChange={(e) => set("legal", e.target.checked)} 
                  required
                />
                <span className="leading-tight">
                  <b className="text-[#000080]">Declaración Sanitaria (Ley 1990 de 2019):</b> Declaro de buena fe que los alimentos donados son aptos para consumo humano, están empacados higiénicamente y acepto la exención de responsabilidad legal.
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#808080] flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button 
            type="button" 
            className="btn-98 px-4" 
            onClick={() => { setF(INITIAL); setErrorValidacion(null); }}
            disabled={cargando}
          >
            Descartar
          </button>
          <button 
            id="btn-publish" 
            type="submit" 
            className="btn-green px-5 py-2.5 text-xs sm:text-sm font-bold min-h-[46px]" 
            disabled={!valid || cargando}
          >
            {cargando ? 'PROCESANDO EN RED...' : 'PUBLICAR LOTE PARA RESCATE INMEDIATO'}
          </button>
        </div>

        {!valid && (
          <p className="mt-2 text-right font-mono text-[11px] text-red-700">
            * Completa todos los campos obligatorios y acepta la declaración de inocuidad.
          </p>
        )}
      </form>

      {/* Columna Derecha: Previsualización en Vivo de Lote & Impacto */}
      <div className="flex flex-col gap-3">
        <section className="scada-panel p-3" aria-label="Previsualización del lote">
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-phosphor flex items-center justify-between">
            <span>▣ LIVE PREVIEW · LOTE</span>
            <span className="text-[10px] text-slate-400 font-normal">Actualización automática</span>
          </h2>
          <LotCard 
            lot={{ 
              product: cat.label, 
              kg: kgOk ? kg : 0, 
              hoursLeft: hoursOk ? hours : 0, 
              donor: f.donor || "—", 
              coldChain: f.cold 
            }} 
          />
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-slate-400">
            <span>Prioridad de despacho:</span>
            {hoursOk ? (
              <b className={urgency === "CRÍTICO" ? "text-red-400 text-glow-amber" : urgency === "ALTO" ? "text-nexo-amber text-glow-amber" : "text-nexo-phosphor text-glow-green"}>
                {urgency} (&lt; {hours}H)
              </b>
            ) : "—"}
          </div>
          <div className="mt-3 bevel-in-dark bg-black/50 p-2.5 font-mono text-slate-300 flex items-center justify-between">
            <span className="text-xs uppercase text-slate-400">Raciones estimadas:</span>
            <span id="preview-rations" className="text-2xl sm:text-3xl font-extrabold text-nexo-amber text-glow-amber">
              {fmt.format(impact.rations)} <span className="text-xs font-normal text-slate-400">platos</span>
            </span>
          </div>
        </section>

        <section className="scada-panel p-3" aria-label="Cálculo de impacto">
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-cyan">
            ▣ CÁLCULO DE IMPACTO EN TIEMPO REAL
          </h2>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="bevel-in-dark bg-black/40 p-2.5">
              <dt className="font-mono text-[10px] uppercase text-slate-400">CO₂ emisiones evitadas</dt>
              <dd id="preview-co2" className="font-mono text-xl font-extrabold text-nexo-cyan text-glow-cyan mt-1">
                {impact.co2Kg.toFixed(1)} <span className="text-xs font-normal text-slate-400">kg CO₂e</span>
              </dd>
            </div>
            <div className="bevel-in-dark bg-black/40 p-2.5">
              <dt className="font-mono text-[10px] uppercase text-slate-400">Agua virtual preservada</dt>
              <dd id="preview-water" className="font-mono text-xl font-extrabold text-nexo-phosphor text-glow-green mt-1">
                {fmt.format(Math.round(impact.waterL))} <span className="text-xs font-normal text-slate-400">Litros</span>
              </dd>
            </div>
          </dl>
          <div className="mt-2 bevel-in-dark bg-black/40 p-2.5">
            <p className="font-mono text-[10px] uppercase text-slate-400">Valoración económica deducible estimada (Art. 257 E.T.)</p>
            <p id="preview-cop" className="font-mono text-xl sm:text-2xl font-extrabold text-nexo-amber text-glow-amber mt-0.5">
              {fmtCop(impact.deductibleCop)} <span className="text-xs font-normal text-slate-400">COP</span>
            </p>
            <p className="font-mono text-[10px] text-slate-500 mt-1">
              Valor comercial {fmtCop(impact.valueCop)} · Estimación referencial Ley 1990 de 2019.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
