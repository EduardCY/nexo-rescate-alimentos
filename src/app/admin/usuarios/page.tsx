'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, BarChart3 } from 'lucide-react';
import { useSession } from '@/lib/auth/session-context';
import { puedeAccederRuta } from '@/lib/rbac/permisos';
import { RoleGuardBanner } from '@/components/nexo/RoleGuardBanner';
import { UsuariosAdminTable } from '@/components/admin/UsuariosAdminTable';

/**
 * Consola de Administración de Usuarios y Gobernanza RBAC (`/admin/usuarios` — CMP-05 / TASK-25).
 *
 * ¿Por qué?: Aplica el confinamiento estricto CA-05.1 y CA-05.2, permitiendo la gestión
 * de usuarios y aprobación de solicitudes públicas tanto a ADMIN como a COORDINADOR
 * (Mesa Común), mientras que bloquea con 403 Forbidden a roles operativos (VOLUNTARIO, DONANTE, RECEPTOR).
 */
export default function AdminUsuariosPage() {
  const { sesion } = useSession();

  const rolActual = sesion?.rol || 'VOLUNTARIO';
  const estadoActual = sesion?.estadoCuenta || 'ACTIVO';
  const autorizado = sesion ? puedeAccederRuta(rolActual, '/admin/usuarios', estadoActual) : false;

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
                <ShieldCheck className="w-5 h-5 text-red-400" aria-hidden="true" />
                <span>Consola de Gobernanza RBAC y Administración de Usuarios</span>
              </h1>
              <p className="text-xs font-mono text-slate-400">
                Control de roles, altas verificadas y suspensión de cuentas • RNF-003 / CMP-05
              </p>
            </div>
          </div>

          <Link
            href="/impacto"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-mono text-xs font-bold text-emerald-300 flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ver Tablero de Impacto</span>
          </Link>
        </header>

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
    </main>
  );
}
