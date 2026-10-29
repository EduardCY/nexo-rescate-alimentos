'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  ArrowLeft,
  FileCheck,
  ShieldAlert,
  User,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import type { Donacion } from '@/types';
import { obtenerDonacionParaEntrega, confirmarEntrega } from '@/actions/entregas';
import type { EstadoFisicoAlimento } from '@/lib/validations/entrega';

/**
 * Vista móvil de confirmación de entrega física en comedor comunitario (TASK-11 / CMP-04).
 * Cierra formalmente el ciclo de custodia con acta digital y registro inmutable de trazabilidad.
 */
export default function ConfirmarEntregaPage() {
  const params = useParams();
  const donacionId = (params?.id as string) || '';

  const [donacion, setDonacion] = useState<Donacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Campos del formulario
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [estadoFisico, setEstadoFisico] = useState<EstadoFisicoAlimento>('BUENO');
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [entregaCompletada, setEntregaCompletada] = useState<{
    entregadaAt: string;
    receptorNombre: string;
  } | null>(null);

  useEffect(() => {
    if (!donacionId) return;

    const cargar = async () => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const d = await obtenerDonacionParaEntrega(donacionId);
        if (!d) {
          setErrorCarga('La donación especificada no fue encontrada.');
        } else {
          setDonacion(d);
          if (d.estado === 'ENTREGADA' && d.entregadaAt) {
            setEntregaCompletada({
              entregadaAt: d.entregadaAt,
              receptorNombre: 'Receptor registrado',
            });
          }
        }
      } catch {
        setErrorCarga('Error al cargar la información del lote.');
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [donacionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donacion || procesando) return;

    if (nombreReceptor.trim().length < 3) {
      setErrorEnvio('El nombre de quien recibe en el comedor debe tener al menos 3 caracteres.');
      return;
    }

    setProcesando(true);
    setErrorEnvio(null);

    try {
      const res = await confirmarEntrega({
        donacionId: donacion.id,
        nombreReceptor: nombreReceptor.trim(),
        estadoFisico,
        observaciones: observaciones.trim(),
        voluntarioId: donacion.voluntarioId || 'vol-001',
        voluntarioNombre: donacion.voluntarioNombre || 'Voluntario',
      });

      if (res.exito) {
        setEntregaCompletada({
          entregadaAt: res.entregadaAt,
          receptorNombre: res.receptorNombre,
        });
        setDonacion((prev) => (prev ? { ...prev, estado: 'ENTREGADA', entregadaAt: res.entregadaAt } : null));
      } else {
        setErrorEnvio(res.mensaje);
      }
    } catch (err: unknown) {
      setErrorEnvio(err instanceof Error ? err.message : 'Error al registrar la entrega.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <main className="min-h-screen p-2 sm:p-4 bg-[#0b1020] text-black">
      <div className="bevel-out mx-auto max-w-xl p-[3px] bg-[#d4d0c8] shadow-[8px_8px_0_rgba(0,0,0,0.55)]">
        {/* Barra de título Windows 98 */}
        <header className="titlebar flex items-center justify-between gap-2 px-2 py-1 text-white">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileCheck className="w-4 h-4 text-white shrink-0" />
            <h1 className="truncate font-mono text-xs sm:text-[13px] font-bold tracking-wide">
              ACTA DIGITAL DE ENTREGA EN COMEDOR
            </h1>
          </div>
          <Link
            href="/donaciones"
            className="btn-98 !py-0.5 !px-2 text-[11px] font-mono flex items-center gap-1 shrink-0"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Volver</span>
          </Link>
        </header>

        {/* Contenido principal */}
        <div className="p-3 sm:p-4 font-mono text-xs flex flex-col gap-3">
          {cargando ? (
            <div className="bevel-in bg-white p-6 text-center text-slate-700">
              <p className="animate-pulse">Consultando estado del lote en la red...</p>
            </div>
          ) : errorCarga ? (
            <div className="bevel-in bg-red-100 border border-red-600 p-4 text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-700" />
              <span>{errorCarga}</span>
            </div>
          ) : !donacion ? null : (
            <>
              {/* Resumen del Lote */}
              <section className="bevel-out p-3 bg-[#ece9d8]">
                <div className="flex items-center justify-between border-b border-[#808080] pb-1.5 mb-2">
                  <span className="font-bold bg-[#000080] text-white px-2 py-0.5 bevel-in">
                    {donacion.codigo}
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 bevel-in ${
                      donacion.estado === 'ENTREGADA'
                        ? 'bg-green-100 text-green-900'
                        : donacion.estado === 'ASIGNADA'
                        ? 'bg-blue-100 text-[#000080]'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    ESTADO: {donacion.estado}
                  </span>
                </div>

                <h2 className="text-sm font-bold text-[#000080] mb-1">
                  {donacion.tipoAlimento}
                </h2>
                <p className="text-slate-800 font-extrabold text-base mb-2">
                  {donacion.cantidadEstimada} {donacion.unidadMedida}
                </p>

                <div className="flex flex-col gap-1 text-[11px] text-slate-700 border-t border-[#808080] pt-2">
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#000080] shrink-0 mt-0.5" />
                    <span><b>Origen:</b> {donacion.donanteNombre} ({donacion.direccionRecogida})</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <User className="w-3.5 h-3.5 text-green-700 shrink-0 mt-0.5" />
                    <span><b>Voluntario asignado:</b> {donacion.voluntarioNombre || 'Voluntario'}</span>
                  </div>
                  {donacion.comedorNombre && (
                    <div className="flex items-start gap-1">
                      <ClipboardList className="w-3.5 h-3.5 text-purple-700 shrink-0 mt-0.5" />
                      <span><b>Comedor destino:</b> {donacion.comedorNombre}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* CA-04.2: Bloqueo si la donación no fue tomada previamente (estado DISPONIBLE) */}
              {donacion.estado === 'DISPONIBLE' && (
                <div className="bevel-in bg-[#ffffe1] border-2 border-amber-700 p-4 text-amber-950 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700" />
                    <span>ENTREGA BLOQUEADA</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-800">
                    Esta oferta se encuentra en estado <b>DISPONIBLE</b> y aún no ha sido tomada ni asignada a ningún voluntario.
                    Para entregarla en un comedor comunitario, primero debes reservarla desde el catálogo.
                  </p>
                  <Link
                    href="/donaciones"
                    className="btn-98 min-h-[44px] mt-2 font-bold flex items-center justify-center gap-1.5 text-[#000080]"
                  >
                    <span>Ir al Catálogo de Donaciones &gt;</span>
                  </Link>
                </div>
              )}

              {/* CA-04.1: Acta Digital Cerrada si ya fue entregada */}
              {entregaCompletada && (
                <div className="bevel-in bg-[#f0fdf4] border-2 border-green-700 p-4 text-green-950 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-green-900">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-green-700" />
                    <span>ACTA DIGITAL DE ENTREGA CERRADA FORMALMENTE</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-800">
                    El ciclo de custodia de este lote ha concluido formalmente. Los alimentos fueron recibidos en el comedor y la auditoría inmutable ha sido registrada.
                  </p>
                  <div className="bevel-out bg-white p-2.5 flex flex-col gap-1 text-[11px] text-slate-900">
                    <p><b>Receptor en comedor:</b> {entregaCompletada.receptorNombre}</p>
                    <p><b>Marca temporal UTC:</b> {new Date(entregaCompletada.entregadaAt).toUTCString()}</p>
                    <p><b>Código de custodia:</b> {donacion.codigo}-AUDIT</p>
                  </div>
                  <Link
                    href="/donaciones"
                    className="btn-green min-h-[48px] font-bold flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Volver al Catálogo de Ofertas</span>
                  </Link>
                </div>
              )}

              {/* Formulario de Confirmación (Solo activo si estado === 'ASIGNADA') */}
              {donacion.estado === 'ASIGNADA' && !entregaCompletada && (
                <form onSubmit={handleSubmit} className="bevel-out p-3.5 bg-white flex flex-col gap-3">
                  <div className="titlebar px-2 py-1 text-white font-bold flex items-center gap-1.5">
                    <span>REGISTRO DE RECEPCIÓN FÍSICA EN COMEDOR</span>
                  </div>

                  {errorEnvio && (
                    <div className="bevel-in bg-red-100 border border-red-600 p-2 text-red-900 flex items-center gap-1.5 text-[11px]">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
                      <span>{errorEnvio}</span>
                    </div>
                  )}

                  {/* Campo Obligatorio: Nombre del Receptor */}
                  <div>
                    <label className="retro-label" htmlFor="nombre-receptor">
                      Nombre completo de quien recibe en el comedor *
                    </label>
                    <input
                      id="nombre-receptor"
                      type="text"
                      className="retro-field min-h-[48px] font-bold text-sm"
                      placeholder="Ej. Marta Cecilia Pérez (Coordinadora de Cocina)"
                      value={nombreReceptor}
                      onChange={(e) => setNombreReceptor(e.target.value)}
                      required
                    />
                    <span className="text-[10px] text-slate-500">
                      Mínimo 3 caracteres. Persona autorizada del comedor o fundación receptora.
                    </span>
                  </div>

                  {/* Estado Físico del Lote al momento de entrega */}
                  <div>
                    <label className="retro-label">
                      Estado físico del lote al momento de entrega *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['EXCELENTE', 'BUENO', 'REGULAR'] as EstadoFisicoAlimento[]).map((est) => {
                        const activo = estadoFisico === est;
                        return (
                          <button
                            key={est}
                            type="button"
                            onClick={() => setEstadoFisico(est)}
                            className={`min-h-[44px] font-mono text-xs font-bold ${
                              activo ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
                            }`}
                          >
                            {est}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Observaciones de Llegada */}
                  <div>
                    <label className="retro-label" htmlFor="observaciones">
                      Observaciones de llegada / condiciones físicas (opcional)
                    </label>
                    <textarea
                      id="observaciones"
                      rows={3}
                      className="retro-field text-xs resize-none"
                      placeholder="Ej. Alimentos recibidos a temperatura adecuada, canastillas limpias y pesaje conforme."
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>

                  {/* Botón de Confirmación Principal */}
                  <div className="pt-2 border-t border-[#808080]">
                    <button
                      type="submit"
                      disabled={procesando || nombreReceptor.trim().length < 3}
                      className="btn-green w-full min-h-[48px] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {procesando ? (
                        <span>REGISTRANDO ACTA DE ENTREGA...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>CONFIRMAR ENTREGA FÍSICA Y FIRMAR ACTA</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Barra inferior */}
        <footer className="flex items-center justify-between gap-1 p-1 text-[11px] text-black font-mono bg-[#d4d0c8] border-t border-[#808080]">
          <div className="bevel-in flex-1 px-2 py-0.5 truncate">
            Cierre de Custodia • Red de Rescate de Alimentos Cali
          </div>
          <div className="bevel-in px-2 py-0.5 hidden sm:block">
            Ley 1990 de 2019
          </div>
        </footer>
      </div>
    </main>
  );
}