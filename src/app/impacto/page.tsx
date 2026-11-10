'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ShieldCheck } from 'lucide-react';
import { useSession } from '@/lib/auth/session-context';
import { puedeAccederRuta } from '@/lib/rbac/permisos';
import { RoleGuardBanner } from '@/components/nexo/RoleGuardBanner';
import { MetricasDashboard } from '@/components/admin/MetricasDashboard';

/**
 * Página dedicada al Tablero de Impacto Social y Ambiental (`/impacto` — CMP-05 / TASK-25).
 *
 * ¿Por qué?: Aplica guarda RBAC para impedir que el rol VOLUNTARIO acceda a reportes consolidados
 * (CA-05.1), reservando la vista y la exportación CSV a ADMIN y COORDINADOR.
 */
export default function ImpactoPage() {
  const { sesion } = useSession();

  const rolEval = sesion?.rol;
  const estadoEval = sesion?.estadoCuenta || 'ACTIVO';
  const autorizado = Boolean(rolEval && puedeAccederRuta(rolEval, '/impacto', estadoEval));

  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 flex items-center justify-center text-slate-200"
              aria-label="Volver al portal principal"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                <span>Tablero de Impacto Social y Ambiental (CMP-05)</span>
              </h1>
              <p className="text-xs font-mono text-slate-400">
                Auditoría de raciones, kilogramos rescatados y huella de carbono evitada • FAO / Ley 1990
              </p>
            </div>
          </div>

          {(sesion?.rol === 'ADMIN' || sesion?.rol === 'COORDINADOR') && (
            <Link
              href="/admin/usuarios"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-sky-300 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Consola de Usuarios RBAC</span>
            </Link>
          )}
        </header>

        {!autorizado ? (
          <RoleGuardBanner
            rolActual={rolEval || 'SIN SESIÓN ACTIVA'}
            moduloRestringido="Tablero de Impacto y Métricas Ambientales (/impacto)"
            mensajePersonalizado={
              !sesion
                ? 'Debes iniciar sesión con una cuenta de rol ADMIN o COORDINADOR en /login para consultar las métricas de impacto.'
                : undefined
            }
          />
        ) : (
          <MetricasDashboard />
        )}
      </div>
    </main>
  );
}
