'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, ShieldCheck } from 'lucide-react';
import { useSession } from '@/lib/auth/session-context';
import { puedeAccederRuta } from '@/lib/rbac/permisos';
import { RoleGuardBanner } from '@/components/nexo/RoleGuardBanner';
import { MetricasDashboard } from '@/components/admin/MetricasDashboard';
import WindowFrame from '@/components/nexo/WindowFrame';

/**
 * Página dedicada al Tablero de Impacto Social y Ambiental (`/impacto` — CMP-05 / TASK-25).
 *
 * ¿Por qué?: Aplica guarda RBAC para impedir que el rol VOLUNTARIO acceda a reportes consolidados
 * (CA-05.1), reservando la vista y la exportación CSV a ADMIN y COORDINADOR.
 * Diseñado con marco WindowFrame y diseño retro Windows 98 / SCADA.
 */
export default function ImpactoPage() {
  const { sesion } = useSession();

  const rolEval = sesion?.rol;
  const estadoEval = sesion?.estadoCuenta || 'ACTIVO';
  const autorizado = Boolean(rolEval && puedeAccederRuta(rolEval, '/impacto', estadoEval));

  return (
    <main className="min-h-screen bg-[#008080] p-2 sm:p-4 font-mono text-xs">
      <div className="max-w-6xl mx-auto">
        <WindowFrame
          title="NEXO AUDITORÍA — TABLERO DE IMPACTO SOCIAL Y AMBIENTAL"
          icon={<BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />}
        >
          <div className="flex flex-col gap-3">
            {/* Barra de herramientas retro superior */}
            <div className="bevel-out bg-[#ece9d8] p-2 flex flex-wrap items-center justify-between gap-2 border-2 border-[#808080]">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="btn-98 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 text-black"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Mi Portal ({sesion?.rol || 'Invitado'})</span>
                </Link>

                {(sesion?.rol === 'ADMIN' || sesion?.rol === 'COORDINADOR') && (
                  <Link
                    href="/admin/usuarios"
                    className="btn-98 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 text-black"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-red-700" />
                    <span>Consola de Usuarios RBAC</span>
                  </Link>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-700 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>MÉTRICAS: CÁLCULO AUDITADO FAO • LEY 1990</span>
              </div>
            </div>

            {/* Contenido protegido por RoleGuardBanner o Dashboard */}
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
        </WindowFrame>
      </div>
    </main>
  );
}