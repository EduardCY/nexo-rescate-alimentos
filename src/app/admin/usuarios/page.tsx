'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, BarChart3 } from 'lucide-react';
import { useSession } from '@/lib/auth/session-context';
import { puedeAccederRuta } from '@/lib/rbac/permisos';
import { RoleGuardBanner } from '@/components/nexo/RoleGuardBanner';
import { UsuariosAdminTable } from '@/components/admin/UsuariosAdminTable';
import WindowFrame from '@/components/nexo/WindowFrame';

/**
 * Consola de Administración de Usuarios y Gobernanza RBAC (`/admin/usuarios` — CMP-05 / TASK-25).
 *
 * ¿Por qué?: Aplica el confinamiento estricto CA-05.1 y CA-05.2, permitiendo la gestión
 * de usuarios y aprobación de solicitudes públicas tanto a ADMIN como a COORDINADOR
 * (Mesa Común), mientras que bloquea con 403 Forbidden a roles operativos (VOLUNTARIO, DONANTE, RECEPTOR).
 * Diseñado con marco canónico WindowFrame y estética Windows 98 / SCADA.
 */
export default function AdminUsuariosPage() {
  const { sesion } = useSession();

  const rolActual = sesion?.rol || 'VOLUNTARIO';
  const estadoActual = sesion?.estadoCuenta || 'ACTIVO';
  const autorizado = sesion ? puedeAccederRuta(rolActual, '/admin/usuarios', estadoActual) : false;

  return (
    <main className="min-h-screen bg-[#008080] p-2 sm:p-4 font-mono text-xs">
      <div className="max-w-6xl mx-auto">
        <WindowFrame
          title="NEXO ADMINISTRACIÓN — CONSOLA DE GOBERNANZA RBAC (CMP-05)"
          icon={<ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />}
        >
          <div className="flex flex-col gap-3">
            {/* Barra de Herramientas Retro Superior */}
            <div className="bevel-out bg-[#ece9d8] p-2 flex flex-wrap items-center justify-between gap-2 border-2 border-[#808080]">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/"
                  className="btn-98 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 text-black"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Mi Portal ({sesion?.rol || 'Invitado'})</span>
                </Link>

                <Link
                  href="/impacto"
                  className="btn-98 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 text-black"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tablero de Impacto</span>
                </Link>
              </div>

              <div className="text-[11px] font-mono text-slate-700 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>SYS: RBAC-ONLINE • PRIVILEGIO: {rolActual}</span>
              </div>
            </div>

            {/* Contenido protegido por RoleGuardBanner o Consola RBAC */}
            {!autorizado ? (
              <RoleGuardBanner
                rolActual={sesion?.rol || 'SIN CREDENCIAL'}
                moduloRestringido="Consola de Administración de Usuarios y Roles (/admin/usuarios)"
                mensajePersonalizado={
                  !sesion
                    ? 'Debes iniciar sesión con una cuenta de rol ADMIN o COORDINADOR en /login para gestionar usuarios y permisos.'
                    : undefined
                }
              />
            ) : (
              <UsuariosAdminTable
                actorAdmin={{
                  id: sesion!.id || sesion!.userId || '00000000-0000-4000-8000-000000000001',
                  rol: sesion!.rol,
                  estadoCuenta: sesion!.estadoCuenta,
                }}
              />
            )}
          </div>
        </WindowFrame>
      </div>
    </main>
  );
}