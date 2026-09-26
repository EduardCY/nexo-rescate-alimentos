import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Store, 
  Building2, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Terminal,
  Cpu,
  Lock
} from 'lucide-react';

/**
 * Vista de inicio de la plataforma Nexo Cívico - Rescate de Alimentos.
 * Muestra el estado operativo de los habilitadores de la Sesión 8 y los 5 comportamientos núcleo.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-6xl mx-auto flex flex-col gap-10">
      {/* Encabezado / Brand */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-700/60 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Módulo 3 · Sesión 8
            </span>
            <span className="bg-sky-500/20 text-sky-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-sky-500/30">
              Equipo 3 · Nexo Cívico Studio
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Red de Rescate de Alimentos
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-1">
            Fundación Mesa Común · Santiago de Cali, Colombia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400">Stack Seleccionado</p>
            <p className="text-sm font-semibold text-emerald-400">PWA Serverless</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
        </div>
      </header>

      {/* Checklist de Habilitadores de Hoy */}
      <section className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Habilitadores del Proyecto (Sesión 8 · 26 Sep)
          </h2>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/20">
            5 / 5 Listos
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-sm font-semibold text-white">1. Repositorio</p>
            <p className="text-xs text-slate-400 mt-1">
              Configurado con README inicial, estructura limpia y acceso para el docente.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-sm font-semibold text-white">2. Tablero GitHub</p>
            <p className="text-xs text-slate-400 mt-1">
              4 estados obligatorios: Por hacer, En curso, En revisión y Terminado.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-sm font-semibold text-white">3. Entorno</p>
            <p className="text-xs text-slate-400 mt-1">
              Next.js 14 + TypeScript + Tailwind con scripts reproducibles en local.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-sm font-semibold text-white">4. Accesos Repartidos</p>
            <p className="text-xs text-slate-400 mt-1">
              Roles y responsabilidades distribuidas entre los 5 integrantes del equipo.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-sm font-semibold text-white">5. Asistente IA Acordado</p>
            <p className="text-xs text-slate-400 mt-1">
              Antigravity (Gemini 3.8 Flash & Claude 4.6 Opus) con política de auditoría.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <p className="text-sm font-semibold text-white">6. Constitución y DoR/DoD</p>
            <p className="text-xs text-slate-400 mt-1">
              Criterios base + 2 criterios específicos fundamentados por lista.
            </p>
          </div>
        </div>
      </section>

      {/* Los 5 Comportamientos Clave del MVP */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Alcance del MVP: Los 5 Comportamientos Núcleo
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Conjunto mínimo de comportamientos que permite a la fundación sustituir el grupo de WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* CMP-01 */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  CMP-01
                </span>
                <Store className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-white text-base">Registrar Donación</h3>
              <p className="text-xs text-slate-400 mt-1">
                Tipo de alimento, cantidad aproximada, punto de recogida, hora límite y exención Ley 1990/2019.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Trazado a: RF-001, RF-017
            </div>
          </div>

          {/* CMP-02 */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  CMP-02
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-white text-base">Hacerla Visible</h3>
              <p className="text-xs text-slate-400 mt-1">
                Catálogo en tiempo real para transportistas con alertas de refrigeración y vigencia.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Trazado a: RF-002, RF-014
            </div>
          </div>

          {/* CMP-03 - El Corazón */}
          <div className="p-5 rounded-2xl bg-sky-950/40 border border-sky-500/40 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-sky-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-bl">
              CORAZÓN MVP
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                  CMP-03
                </span>
                <Lock className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="font-bold text-white text-base">Toma con Bloqueo Concurrente</h3>
              <p className="text-xs text-slate-300 mt-1">
                Reserva única por un solo voluntario. Exclusión mutua atómica que avisa a quien llega tarde.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-sky-500/20 text-[11px] text-sky-300/70 font-mono">
              Trazado a: RF-004, RF-010 (ADR-001)
            </div>
          </div>

          {/* CMP-04 */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  CMP-04
                </span>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-white text-base">Registrar Entrega</h3>
              <p className="text-xs text-slate-400 mt-1">
                Confirmación de recepción en el comedor receptor con fecha, hora y responsable.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Trazado a: RF-005, RF-006
            </div>
          </div>

          {/* CMP-05 */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  CMP-05
                </span>
                <Truck className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-white text-base">Consultar Estado / Trazabilidad</h3>
              <p className="text-xs text-slate-400 mt-1">
                Línea de tiempo auditable del ciclo de vida del alimento para cooperantes y Marcela.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
              Trazado a: RF-002, RF-007
            </div>
          </div>

          {/* Configuración Local */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  DEV-ENV
                </span>
                <Terminal className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-white text-base">Comando Rápido</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono bg-slate-950 p-2 rounded border border-slate-800">
                npm install &amp;&amp; npm run dev
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Puerto predeterminado: :3000
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Equipo */}
      <footer className="border-t border-slate-800 pt-6 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p>© 2026 Nexo Cívico Studio · Universidad Autónoma de Occidente</p>
        <p className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Antigravity (Gemini 3.8 Flash &amp; Claude 4.6 Opus)
        </p>
      </footer>
    </main>
  );
}
