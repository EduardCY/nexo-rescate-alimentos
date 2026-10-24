'use client';

import React, { useState } from 'react';
import { 
  Package, 
  MapPin, 
  Clock, 
  Snowflake, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Droplets,
  Leaf,
  Utensils,
  WifiOff
} from 'lucide-react';
import { DonacionInputSchema, type DonacionInput } from '@/lib/validations/donacion';
import { publicarDonacion } from '@/actions/donaciones';
import { guardarDonacionOffline } from '@/lib/db';
import { calcImpact, type CategoryId } from '@/lib/nexo/impact';

interface DonacionWizardProps {
  onSuccess?: (codigo: string, isOffline: boolean) => void;
}

const CATEGORIAS_RAPIDAS: { label: string; valor: string; catId: CategoryId }[] = [
  { label: 'Frutas y Verduras', valor: 'Frutas y Verduras Frescas', catId: 'fruta' },
  { label: 'Panadería', valor: 'Panadería y Harinas', catId: 'panaderia' },
  { label: 'Lácteos', valor: 'Lácteos y Derivados', catId: 'lacteos' },
  { label: 'Viandas Preparadas', valor: 'Viandas y Comida Preparada', catId: 'viandas' },
  { label: 'Granos y Abarrotes', valor: 'Granos y Víveres', catId: 'granos' },
];

export function DonacionWizard({ onSuccess }: DonacionWizardProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [cargando, setCargando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);
  const [resultadoFinal, setResultadoFinal] = useState<{ codigo: string; offline: boolean } | null>(null);

  // Estado del formulario tipado
  const [tipoAlimento, setTipoAlimento] = useState('Frutas y Verduras Frescas');
  const [cantidadEstimada, setCantidadEstimada] = useState<string>('25');
  const [unidadMedida, setUnidadMedida] = useState<'kg' | 'canastillas' | 'bultos' | 'unidades'>('kg');
  const [direccionRecogida, setDireccionRecogida] = useState('Plaza Santa Elena - Puesto 42');
  
  // Cálculo de hora límite inicial sugerida (3 horas en el futuro)
  const ahora = new Date();
  ahora.setHours(ahora.getHours() + 3);
  const horaSugerida = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  const [horaLimite, setHoraLimite] = useState(horaSugerida);

  const [requiereFrio, setRequiereFrio] = useState(false);
  const [exencionAceptada, setExencionAceptada] = useState(true);

  // Cálculo de impacto reactivo
  const kgNumerico = parseFloat(cantidadEstimada) || 0;
  const categoriaActual = CATEGORIAS_RAPIDAS.find(c => c.valor === tipoAlimento)?.catId || 'fruta';
  const impacto = calcImpact(kgNumerico, categoriaActual);

  // Validación de paso 1
  const paso1Valido = tipoAlimento.trim().length >= 3 && kgNumerico > 0;
  // Validación de paso 2
  const paso2Valido = direccionRecogida.trim().length >= 5 && horaLimite.trim().length > 0;
  // Validación de paso 3
  const paso3Valido = exencionAceptada;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorGlobal(null);
    setCargando(true);

    try {
      const payload: DonacionInput = {
        tipoAlimento: tipoAlimento.trim(),
        cantidadEstimada: kgNumerico,
        unidadMedida,
        direccionRecogida: direccionRecogida.trim(),
        horaLimite,
        requiereFrio,
        exencionSanitariaAceptada: true,
      };

      // Validar esquema Zod en cliente
      const parseResult = DonacionInputSchema.safeParse(payload);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || (parseResult.error as unknown as { errors?: Array<{ message: string }> }).errors || [];
        setErrorGlobal(issues.map((i) => i.message).join('. '));
        setCargando(false);
        return;
      }

      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        // Enviar vía Server Action hacia Supabase
        const res = await publicarDonacion(parseResult.data);
        if (res.exito) {
          setResultadoFinal({ codigo: res.codigo, offline: false });
          onSuccess?.(res.codigo, false);
        } else {
          // Fallback a almacenamiento local si el servidor falla
          const localId = await guardarDonacionOffline(parseResult.data);
          const codigoOffline = `OFFLINE-DON-${localId}`;
          setResultadoFinal({ codigo: codigoOffline, offline: true });
          onSuccess?.(codigoOffline, true);
        }
      } else {
        // Modo Offline puro (RNF-002)
        const localId = await guardarDonacionOffline(parseResult.data);
        const codigoOffline = `OFFLINE-DON-${localId}`;
        setResultadoFinal({ codigo: codigoOffline, offline: true });
        onSuccess?.(codigoOffline, true);
      }
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error inesperado al publicar la donación';
      setErrorGlobal(mensaje);
    } finally {
      setCargando(false);
    }
  };

  const resetForm = () => {
    setPaso(1);
    setResultadoFinal(null);
    setErrorGlobal(null);
    setCantidadEstimada('20');
  };

  // Pantalla de confirmación exitosa
  if (resultadoFinal) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-lg mx-auto flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {resultadoFinal.offline ? 'Guardado Local en Plaza (Offline)' : 'Donación Publicada en Red'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            ¡Lote Registrado con Éxito!
          </h2>
          <p className="text-slate-300 text-sm mt-2">
            {resultadoFinal.offline
              ? 'Se almacenó en el dispositivo. En cuanto recuperes señal de datos, se sincronizará automáticamente con los comedores.'
              : 'Los comedores comunitarios cercanos y transportistas ya fueron notificados en tiempo real.'}
          </p>
        </div>

        {/* Tarjeta de Código */}
        <div className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center gap-1">
          <p className="text-xs text-slate-400 font-medium">Código Único de Seguimiento</p>
          <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-wider">
            {resultadoFinal.codigo}
          </p>
          {resultadoFinal.offline && (
            <p className="text-[11px] text-amber-400 flex items-center gap-1 mt-1">
              <WifiOff className="w-3.5 h-3.5" /> Pendiente de sincronización remota
            </p>
          )}
        </div>

        {/* Resumen de Impacto Inmediato */}
        <div className="w-full grid grid-cols-3 gap-2 text-center">
          <div className="glass-card p-2.5">
            <Utensils className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-base sm:text-lg font-bold text-white">{impacto.rations}</p>
            <p className="text-[10px] text-slate-400">Raciones</p>
          </div>
          <div className="glass-card p-2.5">
            <Leaf className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-base sm:text-lg font-bold text-white">{impacto.co2Kg.toFixed(1)} kg</p>
            <p className="text-[10px] text-slate-400">CO₂ Evitado</p>
          </div>
          <div className="glass-card p-2.5">
            <Droplets className="w-4 h-4 text-sky-400 mx-auto mb-1" />
            <p className="text-base sm:text-lg font-bold text-white">{Math.round(impacto.waterL)} L</p>
            <p className="text-[10px] text-slate-400">Agua Salvada</p>
          </div>
        </div>

        <button 
          type="button" 
          onClick={resetForm} 
          className="glass-button-primary w-full"
        >
          Publicar otra donación
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl mx-auto">
      {/* Columna Izquierda: Formulario Wizard */}
      <div className="lg:col-span-7 glass-panel p-5 sm:p-7 shadow-2xl">
        {/* Barra de progreso de 3 pasos */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className={paso >= 1 ? 'text-emerald-400' : 'text-slate-500'}>1. Alimento</span>
            <span className={paso >= 2 ? 'text-emerald-400' : 'text-slate-500'}>2. Ubicación & Horario</span>
            <span className={paso >= 3 ? 'text-emerald-400' : 'text-slate-500'}>3. Frío & Legal</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 h-full"
              style={{ width: `${(paso / 3) * 100}%` }}
            />
          </div>
        </div>

        {errorGlobal && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorGlobal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* PASO 1: Alimento y Cantidad */}
          {paso === 1 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="tipoAlimento">
                  Tipo o Categoría del Alimento *
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {CATEGORIAS_RAPIDAS.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => setTipoAlimento(cat.valor)}
                      className={`text-left text-xs font-medium p-2.5 rounded-xl border transition-all touch-target flex items-center justify-between ${
                        tipoAlimento === cat.valor
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-white'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {tipoAlimento === cat.valor && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
                <input
                  id="tipoAlimento"
                  type="text"
                  className="glass-input w-full"
                  placeholder="O describe el producto (ej. Tomate chonto, Plátano)"
                  value={tipoAlimento}
                  onChange={(e) => setTipoAlimento(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="cantidad">
                    Cantidad Estimada *
                  </label>
                  <input
                    id="cantidad"
                    type="number"
                    min="0.1"
                    step="any"
                    className="glass-input w-full font-mono text-lg font-bold"
                    placeholder="0"
                    value={cantidadEstimada}
                    onChange={(e) => setCantidadEstimada(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="unidad">
                    Unidad de Medida
                  </label>
                  <select
                    id="unidad"
                    className="glass-input w-full font-medium"
                    value={unidadMedida}
                    onChange={(e) => setUnidadMedida(e.target.value as 'kg' | 'canastillas' | 'bultos' | 'unidades')}
                  >
                    <option value="kg" className="bg-slate-900 text-white">Kilogramos (kg)</option>
                    <option value="canastillas" className="bg-slate-900 text-white">Canastillas</option>
                    <option value="bultos" className="bg-slate-900 text-white">Bultos</option>
                    <option value="unidades" className="bg-slate-900 text-white">Unidades sueltas</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  disabled={!paso1Valido}
                  className="glass-button-primary w-full sm:w-auto"
                >
                  Siguiente: Ubicación y Horario <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: Ubicación y Ventana Horaria */}
          {paso === 2 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="direccion">
                  Lugar o Muelle de Recogida *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setDireccionRecogida('Plaza Santa Elena - Puesto 42')}
                    className="text-[11px] bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-700"
                  >
                    Santa Elena
                  </button>
                  <button
                    type="button"
                    onClick={() => setDireccionRecogida('Cavasa - Módulo 3, Bodega 12')}
                    className="text-[11px] bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-700"
                  >
                    Cavasa Módulo 3
                  </button>
                  <button
                    type="button"
                    onClick={() => setDireccionRecogida('Galería Alameda - Local 18')}
                    className="text-[11px] bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-300 hover:bg-slate-700"
                  >
                    Galería Alameda
                  </button>
                </div>
                <input
                  id="direccion"
                  type="text"
                  className="glass-input w-full"
                  placeholder="Dirección, plaza y número de puesto/puerta"
                  value={direccionRecogida}
                  onChange={(e) => setDireccionRecogida(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="hora">
                  Hora Límite de Recogida (Hoy o Fecha Futura) *
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    id="hora"
                    type="time"
                    className="glass-input w-full pl-10 font-mono text-base font-semibold"
                    value={horaLimite}
                    onChange={(e) => setHoraLimite(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Debe ser una hora posterior a la actual para que los voluntarios alcancen a recogerla.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="glass-button-secondary"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </button>
                <button
                  type="button"
                  onClick={() => setPaso(3)}
                  disabled={!paso2Valido}
                  className="glass-button-primary"
                >
                  Siguiente: Frío & Legal <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: Refrigeración y Compuerta Legal Ley 1990 */}
          {paso === 3 && (
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Toggle de Cadena de Frío */}
              <div className="glass-card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    requiereFrio ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">¿Requiere Cadena de Frío?</p>
                    <p className="text-xs text-slate-400">Lácteos, carnes, mariscos o refrigerados (4°C - 8°C)</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRequiereFrio(!requiereFrio)}
                  role="switch"
                  aria-checked={requiereFrio}
                  className={`w-14 h-8 rounded-full transition-colors relative p-1 touch-target flex items-center ${
                    requiereFrio ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform block ${
                    requiereFrio ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Compuerta Legal Obligatoria Ley 1990 de 2019 */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 mt-0.5 accent-emerald-500 shrink-0"
                    checked={exencionAceptada}
                    onChange={(e) => setExencionAceptada(e.target.checked)}
                    required
                  />
                  <div className="text-xs leading-relaxed text-slate-200">
                    <span className="font-bold text-emerald-400 block mb-0.5">
                      Declaración Sanitaria Obligatoria (Ley 1990 de 2019)
                    </span>
                    Certifico de buena fe que los alimentos donados son aptos para el consumo humano, 
                    están en condiciones higiénicas adecuadas y no han superado su fecha de vencimiento. 
                    Acepto la exención de responsabilidad conforme al marco normativo colombiano.
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setPaso(2)}
                  className="glass-button-secondary"
                  disabled={cargando}
                >
                  <ArrowLeft className="w-4 h-4" /> Volver
                </button>
                <button
                  type="submit"
                  disabled={!paso3Valido || cargando}
                  className="glass-button-primary grow justify-center text-sm sm:text-base font-extrabold"
                >
                  {cargando ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publicando...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Publicar Donación Inmediata
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Columna Derecha: Tarjeta de Previsualización y Cálculo de Impacto en Tiempo Real */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Package className="w-4 h-4" /> Vista Previa del Lote
            </h3>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
              {unidadMedida}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-lg font-bold text-white leading-tight">
              {tipoAlimento || 'Nombre del alimento'}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-mono text-emerald-400 font-bold text-base">
                {kgNumerico} {unidadMedida}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate max-w-[180px]">{direccionRecogida || 'Dirección de recogida'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-lg text-slate-300 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Retiro antes de: <b className="text-white">{horaLimite}</b>
              </span>
              {requiereFrio && (
                <span className="text-[11px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Snowflake className="w-3 h-3" /> Requiere Frío
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Panel de Impacto Social y Ambiental */}
        <div className="glass-panel p-5 bg-gradient-to-br from-slate-900/80 to-slate-950/90">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-3 border-b border-slate-800 pb-2">
            <Sparkles className="w-4 h-4" /> Impacto Social & Ambiental Estimado
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="glass-card p-3">
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Utensils className="w-3.5 h-3.5 text-amber-400" /> Raciones de Comida
              </p>
              <p className="text-2xl font-black text-amber-400 font-mono">
                {impacto.rations}
              </p>
              <p className="text-[10px] text-slate-500">Aprox. 400g / ración</p>
            </div>

            <div className="glass-card p-3">
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" /> CO₂ Evitado
              </p>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                {impacto.co2Kg.toFixed(1)} <span className="text-xs font-normal">kg</span>
              </p>
              <p className="text-[10px] text-slate-500">Factor 2.101 kg CO₂e/kg</p>
            </div>
          </div>

          <div className="glass-card p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-400" /> Huella Hídrica Preservada
              </p>
              <p className="text-xs text-slate-500">Agua virtual de cultivo y transporte</p>
            </div>
            <p className="text-lg font-black text-sky-400 font-mono">
              {Math.round(impacto.waterL).toLocaleString()} <span className="text-xs font-normal">L</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
