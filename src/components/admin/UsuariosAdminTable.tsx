'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Ban,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  History,
  KeyRound,
} from 'lucide-react';
import {
  listarUsuariosCorporativos,
  crearUsuarioCorporativo,
  actualizarRolUsuario,
  cambiarEstadoCuentaUsuario,
  aprobarSolicitudUsuarioAction,
  restablecer2FAUsuarioAction,
  listarEventosAuditoriaRBAC,
  type ActorRbac,
  type EventoAuditoriaRbac,
} from '@/actions/usuarios-admin';
import type { RolUsuario, UsuarioCorporativo } from '@/types';

const ROLES_DISPONIBLES: RolUsuario[] = [
  'ADMIN',
  'COORDINADOR',
  'VOLUNTARIO',
  'DONANTE',
  'RECEPTOR',
];

export interface UsuariosAdminTableProps {
  actorAdmin: ActorRbac;
}

/**
 * Tabla y consola de Gobernanza RBAC para gestión de usuarios, roles y suspensión (`TASK-25` / `CA-05.2`).
 *
 * ¿Por qué?: Permite exclusivamente al rol ADMIN crear cuentas verificadas, modificar privilegios
 * corporativos y suspender/reactivar usuarios con trazabilidad en `rbac_auditoria_eventos`.
 */
export function UsuariosAdminTable({ actorAdmin }: UsuariosAdminTableProps) {
  const [usuarios, setUsuarios] = useState<UsuarioCorporativo[]>([]);
  const [eventosAuditoria, setEventosAuditoria] = useState<EventoAuditoriaRbac[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Estado formulario de creación
  const [mostrarFormCrear, setMostrarFormCrear] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('VOLUNTARIO');
  const [nuevoMotivo, setNuevoMotivo] = useState('Alta administrativa de actor en red Cali');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const [resUsuarios, listaEventos] = await Promise.all([
        listarUsuariosCorporativos(actorAdmin),
        listarEventosAuditoriaRBAC(),
      ]);

      setUsuarios(Array.isArray(resUsuarios) ? resUsuarios : []);
      setEventosAuditoria(listaEventos);
    } catch {
      setErrorMsg('No fue posible consultar el directorio RBAC.');
    } finally {
      setCargando(false);
    }
  }, [actorAdmin]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoEmail.trim()) return;
    setProcesandoId('nuevo');
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      const res = await crearUsuarioCorporativo(actorAdmin, {
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim(),
        rol: nuevoRol,
        estadoCuenta: 'ACTIVO',
        motivo: nuevoMotivo.trim() || 'Alta administrativa RBAC',
      });

      if (res.exito) {
        setExitoMsg(`Usuario ${res.data.nombre} (${res.data.rol}) creado y auditado.`);
        setNuevoNombre('');
        setNuevoEmail('');
        setMostrarFormCrear(false);
        await cargarDatos();
      } else {
        setErrorMsg(res.error);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCambioRol = async (usuarioId: string, nuevoRolSeleccionado: RolUsuario) => {
    setProcesandoId(usuarioId);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      const res = await actualizarRolUsuario(actorAdmin, {
        usuarioId,
        nuevoRol: nuevoRolSeleccionado,
        motivo: `Actualización administrativa de rol a ${nuevoRolSeleccionado}`,
      });

      if (res.exito) {
        setExitoMsg(res.mensaje);
        await cargarDatos();
      } else {
        setErrorMsg(res.error);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleToggleEstado = async (u: UsuarioCorporativo) => {
    const nuevoEstado = u.estadoCuenta === 'SUSPENDIDO' ? 'ACTIVO' : 'SUSPENDIDO';
    setProcesandoId(u.id);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      const res = await cambiarEstadoCuentaUsuario(actorAdmin, {
        usuarioId: u.id,
        nuevoEstado,
        motivo:
          nuevoEstado === 'SUSPENDIDO'
            ? 'Suspensión preventiva de credenciales por gobernanza RBAC'
            : 'Reactivación verificada de cuenta por Administrador',
      });

      if (res.exito) {
        setExitoMsg(res.mensaje);
        await cargarDatos();
      } else {
        setErrorMsg(res.error);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAprobarUsuario = async (u: UsuarioCorporativo) => {
    setProcesandoId(u.id);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      const res = await aprobarSolicitudUsuarioAction(
        actorAdmin,
        u.id,
        'Aprobación verificada de cuenta por Coordinación Operativa Mesa Común'
      );

      if (res.exito) {
        setExitoMsg(`Cuenta de ${u.nombre} (${u.rol}) aprobada exitosamente.`);
        await cargarDatos();
      } else {
        setErrorMsg(res.error);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleReset2FA = async (u: UsuarioCorporativo) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `¿Restablecer Google Authenticator (2FA) para ${u.nombre} (${u.email})?\n\nEl usuario tendrá que escanear un nuevo código QR en su próximo inicio de sesión.`
      )
    ) {
      return;
    }

    setProcesandoId(u.id);
    setErrorMsg(null);
    setExitoMsg(null);

    try {
      const res = await restablecer2FAUsuarioAction(
        actorAdmin.id,
        u.id,
        `Restablecimiento de 2FA solicitado por ${actorAdmin.rol}`
      );

      if (res.exito) {
        setExitoMsg(res.mensaje);
        await cargarDatos();
      } else {
        setErrorMsg(res.error);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-slate-100">
      {/* Barra superior de acciones */}
      <div className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-slate-700/80 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
            EXCLUSIVO ROL ADMIN • CA-05.2
          </span>
          <h2 className="text-lg font-bold text-white mt-1">
            Directorio de Usuarios y Control de Acceso ({usuarios.length} cuentas)
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Toda asignación de rol o suspensión registra un evento inmutable en rbac_auditoria_eventos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-mono text-xs font-bold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
          <button
            type="button"
            onClick={() => setMostrarFormCrear(!mostrarFormCrear)}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-extrabold inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{mostrarFormCrear ? 'Cancelar' : '+ Crear Usuario Corporativo'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-red-950/70 border border-red-500/50 p-3.5 font-mono text-xs text-red-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {exitoMsg && (
        <div
          role="status"
          className="rounded-xl bg-emerald-950/70 border border-emerald-500/50 p-3.5 font-mono text-xs text-emerald-200 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      )}

      {/* Formulario de alta administrativa */}
      {mostrarFormCrear && (
        <form
          onSubmit={handleCrearUsuario}
          className="rounded-2xl backdrop-blur-md bg-slate-900/90 border border-emerald-500/40 p-4 sm:p-5 flex flex-col gap-3 font-mono text-xs"
        >
          <h3 className="text-sm font-bold text-emerald-300 uppercase">
            Registrar Nuevo Actor en la Red
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 mb-1" htmlFor="adm-nombre">
                Nombre completo *
              </label>
              <input
                id="adm-nombre"
                type="text"
                required
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Carlos Gómez"
                className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1" htmlFor="adm-email">
                Correo electrónico *
              </label>
              <input
                id="adm-email"
                type="email"
                required
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                placeholder="carlos@nexo.org"
                className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1" htmlFor="adm-rol">
                Rol asignado *
              </label>
              <select
                id="adm-rol"
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white font-bold"
              >
                {ROLES_DISPONIBLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-300 mb-1" htmlFor="adm-motivo">
              Motivo de auditoría *
            </label>
            <input
              id="adm-motivo"
              type="text"
              required
              value={nuevoMotivo}
              onChange={(e) => setNuevoMotivo(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={procesandoId === 'nuevo'}
              className="min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold"
            >
              {procesandoId === 'nuevo' ? 'Registrando...' : 'Confirmar Alta de Usuario'}
            </button>
          </div>
        </form>
      )}

      {/* Tabla de Usuarios */}
      <div className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-slate-700/80 p-4 sm:p-5 overflow-x-auto">
        {usuarios.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-400">
            No hay otros usuarios registrados aún. Usa el botón &quot;+ Crear Usuario Corporativo&quot; o registra actores desde <code>/login</code>.
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 uppercase text-[11px]">
                <th className="py-2 px-3">Usuario</th>
                <th className="py-2 px-3">Correo</th>
                <th className="py-2 px-3">Rol Corporativo</th>
                <th className="py-2 px-3">Estado de Cuenta</th>
                <th className="py-2 px-3">2FA (TOTP)</th>
                <th className="py-2 px-3 text-right">Acciones de Gobernanza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {usuarios.map((u) => {
                const esSuspendido = u.estadoCuenta === 'SUSPENDIDO';
                const esPendiente = u.estadoCuenta === 'PENDIENTE_AUTORIZACION';
                const esMismoActor = u.id === actorAdmin.id;
                const puedeEditarRol = actorAdmin.rol === 'ADMIN';
                const puedeReset2FA = actorAdmin.rol === 'ADMIN' || actorAdmin.rol === 'COORDINADOR';

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-bold text-white">{u.nombre}</td>
                    <td className="py-3 px-3 text-slate-300">{u.email}</td>
                    <td className="py-3 px-3">
                      {puedeEditarRol ? (
                        <select
                          aria-label={`Cambiar rol de ${u.nombre}`}
                          value={u.rol}
                          disabled={procesandoId === u.id}
                          onChange={(e) =>
                            handleCambioRol(u.id, e.target.value as RolUsuario)
                          }
                          className="rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-emerald-300"
                        >
                          {ROLES_DISPONIBLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-mono text-xs font-bold text-emerald-300 px-2 py-1 rounded bg-slate-950 border border-slate-800">
                          {u.rol}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          esPendiente
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : esSuspendido
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {u.estadoCuenta}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {u.totpConfigurado ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-sky-400" />
                          <span>2FA Activo</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span>2FA Pendiente</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {esPendiente ? (
                          <button
                            type="button"
                            disabled={procesandoId === u.id}
                            onClick={() => handleAprobarUsuario(u)}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono shadow-md disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprobar Solicitud</span>
                          </button>
                        ) : actorAdmin.rol === 'ADMIN' ? (
                          <button
                            type="button"
                            disabled={procesandoId === u.id || (esMismoActor && !esSuspendido)}
                            onClick={() => handleToggleEstado(u)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 disabled:opacity-40 ${
                              esSuspendido
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                            }`}
                          >
                            {esSuspendido ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Reactivar</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span>Suspender</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Activo</span>
                        )}

                        {u.totpConfigurado && puedeReset2FA && (
                          <button
                            type="button"
                            disabled={procesandoId === u.id}
                            onClick={() => handleReset2FA(u)}
                            title="Restablecer 2FA (por extravío de celular)"
                            className="min-h-[38px] px-2.5 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono disabled:opacity-40"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Reset 2FA</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bitácora de Auditoría RBAC */}
      <div className="rounded-2xl backdrop-blur-md bg-slate-900/85 border border-slate-700/80 p-4 sm:p-5">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-2">
          <History className="w-4 h-4" />
          <span>Bitácora Inmutable rbac_auditoria_eventos ({eventosAuditoria.length})</span>
        </h3>
        {eventosAuditoria.length === 0 ? (
          <p className="font-mono text-xs text-slate-400">
            No se han registrado mutaciones administrativas en esta sesión.
          </p>
        ) : (
          <ul className="space-y-1.5 font-mono text-xs max-h-56 overflow-y-auto">
            {eventosAuditoria.map((ev) => (
              <li
                key={ev.id}
                className="bg-slate-950/70 border border-slate-800 px-3 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <span className="text-emerald-400 font-bold">{ev.accion}</span>
                  <span className="text-slate-300 ml-2">{ev.motivo}</span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  {new Date(ev.timestamp).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default UsuariosAdminTable;
