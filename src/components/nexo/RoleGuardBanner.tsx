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
      className="bevel-out bg-[#ece9d8] border-2 border-red-700 p-4 sm:p-5 max-w-xl mx-auto text-black font-mono shadow-[6px_6px_0_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-700 text-white flex items-center justify-center shrink-0 border border-black font-bold">
          <ShieldAlert className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase bg-red-700 text-white px-2 py-0.5 border border-red-900">
              HTTP 403 ACCESO DENEGADO • RBAC CA-05.1
            </span>
            <span className="text-xs text-red-900 font-bold">
              Rol activo: <u>{rolActual}</u>
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-black border-b border-[#a0a0a0] pb-1">
            Restricción Normativa: {moduloRestringido}
          </h2>
          <p className="text-xs text-gray-800 leading-relaxed bg-[#fff5f5] p-2.5 border border-red-300">
            {mensajePersonalizado ||
              'Tu cuenta se encuentra confinada exclusivamente a las operaciones de tu rol (RNF-003 / CMP-05). Para acceder a este módulo se requieren credenciales de Administración o Coordinación Operativa.'}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/donaciones"
              className="btn-green text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
              <span>Volver al Catálogo Operativo</span>
            </Link>
            <Link
              href="/"
              className="btn-98 text-xs font-bold text-[#000080]"
            >
              <span>Ir a mi Portal Principal &gt;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleGuardBanner;
