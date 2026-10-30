'use client';

import React, { useState } from 'react';
import {
  Snowflake,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Apple,
  Croissant,
  Milk,
  Utensils,
  Wheat,
} from 'lucide-react';
import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { publicarDonacion } from '@/actions/donaciones';
import { normalizarFechaHoraLimite } from '@/lib/utils/donaciones-helper';
import { guardarDonacionOffline } from '@/lib/db';
import { calcImpact, fmt, fmtCop, urgencyOf, type CategoryId } from '@/lib/nexo/impact';
import LotCard from '@/components/nexo/LotCard';

const CATEGORIAS_RAPIDAS: {
  id: CategoryId;
  label: string;
  valor: string;
  icono: React.ReactNode;
}[] = [
  { id: 'fruta', label: 'Frutas y Verduras', valor: 'Fruta & Verdura Fresca', icono: <Apple className="w-4 h-4" /> },
  { id: 'panaderia', label: 'Panadería', valor: 'Panadería & Bollería', icono: <Croissant className="w-4 h-4" /> },
  { id: 'lacteos', label: 'Lácteos', valor: 'Lácteos & Derivados', icono: <Milk className="w-4 h-4" /> },
  { id: 'viandas', label: 'Comida Preparada', valor: 'Viandas & Comida Preparada', icono: <Utensils className="w-4 h-4" /> },
  { id: 'granos', label: 'Granos y Abarrotes', valor: 'Granos & Abarrotes', icono: <Wheat className="w-4 h-4" /> },
];

/**
 * Wizard Mobile-First en 3 pasos para el registro rápido de donaciones.
 * Conserva la identidad visual retro Windows 98 / SCADA con controles táctiles amigables.
 */
export function DonacionWizard({ onCompleted }: { onCompleted?: (codigo: string, isOffline: boolean) => void }) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ codigo: string; offline: boolean } | null>(null);

  // Estado Paso 1: Alimento, Cantidad, Unidad y Refrigeración
  const [catId, setCatId] = useState<CategoryId>('fruta');
  const [tipoAlimento, setTipoAlimento] = useState('Fruta & Verdura Fresca');
  const [cantidadEstimada, setCantidadEstimada] = useState('45');
  const [unidadMedida, setUnidadMedida] = useState<'kg' | 'canastillas' | 'bultos' | 'unidades'>('kg');
  const [requiereFrio, setRequiereFrio] = useState(false);

  // Estado Paso 2: Dirección y Hora Límite
  const [donanteNombre, setDonanteNombre] = useState('Puesto 45 Galería Santa Elena');
  const [direccionRecogida, setDireccionRecogida] = useState('Plaza Santa Elena - Puesto 45');
  const calcularHoraMas = (horasExtra: number) => {
    const d = new Date(Date.now() + horasExtra * 3600 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [horaLimite, setHoraLimite] = useState(() => calcularHoraMas(4));

  // Estado Paso 3: Exención Sanitaria Ley 1990/2019
  const [exencionAceptada, setExencionAceptada] = useState(false);

  // Validación reactiva de hora futura
  const validarHoraFutura = (val: string): { esValida: boolean; esManana: boolean } => {
    const match = val.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    if (!match) return { esValida: false, esManana: false };
    const now = new Date();
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const targetHoy = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );
    if (targetHoy.getTime() > now.getTime()) {
      return { esValida: true, esManana: false };
    }
    const targetManana = new Date(targetHoy.getTime() + 24 * 3600 * 1000);
    return { esValida: targetManana.getTime() > now.getTime(), esManana: true };
  };

  const cantidadNum = parseFloat(cantidadEstimada) || 0;
  const estHora = validarHoraFutura(horaLimite);
  const horaEsFutura = estHora.esValida;
  const impacto = calcImpact(cantidadNum > 0 ? cantidadNum : 0, catId);
  const urgencia = urgencyOf(4);

  const paso1Valido = tipoAlimento.trim().length >= 3 && cantidadNum > 0;
  const paso2Valido = direccionRecogida.trim().length >= 5 && horaEsFutura;
  const paso3Valido = exencionAceptada === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paso3Valido || cargando) return;
    setCargando(true);
    setErrorMsg(null);

    try {
      const horaIsoSegura = normalizarFechaHoraLimite(horaLimite);

      const payload: DonacionInput = {
        tipoAlimento: tipoAlimento.trim(),
        cantidadEstimada: cantidadNum,
        unidadMedida,
        direccionRecogida: direccionRecogida.trim(),
        horaLimite: horaIsoSegura,
        requiereFrio,
        exencionSanitariaAceptada: true,
        donanteNombre: donanteNombre.trim() || 'Comercio Donante',
      };

      const validacion = DonacionInputSchema.safeParse(payload);
      if (!validacion.success) {
        const issues =
          validacion.error.issues ||
          (validacion.error as unknown as { errors?: Array<{ message: string }> }).errors ||
          [];
        setErrorMsg(issues.map((i) => i.message).join('. '));
        setCargando(false);
        return;
      }

      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (online) {
        const res = await publicarDonacion(validacion.data);
        if (res.exito) {
          setConfirmacion({ codigo: res.codigo, offline: false });
          onCompleted?.(res.codigo, false);
        } else {
          // Respaldo Offline-First en Dexie si la red cae durante el envío
          const localId = await guardarDonacionOffline(validacion.data);
          const codigoTemp = `OFFLINE-DON-${localId}`;
          setConfirmacion({ codigo: codigoTemp, offline: true });
          onCompleted?.(codigoTemp, true);
        }
      } else {
        // Guardado local inmediato en IndexedDB
        const localId = await guardarDonacionOffline(validacion.data);
        const codigoTemp = `OFFLINE-DON-${localId}`;
        setConfirmacion({ codigo: codigoTemp, offline: true });
        onCompleted?.(codigoTemp, true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar la donación');
    } finally {
      setCargando(false);
    }
  };

  const reiniciarWizard = () => {
    setPaso(1);
    setConfirmacion(null);
    setErrorMsg(null);
    setExencionAceptada(false);
  };

  if (confirmacion) {
    return (
      <div className="bevel-out p-4 text-black font-mono max-w-xl mx-auto">
        <div className="titlebar px-2.5 py-1.5 text-white font-bold text-xs flex items-center justify-between mb-4">
          <span>CONFIRMACIÓN DE REGISTRO</span>
          <span>[OK]</span>
        </div>

        <div className="bevel-in bg-[#ffffe1] p-4 mb-4">
          <div className="flex items-center gap-2 text-green-800 font-bold text-sm mb-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              {confirmacion.offline
                ? 'Guardado localmente — pendiente de sincronización'
                : '¡Donación publicada exitosamente en la red!'}
            </span>
          </div>

          <p className="text-xs text-slate-800 mb-3">
            Código asignado:{' '}
            <strong className="bg-white px-2 py-0.5 bevel-in text-sm">{confirmacion.codigo}</strong>
          </p>

          <p className="text-[11px] text-slate-700 leading-relaxed">
            {confirmacion.offline
              ? 'Tu donación quedó guardada de forma segura en tu teléfono y se enviará automáticamente cuando recuperes la señal de internet.'
              : 'Los comedores comunitarios y voluntarios cercanos ya pueden visualizar y tomar esta donación.'}
          </p>
        </div>

        <button
          type="button"
          onClick={reiniciarWizard}
          className="btn-green w-full min-h-[48px] text-sm font-bold"
        >
          + PUBLICAR OTRA DONACIÓN
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Panel Izquierdo: Wizard en 3 Pasos con estética Windows 98 */}
      <div className="lg:col-span-7 bevel-out p-3 sm:p-4 text-black">
        <div className="titlebar px-2.5 py-1.5 text-white font-mono text-xs font-bold flex items-center justify-between mb-3">
          <span>PUBLICAR DONACIÓN — PASO {paso} DE 3</span>
          <span className="bg-white/20 px-1.5 py-0.5 text-[10px]">Registro rápido</span>
        </div>

        {/* Indicador de Pasos Estilo Pestañas Windows 98 */}
        <div className="grid grid-cols-3 gap-1 mb-4 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setPaso(1)}
            className={`min-h-[48px] px-2 py-1 font-bold text-left ${
              paso === 1 ? 'bevel-in bg-white text-[#000080]' : 'bevel-out text-slate-700'
            }`}
          >
            1. Alimentos
          </button>
          <button
            type="button"
            onClick={() => paso1Valido && setPaso(2)}
            disabled={!paso1Valido}
            className={`min-h-[48px] px-2 py-1 font-bold text-left ${
              paso === 2 ? 'bevel-in bg-white text-[#000080]' : 'bevel-out text-slate-700 disabled:opacity-50'
            }`}
          >
            2. Recogida
          </button>
          <button
            type="button"
            onClick={() => paso1Valido && paso2Valido && setPaso(3)}
            disabled={!paso1Valido || !paso2Valido}
            className={`min-h-[48px] px-2 py-1 font-bold text-left ${
              paso === 3 ? 'bevel-in bg-white text-[#000080]' : 'bevel-out text-slate-700 disabled:opacity-50'
            }`}
          >
            3. Confirmación
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 bevel-in bg-red-100 border border-red-600 p-2.5 text-red-900 font-mono text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* PASO 1: ALIMENTOS, CANTIDAD Y REFRIGERACIÓN */}
          {paso === 1 && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="retro-label">Categoría rápida (1 toque) *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                  {CATEGORIAS_RAPIDAS.map((c) => {
                    const activo = tipoAlimento === c.valor;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCatId(c.id);
                          setTipoAlimento(c.valor);
                        }}
                        className={`min-h-[48px] px-3 py-2 font-mono text-xs font-bold flex items-center gap-2 text-left ${
                          activo
                            ? 'bg-[#000080] text-white bevel-in'
                            : 'btn-98 justify-start text-black'
                        }`}
                      >
                        {c.icono}
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
                <label className="retro-label" htmlFor="wiz-alimento">
                  Descripción del alimento *
                </label>
                <input
                  id="wiz-alimento"
                  type="text"
                  className="retro-field min-h-[48px]"
                  value={tipoAlimento}
                  onChange={(e) => setTipoAlimento(e.target.value)}
                  placeholder="Ej. Tomate chonto, Plátano maduro, Pan del día"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="retro-label" htmlFor="wiz-cantidad">
                    Cantidad estimada *
                  </label>
                  <input
                    id="wiz-cantidad"
                    type="number"
                    min="0.1"
                    step="any"
                    className="retro-field min-h-[48px] font-bold text-base"
                    value={cantidadEstimada}
                    onChange={(e) => setCantidadEstimada(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="retro-label" htmlFor="wiz-unidad">
                    Unidad de medida *
                  </label>
                  <select
                    id="wiz-unidad"
                    className="retro-field min-h-[48px] font-bold cursor-pointer"
                    value={unidadMedida}
                    onChange={(e) =>
                      setUnidadMedida(e.target.value as 'kg' | 'canastillas' | 'bultos' | 'unidades')
                    }
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="canastillas">Canastillas</option>
                    <option value="bultos">Bultos</option>
                    <option value="unidades">Unidades</option>
                  </select>
                </div>
              </div>

              {/* Switch Visual Destacado para Requiere Refrigeración */}
              <div className="bevel-in bg-[#e8f4fd] p-3 border border-sky-700">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 bg-[#0284c7] text-white flex items-center justify-center bevel-out shrink-0">
                      <Snowflake className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-extrabold text-[#000080]">
                        ¿REQUIERE REFRIGERACIÓN?
                      </p>
                      <p className="font-mono text-[11px] text-slate-700">
                        Activar para lácteos, carnes o alimentos que exigen cadena de frío (4°C - 8°C).
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={requiereFrio}
                    onClick={() => setRequiereFrio(!requiereFrio)}
                    className={`min-h-[48px] min-w-[96px] px-3 font-mono text-xs font-extrabold ${
                      requiereFrio ? 'btn-blue' : 'btn-98'
                    }`}
                  >
                    {requiereFrio ? '✓ SÍ (FRÍO)' : 'NO (AMB.)'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  disabled={!paso1Valido}
                  className="btn-green min-h-[48px] px-6 text-xs sm:text-sm w-full sm:w-auto gap-2"
                >
                  <span>SIGUIENTE: RECOGIDA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: DIRECCIÓN DE RECOGIDA Y HORA LÍMITE */}
          {paso === 2 && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="retro-label" htmlFor="wiz-donante">
                  Nombre del puesto o comercio donante
                </label>
                <input
                  id="wiz-donante"
                  type="text"
                  className="retro-field min-h-[48px]"
                  value={donanteNombre}
                  onChange={(e) => setDonanteNombre(e.target.value)}
                  placeholder="Ej. Puesto 45 Doña Rosa"
                />
              </div>

              <div>
                <label className="retro-label" htmlFor="wiz-direccion">
                  Dirección / Muelle de recogida *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Plaza Santa Elena - Puesto 45',
                    'Cavasa - Módulo 3 Bodega 12',
                    'Galería Alameda - Local 18',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setDireccionRecogida(sug)}
                      className="btn-98 min-h-[40px] text-[11px] font-mono"
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      {sug.split(' - ')[0]}
                    </button>
                  ))}
                </div>
                <input
                  id="wiz-direccion"
                  type="text"
                  className="retro-field min-h-[48px]"
                  value={direccionRecogida}
                  onChange={(e) => setDireccionRecogida(e.target.value)}
                  placeholder="Dirección exacta o número de bodega/local"
                  required
                />
              </div>

              <div>
                <label className="retro-label" htmlFor="wiz-hora">
                  Hora límite de recogida *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: '+2 Horas', horas: 2 },
                    { label: '+4 Horas', horas: 4 },
                    { label: '+6 Horas', horas: 6 },
                  ].map((op) => (
                    <button
                      key={op.horas}
                      type="button"
                      onClick={() => setHoraLimite(calcularHoraMas(op.horas))}
                      className="btn-98 min-h-[40px] px-3 text-[11px] font-mono font-bold text-[#000080]"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      {op.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#000080] shrink-0" />
                  <input
                    id="wiz-hora"
                    type="time"
                    className="retro-field min-h-[48px] font-bold text-base"
                    value={horaLimite}
                    onChange={(e) => setHoraLimite(e.target.value)}
                    required
                  />
                </div>
                {estHora.esValida && estHora.esManana && (
                  <div className="mt-2 bevel-in bg-[#e8f4fd] border border-sky-700 p-2 text-sky-950 font-mono text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-800 shrink-0" />
                    <span>
                      Hora programada para mañana a las <b>{horaLimite}</b> (próximas 24 horas).
                    </span>
                  </div>
                )}
                {!horaEsFutura && (
                  <div className="mt-2 bevel-in bg-[#fff4cc] border border-amber-700 p-2 text-amber-950 font-mono text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
                    <span>
                      Por favor selecciona una hora válida en formato HH:MM.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="btn-98 min-h-[48px] px-5 gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ANTERIOR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaso(3)}
                  disabled={!paso2Valido}
                  className="btn-green min-h-[48px] px-6 text-xs sm:text-sm gap-2"
                >
                  <span>SIGUIENTE: PASO FINAL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: EXENCIÓN LEGAL LEY 1990 DE 2019 */}
          {paso === 3 && (
            <div className="flex flex-col gap-3">
              <div className="bevel-in bg-white p-3.5 border-2 border-[#000080]">
                <div className="flex items-center gap-2 text-[#000080] font-mono font-bold text-xs mb-2">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>DECLARACIÓN SANITARIA OBLIGATORIA (LEY 1990 DE 2019)</span>
                </div>
                <p className="font-mono text-xs text-slate-800 leading-relaxed mb-3">
                  De conformidad con la Ley 1990 de 2019 (política contra la pérdida y el desperdicio de alimentos),
                  el donante certifica de buena fe que los alimentos entregados se encuentran aptos para el consumo
                  humano y cumplen las condiciones de inocuidad al momento de su retiro.
                </p>

                <label
                  htmlFor="wiz-legal"
                  className="bevel-out p-3 flex items-start gap-3 cursor-pointer select-none min-h-[48px]"
                >
                  <input
                    id="wiz-legal"
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 accent-[#000080] shrink-0 cursor-pointer"
                    checked={exencionAceptada}
                    onChange={(e) => setExencionAceptada(e.target.checked)}
                  />
                  <span className="font-mono text-xs font-bold text-black">
                    Acepto la declaración de inocuidad y exención de responsabilidad sanitaria (Ley 1990 de 2019). *
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  disabled={cargando}
                  className="btn-98 min-h-[48px] px-5 gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ANTERIOR</span>
                </button>
                <button
                  id="btn-wizard-publish"
                  type="submit"
                  disabled={!paso3Valido || cargando}
                  className="btn-green min-h-[48px] px-6 text-xs sm:text-sm font-extrabold grow justify-center"
                >
                  {cargando ? 'PUBLICANDO DONACIÓN...' : 'PUBLICAR DONACIÓN'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Panel Derecho: Live Preview & Telemetría SCADA */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        <section className="scada-panel p-3" aria-label="Vista previa del lote">
          <h3 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-phosphor">
            ▶ VISTA PREVIA DEL LOTE
          </h3>
          <LotCard
            lot={{
              product: `${tipoAlimento} (${unidadMedida})`,
              kg: cantidadNum,
              hoursLeft: 4,
              donor: donanteNombre || direccionRecogida,
              coldChain: requiereFrio ? '4°C - 8°C' : 'Ambiente (sin refrigeración)',
              requiereFrio,
            }}
          />
          <p className="mt-2 font-mono text-[11px] text-slate-400">
            Prioridad de despacho:{' '}
            <b className="text-nexo-amber">{urgencia}</b> • Hora límite: <b className="text-white">{horaLimite}</b>
          </p>
          <p className="mt-2 font-mono text-slate-300">
            Raciones estimadas:{' '}
            <span className="text-2xl font-extrabold text-nexo-amber text-glow-amber">
              {fmt.format(impacto.rations)}
            </span>
          </p>
        </section>

        <section className="scada-panel p-3" aria-label="Cálculo de impacto ambiental">
          <h3 className="mb-2 font-mono text-xs font-bold tracking-widest text-nexo-cyan">
            ▶ IMPACTO AMBIENTAL Y TRIBUTARIO
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bevel-in-dark bg-black/40 p-2">
              <p className="font-mono text-[10px] uppercase text-slate-400">CO₂ Evitado</p>
              <p className="font-mono text-lg font-extrabold text-nexo-cyan text-glow-cyan">
                {impacto.co2Kg.toFixed(1)} kg
              </p>
            </div>
            <div className="bevel-in-dark bg-black/40 p-2">
              <p className="font-mono text-[10px] uppercase text-slate-400">Agua Preservada</p>
              <p className="font-mono text-lg font-extrabold text-nexo-phosphor text-glow-green">
                {fmt.format(Math.round(impacto.waterL))} L
              </p>
            </div>
          </div>
          <div className="mt-2 bevel-in-dark bg-black/40 p-2">
            <p className="font-mono text-[10px] uppercase text-slate-400">Deducción Estimada (Ley 1990)</p>
            <p className="font-mono text-xl font-extrabold text-nexo-amber text-glow-amber">
              {fmtCop(impacto.deductibleCop)} COP
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DonacionWizard;
