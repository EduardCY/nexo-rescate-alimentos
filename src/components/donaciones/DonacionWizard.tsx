'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  Phone,
  RefreshCw,
  Store,
} from 'lucide-react';
import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { publicarDonacion } from '@/actions/donaciones';
import { listarOrganizaciones, type OrganizacionRegistrada } from '@/actions/organizaciones';
import { normalizarFechaHoraLimite } from '@/lib/utils/donaciones-helper';
import { db, guardarDonacionOffline } from '@/lib/db';
import { sincronizarColaOffline } from '@/lib/sync/offline-sync';
import { calcImpact, fmt, fmtCop, urgencyOf, type CategoryId } from '@/lib/nexo/impact';
import LotCard from '@/components/nexo/LotCard';
import { useSession } from '@/lib/auth/session-context';
import type { ZonaCali } from '@/types';

// Carga dinámica del mapa interactivo Leaflet para evitar errores en SSR
const LocationPickerMap = dynamic(
  () => import('@/components/donaciones/LocationPickerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="bevel-in bg-[#070c18] p-5 text-center text-white font-mono text-xs border border-slate-700">
        <div className="inline-block animate-spin mr-2">⏳</div>
        <span>Cargando mapa interactivo de Cali (Leaflet / OSM)...</span>
      </div>
    ),
  }
);

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

const ZONAS_CALI: ZonaCali[] = ['CENTRO', 'NORTE', 'SUR', 'ORIENTE', 'LADERA'];

/**
 * Wizard Mobile-First en 3 pasos para el registro rápido y georreferenciado de donaciones.
 * Integra mapa interactivo Leaflet/OSM, selector de zona, preasignación opcional de comedor,
 * etiqueta explícita "Temperatura Ambiente" (CA-01.4), aviso normativo colombiano destacado (CA-01.3)
 * y captura tolerante a desconexión con código determinista OFFLINE-DON-... (CA-01.5 / RNF-002).
 */
export function DonacionWizard({
  onCompleted,
}: {
  onCompleted?: (codigo: string, isOffline: boolean) => void;
}) {
  const { sesion } = useSession();

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [intentoSinExencion, setIntentoSinExencion] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{
    codigo: string;
    offline: boolean;
    localId?: number;
    recienSincronizada?: boolean;
  } | null>(null);
  const [sincronizandoManual, setSincronizandoManual] = useState(false);

  // Estado Paso 1: Alimento, Cantidad, Unidad y Refrigeración
  const [catId, setCatId] = useState<CategoryId>('fruta');
  const [tipoAlimento, setTipoAlimento] = useState('');
  const [cantidadEstimada, setCantidadEstimada] = useState('');
  const [unidadMedida, setUnidadMedida] = useState<'kg' | 'canastillas' | 'bultos' | 'unidades'>('kg');
  const [requiereFrio, setRequiereFrio] = useState(false);

  // Estado Paso 2: Dirección, Zona, Ubicación Exacta, Comedor Destino Opcional y Teléfono
  const [donanteNombre, setDonanteNombre] = useState(
    sesion?.organizacionNombre || sesion?.nombre || ''
  );
  const [zona, setZona] = useState<ZonaCali>(sesion?.zona || 'CENTRO');
  const [direccionRecogida, setDireccionRecogida] = useState(
    sesion?.direccion || ''
  );
  const [indicacionesPuesto, setIndicacionesPuesto] = useState('');
  const [telefonoDonante, setTelefonoDonante] = useState(sesion?.telefono || '');
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>({
    lat: 3.435,
    lng: -76.528,
  });
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [comedoresRegistrados, setComedoresRegistrados] = useState<OrganizacionRegistrada[]>([]);
  const [comedorSeleccionadoId, setComedorSeleccionadoId] = useState<string>('');

  // Hora Límite
  const [esParaManana, setEsParaManana] = useState(false);
  const calcularHoraMas = (horasExtra: number) => {
    const now = new Date();
    const d = new Date(Date.now() + horasExtra * 3600 * 1000);
    setEsParaManana(d.getDate() !== now.getDate());
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [horaLimite, setHoraLimite] = useState(() => calcularHoraMas(4));

  // Estado Paso 3: Exención Sanitaria Ley 1990/2019
  const [exencionAceptada, setExencionAceptada] = useState(false);

  // Sincronizar datos del donante si hay sesión activa
  useEffect(() => {
    if (sesion) {
      if (sesion.organizacionNombre || sesion.nombre) {
        setDonanteNombre(sesion.organizacionNombre || sesion.nombre);
      }
      if (sesion.zona) setZona(sesion.zona);
      if (sesion.direccion) setDireccionRecogida(sesion.direccion);
      if (sesion.telefono) setTelefonoDonante(sesion.telefono);
    }
  }, [sesion]);

  // Cargar comedores reales registrados para preasignación opcional
  useEffect(() => {
    listarOrganizaciones('RECEPTOR')
      .then((lista) => setComedoresRegistrados(lista))
      .catch(() => {});
  }, []);

  const comedoresCompatibles = comedoresRegistrados.filter(
    (c) => !requiereFrio || Boolean(c.tieneRefrigeracion)
  );

  // Suscripción reactiva a eventos de sincronización offline (CA-01.5)
  useEffect(() => {
    const handleSynced = (e: Event) => {
      const custom = e as CustomEvent<{
        localId: number;
        codigoServidor: string;
        codigoTemporal?: string;
      }>;
      if (!custom.detail) return;

      setConfirmacion((prev) => {
        if (!prev) return null;
        if (prev.offline && (!prev.localId || prev.localId === custom.detail.localId)) {
          onCompleted?.(custom.detail.codigoServidor, false);
          return {
            codigo: custom.detail.codigoServidor,
            offline: false,
            recienSincronizada: true,
          };
        }
        return prev;
      });
    };

    const handleOnline = () => {
      if (confirmacion?.offline) {
        void sincronizarColaOffline();
      }
    };

    window.addEventListener('nexo:offline-synced', handleSynced);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('nexo:offline-synced', handleSynced);
      window.removeEventListener('online', handleOnline);
    };
  }, [confirmacion?.offline, onCompleted]);

  // Manejador al seleccionar un punto en el mapa interactivo
  const handleLocationSelect = (
    coords: { lat: number; lng: number },
    direccionSugerida?: string,
    zonaSugerida?: ZonaCali
  ) => {
    setCoordenadas(coords);
    if (direccionSugerida) {
      setDireccionRecogida(direccionSugerida);
    }
    if (zonaSugerida) {
      setZona(zonaSugerida);
    }
  };

  // Validación reactiva de hora futura (CA-01.2)
  const validarHoraFutura = (
    val: string,
    forzarManana: boolean
  ): { esValida: boolean; esPasada: boolean; esManana: boolean } => {
    const match = val.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    if (!match) return { esValida: false, esPasada: false, esManana: false };
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
    if (forzarManana) {
      const targetManana = new Date(targetHoy.getTime() + 24 * 3600 * 1000);
      return { esValida: targetManana.getTime() > now.getTime(), esPasada: false, esManana: true };
    }
    if (targetHoy.getTime() > now.getTime()) {
      return { esValida: true, esPasada: false, esManana: false };
    }
    return { esValida: false, esPasada: true, esManana: false };
  };

  const cantidadNum = parseFloat(cantidadEstimada) || 0;
  const estHora = validarHoraFutura(horaLimite, esParaManana);
  const horaEsFutura = estHora.esValida;
  const impacto = calcImpact(cantidadNum > 0 ? cantidadNum : 0, catId);
  const urgencia = urgencyOf(4);

  const paso1Valido = tipoAlimento.trim().length >= 3 && cantidadNum > 0;
  const paso2Valido = direccionRecogida.trim().length >= 5 && horaEsFutura;
  const paso3Valido = exencionAceptada === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paso3Valido) {
      setIntentoSinExencion(true);
      setErrorMsg(
        'Debes aceptar expresamente la declaración de inocuidad y exención sanitaria (Ley 1990 de 2019).'
      );
      return;
    }
    if (cargando) return;
    setCargando(true);
    setErrorMsg(null);
    setIntentoSinExencion(false);

    try {
      const horaIsoSegura = esParaManana
        ? new Date(new Date(normalizarFechaHoraLimite(horaLimite)).getTime() + 24 * 3600 * 1000).toISOString()
        : normalizarFechaHoraLimite(horaLimite);

      const comedorElegido = comedoresCompatibles.find((c) => c.id === comedorSeleccionadoId);

      const payload: DonacionInput = {
        tipoAlimento: tipoAlimento.trim(),
        cantidadEstimada: cantidadNum,
        unidadMedida,
        direccionRecogida: direccionRecogida.trim(),
        indicacionesPuesto: indicacionesPuesto.trim() || undefined,
        telefonoDonante: telefonoDonante.trim() || undefined,
        zona,
        coordenadas: coordenadas || undefined,
        horaLimite: horaIsoSegura,
        requiereFrio,
        exencionSanitariaAceptada: true,
        donanteId: sesion?.userId,
        donanteNombre: donanteNombre.trim() || 'Comercio Donante',
        comedorId: comedorElegido?.id,
        comedorNombre: comedorElegido?.nombre,
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
          const localId = await guardarDonacionOffline(validacion.data);
          const reg = await db.donaciones.get(localId).catch(() => undefined);
          const codigoTemp = reg?.codigoLocal || reg?.codigoTemporal || `OFFLINE-DON-${localId}`;
          setConfirmacion({ codigo: codigoTemp, offline: true, localId });
          onCompleted?.(codigoTemp, true);
        }
      } else {
        const localId = await guardarDonacionOffline(validacion.data);
        const reg = await db.donaciones.get(localId).catch(() => undefined);
        const codigoTemp = reg?.codigoLocal || reg?.codigoTemporal || `OFFLINE-DON-${localId}`;
        setConfirmacion({ codigo: codigoTemp, offline: true, localId });
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
    setIntentoSinExencion(false);
  };

  if (confirmacion) {
    return (
      <div className="bevel-out p-4 text-black font-mono max-w-xl mx-auto">
        <div className="titlebar px-2.5 py-1.5 text-white font-bold text-xs flex items-center justify-between mb-4">
          <span>CONFIRMACIÓN DE REGISTRO</span>
          <span>[OK]</span>
        </div>

        <div
          className={`bevel-in p-4 mb-4 ${
            confirmacion.offline
              ? 'bg-[#fffde7] border-2 border-amber-500'
              : 'bg-[#eefbee] border-2 border-emerald-600'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm mb-2">
            {confirmacion.offline ? (
              <>
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-950">
                  Guardado localmente — Pendiente de sincronización
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span className="text-emerald-950">
                  {confirmacion.recienSincronizada
                    ? '¡Donación sincronizada reactivamente con el servidor!'
                    : '¡Donación publicada exitosamente en la red!'}
                </span>
              </>
            )}
          </div>

          <p className="text-xs text-slate-800 mb-3">
            Código asignado:{' '}
            <strong className="bg-white px-2 py-0.5 bevel-in text-sm font-extrabold text-[#000080]">
              {confirmacion.codigo}
            </strong>
            {confirmacion.recienSincronizada && (
              <span className="ml-2 bg-emerald-200 text-emerald-900 px-2 py-0.5 text-[10px] font-bold uppercase rounded">
                Sincronizado vía Dexie
              </span>
            )}
          </p>

          <p className="text-[11px] text-slate-700 leading-relaxed mb-3">
            {confirmacion.offline
              ? 'Tu donación quedó almacenada de forma segura en la base de datos local (IndexedDB / Dexie.js). Se transmitirá automáticamente tan pronto tu dispositivo detecte señal de internet.'
              : 'Los comedores comunitarios y voluntarios cercanos en Cali ya pueden visualizar y tomar esta donación.'}
          </p>

          {confirmacion.offline && (
            <div className="pt-2 border-t border-amber-300">
              <button
                type="button"
                disabled={sincronizandoManual}
                onClick={async () => {
                  setSincronizandoManual(true);
                  try {
                    await sincronizarColaOffline();
                  } finally {
                    setSincronizandoManual(false);
                  }
                }}
                className="btn-98 w-full min-h-[44px] text-xs font-bold flex items-center justify-center gap-2 bg-[#ffecb3] hover:bg-[#ffe082]"
              >
                <RefreshCw className={`w-4 h-4 ${sincronizandoManual ? 'animate-spin' : ''}`} />
                <span>
                  {sincronizandoManual
                    ? 'Sincronizando con el servidor...'
                    : 'Reintentar sincronización ahora'}
                </span>
              </button>
            </div>
          )}
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
            2. Recogida & Mapa
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

              {/* Switch Visual Destacado para Requiere Refrigeración vs Temperatura Ambiente (CA-01.4) */}
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
                        {requiereFrio
                          ? 'Seleccionado: Requiere Refrigeración (4°C - 8°C).'
                          : 'Seleccionado por defecto: Temperatura Ambiente (no requiere cadena de frío).'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={requiereFrio}
                    onClick={() => setRequiereFrio(!requiereFrio)}
                    className={`min-h-[48px] min-w-[140px] px-3 font-mono text-xs font-extrabold ${
                      requiereFrio ? 'btn-blue' : 'btn-98'
                    }`}
                  >
                    {requiereFrio ? '✓ SÍ (FRÍO)' : 'Temperatura Ambiente'}
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
                  <span>SIGUIENTE: RECOGIDA & MAPA</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: DIRECCIÓN DE RECOGIDA, ZONA, MAPA INTERACTIVO Y CONTACTO */}
          {paso === 2 && (
            <div className="flex flex-col gap-3">
              {/* Nombre del puesto o comercio donante */}
              <div>
                <label className="retro-label" htmlFor="wiz-donante">
                  Nombre del puesto o comercio donante *
                </label>
                <div className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-[#000080] shrink-0" />
                  <input
                    id="wiz-donante"
                    type="text"
                    className="retro-field min-h-[44px] grow"
                    value={donanteNombre}
                    onChange={(e) => setDonanteNombre(e.target.value)}
                    placeholder="Ej. Puesto 45 Doña Rosa"
                    required
                  />
                </div>
              </div>

              {/* Selector de Zona Urbana de Cali */}
              <div>
                <label className="retro-label">Zona de Cali *</label>
                <div className="grid grid-cols-5 gap-1 mb-1">
                  {ZONAS_CALI.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZona(z)}
                      className={`min-h-[38px] px-1 font-mono text-[11px] font-bold ${
                        zona === z ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
                      }`}
                    >
                      {z}
                    </button>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-slate-600">
                  Zona seleccionada: <strong className="text-[#000080]">{zona}</strong> (orienta la asignación del comedor comunitario más cercano).
                </p>
              </div>

              {/* Selector Opcional de Comedor Comunitario Destino */}
              {comedoresCompatibles.length > 0 && (
                <div>
                  <label className="retro-label" htmlFor="wiz-comedor-destino">
                    Asignar a Comedor Comunitario Receptor (Opcional)
                  </label>
                  <select
                    id="wiz-comedor-destino"
                    value={comedorSeleccionadoId}
                    onChange={(e) => setComedorSeleccionadoId(e.target.value)}
                    className="retro-field min-h-[44px] font-mono text-xs"
                  >
                    <option value="">
                      Abierto a cualquier comedor compatible en Cali ({comedoresCompatibles.length} disponibles)
                    </option>
                    {comedoresCompatibles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} — Zona {c.zona} ({c.capacidadRacionesDia || c.comensalesDiarios || 100} comensales •{' '}
                        {c.tieneRefrigeracion ? '❄ Con frío' : 'Temperatura Ambiente'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mapa Interactivo con Leaflet y OpenStreetMap ($0 USD) */}
              <div className="bevel-in bg-slate-100 p-2 border border-slate-400">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-[#000080] flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>UBICACIÓN EN MAPA INTERACTIVO</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarMapa(!mostrarMapa)}
                    className="font-mono text-[11px] text-blue-900 underline font-bold"
                  >
                    {mostrarMapa ? '▲ Ocultar mapa' : '▼ Ver mapa interactivo'}
                  </button>
                </div>

                {mostrarMapa && (
                  <LocationPickerMap
                    coordenadas={coordenadas}
                    zonaActual={zona}
                    onLocationSelect={handleLocationSelect}
                  />
                )}
              </div>

              {/* Dirección / Referencia Principal de Recogida */}
              <div>
                <label className="retro-label" htmlFor="wiz-direccion">
                  Dirección o referencia de recogida *
                </label>
                <input
                  id="wiz-direccion"
                  type="text"
                  className="retro-field min-h-[44px]"
                  value={direccionRecogida}
                  onChange={(e) => setDireccionRecogida(e.target.value)}
                  placeholder="Dirección o plaza (ej. Carrera 29 # 25-10, Galería Santa Elena)"
                  required
                />
              </div>

              {/* Puesto / Muelle / Indicaciones Exactas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="retro-label" htmlFor="wiz-puesto">
                    Puesto / Muelle / Indicaciones exactas
                  </label>
                  <input
                    id="wiz-puesto"
                    type="text"
                    className="retro-field min-h-[44px]"
                    value={indicacionesPuesto}
                    onChange={(e) => setIndicacionesPuesto(e.target.value)}
                    placeholder="Ej. Pabellón Verde, puesto 45 o muelle 2"
                  />
                </div>

                <div>
                  <label className="retro-label" htmlFor="wiz-telefono">
                    Teléfono / WhatsApp de contacto
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-[#000080] shrink-0" />
                    <input
                      id="wiz-telefono"
                      type="tel"
                      className="retro-field min-h-[44px] grow"
                      value={telefonoDonante}
                      onChange={(e) => setTelefonoDonante(e.target.value)}
                      placeholder="Ej. +573154201122"
                    />
                  </div>
                </div>
              </div>

              {/* Hora límite de recogida */}
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
                    className={`retro-field min-h-[48px] font-bold text-base ${
                      estHora.esPasada ? '!border-red-600 !bg-red-50 text-red-900' : ''
                    }`}
                    value={horaLimite}
                    onChange={(e) => setHoraLimite(e.target.value)}
                    required
                  />
                </div>

                <label className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={esParaManana}
                    onChange={(e) => setEsParaManana(e.target.checked)}
                    className="w-4 h-4 accent-[#000080] cursor-pointer"
                  />
                  <span>Recogida programada para mañana (+24h)</span>
                </label>

                {estHora.esValida && estHora.esManana && (
                  <div className="mt-2 bevel-in bg-[#e8f4fd] border border-sky-700 p-2 text-sky-950 font-mono text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-800 shrink-0" />
                    <span>
                      Hora programada para mañana a las <b>{horaLimite}</b> (próximas 24 horas).
                    </span>
                  </div>
                )}

                {estHora.esPasada && (
                  <div className="mt-2 bevel-in bg-red-100 border border-red-700 p-2.5 text-red-950 font-mono text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-800 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-900">Hora límite inválida:</p>
                      <p>La hora límite de recogida debe ser posterior a la hora actual.</p>
                    </div>
                  </div>
                )}

                {!horaEsFutura && !estHora.esPasada && (
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

          {/* PASO 3: EXENCIÓN LEGAL LEY 1990 DE 2019 (TASK-30 / CA-01.3) */}
          {paso === 3 && (
            <div className="flex flex-col gap-3">
              <div
                className={`bevel-in bg-white p-3.5 border-2 border-[#000080] ${
                  intentoSinExencion && !exencionAceptada ? 'ring-2 ring-red-500 bg-red-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 text-[#000080] font-mono font-bold text-xs mb-2">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>
                    DECLARACIÓN SANITARIA Y LEGAL OBLIGATORIA (LEY 1990 DE 2019 • RESOLUCIÓN 2674 DE 2013 INVIMA)
                  </span>
                </div>
                <p className="font-mono text-xs text-slate-800 leading-relaxed mb-2">
                  De conformidad con la <b>Ley 1990 de 2019</b> (política contra la pérdida y el desperdicio de alimentos),
                  la <b>Resolución 2674 de 2013 del INVIMA</b> (requisitos sanitarios de inocuidad) y la{' '}
                  <b>Ley 1581 de 2012</b> (protección de datos personales Habeas Data), el donante certifica de buena fe
                  que los alimentos entregados se encuentran aptos para el consumo humano al momento de su retiro.
                </p>

                <label
                  htmlFor="wiz-legal"
                  className={`bevel-out p-3 flex items-start gap-3 cursor-pointer select-none min-h-[48px] ${
                    intentoSinExencion && !exencionAceptada ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  <input
                    id="wiz-legal"
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 accent-[#000080] shrink-0 cursor-pointer"
                    checked={exencionAceptada}
                    onChange={(e) => {
                      setExencionAceptada(e.target.checked);
                      if (e.target.checked) {
                        setIntentoSinExencion(false);
                        setErrorMsg(null);
                      }
                    }}
                  />
                  <span className="font-mono text-xs font-bold text-black">
                    Acepto la declaración de inocuidad y exención de responsabilidad sanitaria (Ley 1990 de 2019 / Resolución 2674 INVIMA). *
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
              coldChain: requiereFrio ? '4°C - 8°C' : 'Temperatura Ambiente',
              requiereFrio,
            }}
          />
          <div className="mt-2.5 font-mono text-[11px] text-slate-300 space-y-1 bevel-in-dark bg-black/40 p-2">
            <p>
              Zona logistica: <b className="text-nexo-cyan">{zona}</b> • Condición:{' '}
              <b className="text-white">
                {requiereFrio ? 'Requiere Refrigeración' : 'Temperatura Ambiente'}
              </b>
            </p>
            <p>
              Ubicación:{' '}
              <b className="text-white">
                {coordenadas
                  ? `${coordenadas.lat.toFixed(4)}, ${coordenadas.lng.toFixed(4)}`
                  : 'Sin geolocalizar'}
              </b>
            </p>
            {indicacionesPuesto && (
              <p className="text-slate-400">
                Puesto: <span className="text-white">{indicacionesPuesto}</span>
              </p>
            )}
            <p className="text-slate-400">
              Prioridad de despacho: <b className="text-nexo-amber">{urgencia}</b> • Límite:{' '}
              <b className="text-white">{horaLimite}</b>
            </p>
          </div>
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
