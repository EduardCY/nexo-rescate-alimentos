import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Truck, 
  Store, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Utensils,
  Leaf,
  Droplets,
  Package,
  HeartHandshake
} from 'lucide-react';
import { OfflineStatusBadge } from '@/components/donaciones/OfflineStatusBadge';

export const metadata = {
  title: 'Red de Rescate de Alimentos | Fundación Mesa Común',
  description: 'Plataforma PWA Serverless para el rescate y redistribución eficiente de alimentos en Cali y el Valle.',
};

/**
 * Vista de inicio de la plataforma Nexo Rescate de Alimentos.
 * Diseñada bajo la filosofía Google Antigravity Premium (Glassmorphism, fluid typography, accesibilidad WCAG 2.1).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-10 max-w-6xl mx-auto flex flex-col gap-8 sm:gap-10">
      {/* Encabezado Principal y Badge de Conectividad */}
      <header className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
              Sprint 1 · CMP-01 Activo
            </span>
            <span className="bg-sky-500/15 text-sky-400 text-xs font-semibold px-3 py-1 rounded-full border border-sky-500/30">
              Equipo 3 · Nexo Cívico Studio
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            Red de Rescate de Alimentos
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
            Conectamos en tiempo real a comerciantes de plazas (Santa Elena, Cavasa, Alameda) con comedores comunitarios de Cali bajo la <strong className="text-emerald-400">Ley 1990 de 2019</strong>.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3 shrink-0 relative z-10 w-full md:w-auto">
          <OfflineStatusBadge />
          <Link
            href="/donar"
            className="glass-button-primary w-full md:w-auto text-center"
          >
            <Sparkles className="w-4 h-4" />
            Publicar Donación (CMP-01)
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </header>

      {/* Métricas de Impacto en Tiempo Real (KPI Cards Glassmorphism) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kilos Rescatados</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            1,450 <span className="text-xs font-medium text-slate-400">kg</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Plazas Cavasa y Santa Elena</p>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Raciones Entregadas</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            3,625 <span className="text-xs font-medium text-slate-400">platos</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">En 8 comedores comunitarios</p>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">CO₂ Mitigado</span>
            <Leaf className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-teal-400">
            3.05 <span className="text-xs font-medium text-slate-400">ton</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Factor 2.101 kg CO₂e/kg</p>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Agua Virtual</span>
            <Droplets className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-sky-400">
            942,500 <span className="text-xs font-medium text-slate-400">L</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Preservada en cadena agro</p>
        </div>
      </section>

      {/* Flujo de 5 Comportamientos Núcleo */}
      <section className="glass-panel p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Arquitectura de Comportamientos BDD (MVP)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Especificación formal ejecutable conforme al Módulo 3.
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
            5 / 5 Contratos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CMP-01 Activo */}
          <div className="glass-card p-5 border-emerald-500/40 bg-emerald-950/10 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  CMP-01 · EN PRODUCCIÓN
                </span>
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Publicación de Donaciones</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Wizard de 3 pasos con validación Zod, exención Ley 1990 y persistencia Offline-First con Dexie.js.
              </p>
            </div>
            <Link
              href="/donar"
              className="glass-button-primary text-xs py-2 w-full text-center"
            >
              Probar Wizard /donar <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* CMP-02 */}
          <div className="glass-card p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  CMP-02 · BACKLOG
                </span>
                <Clock className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-base font-bold text-white">Emparejamiento & Afinidad</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Algoritmo de afinidad por cercanía geográfica, urgencia y disponibilidad de nevera (cadena de frío).
              </p>
            </div>
          </div>

          {/* CMP-03 */}
          <div className="glass-card p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  CMP-03 · BACKLOG
                </span>
                <Truck className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">Toma Concurrente (RPC)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Bloqueo atómico pesimista <code className="text-amber-300">FOR UPDATE</code> en PostgreSQL para impedir doble toma por voluntarios.
              </p>
            </div>
          </div>

          {/* CMP-04 */}
          <div className="glass-card p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  CMP-04 · BACKLOG
                </span>
                <Building2 className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-base font-bold text-white">Recepción en Comedor</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Cierre con acta digital de entrega, confirmación de peso recibido y firma de responsable.
              </p>
            </div>
          </div>

          {/* CMP-05 */}
          <div className="glass-card p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                  CMP-05 · BACKLOG
                </span>
                <CheckCircle2 className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-white">Trazabilidad & Certificado</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Generación del certificado de donación deducible del impuesto de renta (Art. 257 E.T.).
              </p>
            </div>
          </div>

          {/* Gobernanza & Habeas Data */}
          <div className="glass-card p-5 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  GOBERNANZA · AUDITADO
                </span>
                <HeartHandshake className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Habeas Data (Ley 1581)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Cero captura ni persistencia de datos sensibles de beneficiarios de los comedores comunitarios.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 text-center sm:text-left">
        <p>
          © 2026 <b>Fundación Mesa Común</b> & <b>Nexo Cívico Studio</b> · Santiago de Cali
        </p>
        <p className="flex items-center gap-1.5 text-slate-400">
          Desarrollado con arquitectura <b>Next.js 14 App Router + Supabase + Dexie.js</b>
        </p>
      </footer>
    </main>
  );
}
