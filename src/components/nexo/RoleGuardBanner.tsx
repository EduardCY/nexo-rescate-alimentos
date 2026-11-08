'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import type { RolCorporativo } from '@/lib/rbac/permisos';

export interface RoleGuardBannerProps {
  rolActual?: RolCorporativo | string;
  moduloRestringido?: string;
  mensajePersonalizado?: string;
}

/**
 * Banner de confinamiento RBAC (HTTP 403 Forbidden) con estética Glassmorphism (CA-05.1 / TASK-13).
 *
 * ¿Por qué?: Informa con transparencia cuando un usuario con rol operativo en campo (ej. VOLUNTARIO)
 * intenta acceder por URL directa a módulos administrativos o reportes globales restringidos.
 */
export function RoleGuardBanner({
  rolActual = 'VOLUNTARIO',
  moduloRestringido = 'Módulo Administrativo / Reportes Globales',
  mensajePersonalizado,
}: RoleGuardBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="backdrop-blur-md bg-slate-900/80 border border-red-500/40 rounded-2xl p-6 max-w-xl mx-auto text-slate-100 shadow-2xl"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 shrink-0">
          <ShieldAlert className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
              HTTP 403 FORBIDDEN • RBAC CA-05.1
            </span>
            <span className="font-mono text-xs text-red-300">
              Rol activo: <b>{rolActual}</b>
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mb-1.5">
            Acceso Restringido — {moduloRestringido}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
            {mensajePersonalizado ||
              'Tu perfil se encuentra confinado exclusivamente a las operaciones autorizadas de tu rol (RNF-003 / CMP-05). Este módulo requiere credenciales de Administración o Coordinación.'}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/donaciones"
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-extrabold inline-flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Volver al Catálogo Operativo</span>
            </Link>
            <Link
              href="/"
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-mono text-xs font-bold inline-flex items-center gap-2 transition-colors"
            >
              <span>Ir a mi Portal Principal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleGuardBanner;
