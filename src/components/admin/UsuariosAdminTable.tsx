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
 * Estilizado bajo la identidad canónica retro Windows 98 / SCADA con bevels y controles rígidos.
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
    <div className="flex flex-col gap-4 text-black">
      {/* Barra superior de acciones Win98 */}
      <div className="bevel-out bg-[#ece9d8] p-3 flex flex-wrap items-center justify-between gap-3 border-2 border-[#808080]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-800 border border-red-500">
              [EXCLUSIVO ADMINISTRACIÓN]
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-700">
              AUDITORÍA ACTIVA
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-black flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-red-700" aria-hidden="true" />
            <span>Directorio de Usuarios y Control de Acceso ({usuarios.length} cuentas)</span>
          </h2>
          <p className="text-[11px] font-mono text-slate-700">
            Toda asignación de rol o suspensión registra un evento inmutable en rbac_auditoria_eventos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            className="btn-98 px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
          <button
            type="button"
            onClick={() => setMostrarFormCrear(!mostrarFormCrear)}
            className="btn-green px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{mostrarFormCrear ? 'Cancelar' : '+ Crear Usuario Corporativo'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="bevel-in bg-red-50 border-2 border-red-700 p-2.5 font-mono text-xs text-red-900 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {exitoMsg && (
        <div
          role="status"
          className="bevel-in bg-emerald-50 border-2 border-emerald-700 p-2.5 font-mono text-xs text-emerald-900 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{exitoMsg}</span>
        </div>
      )}

      {/* Formulario de alta administrativa modal Win98 */}
      {mostrarFormCrear && (
        <form
          onSubmit={handleCrearUsuario}
          className="bevel-out bg-[#ece9d8] p-3 border-2 border-[#808080] flex flex-col gap-3 font-mono text-xs"
        >
          <div className="bg-gradient-to-r from-[#000080] to-[#1c4a9e] text-white px-2 py-1 font-bold flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>ALTA DE USUARIO CORPORATIVO — GOBERNANZA RBAC</span>
            </span>
            <span className="text-[10px] text-blue-200">[NEXO-ADMIN-USR]</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-black font-bold mb-1" htmlFor="adm-nombre">
                Nombre completo *
              </label>
              <input
                id="adm-nombre"
                type="text"
                required
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Carlos Gómez"
                className="retro-field bg-white text-black font-mono text-xs w-full px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-black font-bold mb-1" htmlFor="adm-email">
                Correo corporativo *
              </label>
              <input
                id="adm-email"
                type="email"
                required
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                placeholder="carlos@nexo.org"
                className="retro-field bg-white text-black font-mono text-xs w-full px-2 py-1.5"
              />
            </div>
            <div>
              <label className="block text-black font-bold mb-1" htmlFor="adm-rol">
                Rol asignado *
              </label>
              <select
                id="adm-rol"
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
                className="retro-field bg-white text-black font-mono text-xs font-bold w-full px-2 py-1.5"
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
            <label className="block text-black font-bold mb-1" htmlFor="adm-motivo">
              Motivo de auditoría *
            </label>
            <input
              id="adm-motivo"
              type="text"
              required
              value={nuevoMotivo}
              onChange={(e) => setNuevoMotivo(e.target.value)}
              className="retro-field bg-white text-black font-mono text-xs w-full px-2 py-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-[#808080]">
            <button
              type="button"
              onClick={() => setMostrarFormCrear(false)}
              className="btn-98 px-3 py-1 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesandoId === 'nuevo'}
              className="btn-green px-4 py-1 text-xs font-bold"
            >
              {procesandoId === 'nuevo' ? 'Registrando...' : 'Confirmar Alta de Usuario'}
            </button>
          </div>
        </form>
      )}

      {/* Tabla de Usuarios Retro Data Grid */}
      <div className="bevel-out bg-[#ece9d8] p-3 border-2 border-[#808080] overflow-x-auto">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#808080]">
          <span className="font-mono text-xs font-bold uppercase text-black">
            REGISTRO DE USUARIOS RBAC ({usuarios.length})
          </span>
          <span className="font-mono text-[11px] text-slate-700">
            Base de Datos: PostgreSQL / Supabase
          </span>
        </div>

        {usuarios.length === 0 ? (
          <div className="p-6 text-center font-mono text-xs text-slate-600 bevel-in bg-white">
            No hay otros usuarios registrados aún. Usa el botón &quot;+ Crear Usuario Corporativo&quot; o registra actores desde <code>/login</code>.
          </div>
        ) : (
          <div className="bevel-in bg-white overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-[#d4d0c8] text-black uppercase text-[11px] border-b-2 border-[#808080]">
                  <th className="py-2 px-3 border-r border-[#808080]">Usuario</th>
                  <th className="py-2 px-3 border-r border-[#808080]">Correo Electrónico</th>
                  <th className="py-2 px-3 border-r border-[#808080]">Rol Corporativo</th>
                  <th className="py-2 px-3 border-r border-[#808080]">Estado de Cuenta</th>
                  <th className="py-2 px-3 border-r border-[#808080]">2FA (TOTP)</th>
                  <th className="py-2 px-3 text-right">Acciones de Gobernanza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4d0c8]">
                {usuarios.map((u) => {
                  const esSuspendido = u.estadoCuenta === 'SUSPENDIDO';
                  const esPendiente = u.estadoCuenta === 'PENDIENTE_AUTORIZACION';
                  const esMismoActor = u.id === actorAdmin.id;
                  const puedeEditarRol = actorAdmin.rol === 'ADMIN';
                  const puedeReset2FA = actorAdmin.rol === 'ADMIN' || actorAdmin.rol === 'COORDINADOR';

                  return (
                    <tr key={u.id} className="hover:bg-[#fff9d9] text-black">
                      <td className="py-2 px-3 font-bold border-r border-[#d4d0c8]">{u.nombre}</td>
                      <td className="py-2 px-3 text-slate-700 border-r border-[#d4d0c8]">{u.email}</td>
                      <td className="py-2 px-3 border-r border-[#d4d0c8]">
                        {puedeEditarRol ? (
                          <select
                            aria-label={`Cambiar rol de ${u.nombre}`}
                            value={u.rol}
                            disabled={procesandoId === u.id}
                            onChange={(e) =>
                              handleCambioRol(u.id, e.target.value as RolUsuario)
                            }
                            className="retro-field bg-white text-black text-xs font-bold px-2 py-0.5"
                          >
                            {ROLES_DISPONIBLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-mono text-xs font-bold bg-[#ece9d8] border border-[#808080] px-2 py-0.5">
                            {u.rol}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-[#d4d0c8]">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold border ${
                            esPendiente
                              ? 'bg-amber-100 text-amber-900 border-amber-600'
                              : esSuspendido
                              ? 'bg-red-100 text-red-900 border-red-600'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-600'
                          }`}
                        >
                          [{u.estadoCuenta}]
                        </span>
                      </td>
                      <td className="py-2 px-3 border-r border-[#d4d0c8]">
                        {u.totpConfigurado ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-600 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-blue-700" />
                            <span>2FA Activo</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-600 inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-amber-700" />
                            <span>2FA Pendiente</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {esPendiente ? (
                            <button
                              type="button"
                              disabled={procesandoId === u.id}
                              onClick={() => handleAprobarUsuario(u)}
                              className="btn-green text-xs font-bold px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-40"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aprobar</span>
                            </button>
                          ) : actorAdmin.rol === 'ADMIN' ? (
                            <button
                              type="button"
                              disabled={procesandoId === u.id || (esMismoActor && !esSuspendido)}
                              onClick={() => handleToggleEstado(u)}
                              className={`btn-98 text-xs font-bold px-2.5 py-1 inline-flex items-center gap-1 disabled:opacity-40 ${
                                esSuspendido
                                  ? 'text-emerald-800 hover:text-emerald-900'
                                  : 'text-red-700 hover:text-red-900'
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
                              className="btn-98 text-xs font-bold px-2 py-1 inline-flex items-center gap-1 text-amber-900 hover:text-amber-950 disabled:opacity-40"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Restablecer 2FA</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bitácora de Auditoría RBAC como Terminal SCADA */}
      <div className="bevel-out bg-[#ece9d8] p-3 border-2 border-[#808080]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-800" />
            <span>BITÁCORA INMUTABLE RBAC_AUDITORIA_EVENTOS ({eventosAuditoria.length})</span>
          </h3>
          <span className="font-mono text-[10px] text-slate-600">[MODO DIAGNÓSTICO]</span>
        </div>

        <div className="scada-panel bg-[#070c18] border border-slate-700 p-2.5 max-h-52 overflow-y-auto font-mono text-xs text-slate-300">
          {eventosAuditoria.length === 0 ? (
            <p className="font-mono text-xs text-slate-500 italic">
              No se han registrado mutaciones administrativas en esta sesión.
            </p>
          ) : (
            <ul className="space-y-1">
              {eventosAuditoria.map((ev) => (
                <li
                  key={ev.id}
                  className="border-b border-slate-800/80 pb-1 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">[{ev.accion}]</span>
                    <span className="text-slate-200">{ev.motivo}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">
                    {new Date(ev.timestamp).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default UsuariosAdminTable;