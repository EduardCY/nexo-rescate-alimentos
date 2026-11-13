'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  AlertCircle,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import {
  consultarRastreoDonacion,
  obtenerTodasLasDonaciones,
  type ResultadoRastreoDonacion,
} from '@/actions/donaciones';
import WindowFrame from '@/components/nexo/WindowFrame';
import { useSession } from '@/lib/auth/session-context';
import { TimelineTracker } from '@/components/rastreo/TimelineTracker';

function RastreoContenido() {
  const searchParams = useSearchParams();
  const codigoInicial = searchParams.get('codigo') || '';

  const [codigoBusqueda, setCodigoBusqueda] = useState(codigoInicial);
  const [rastreo, setRastreo] = useState<ResultadoRastreoDonacion | null>(null);
  const [codigosRecientes, setCodigosRecientes] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    obtenerTodasLasDonaciones()
      .then((lista) => {
        const cods = lista.slice(0, 6).map((d) => d.codigo);
        setCodigosRecientes(cods);
      })
      .catch(() => {});
  }, []);

  const ejecutarConsulta = async (codigo: string) => {
    const limpio = codigo.trim();
    if (!limpio) {
      setErrorMsg('Por favor ingresa un código de seguimiento (ej. DON-101).');
      return;
    }

    setCargando(true);
    setErrorMsg(null);
    try {
      const resultado = await consultarRastreoDonacion(limpio);
      if (!resultado) {
        setRastreo(null);
        setErrorMsg(
          `No se encontró ninguna donación registrada con el código "${limpio.toUpperCase()}". Verifica el código o publica primero una donación.`
        );
      } else {
        setRastreo(resultado);
      }
    } catch {
      setErrorMsg('No fue posible consultar la trazabilidad del lote en este momento.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (codigoInicial) {
      void ejecutarConsulta(codigoInicial);
    }
  }, [codigoInicial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void ejecutarConsulta(codigoBusqueda);
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-xs">
      {/* Buscador de código de donación estilo Windows 98 */}
      <form
        onSubmit={handleSubmit}
        className="bevel-out bg-[#ece9d8] p-3 sm:p-4 flex flex-col gap-2.5 text-black"
      >
        <div className="border-b border-[#a0a0a0] pb-1 flex items-center justify-between">
          <label
            htmlFor="input-codigo-rastreo"
            className="retro-label !mb-0 flex items-center gap-1.5 text-black"
          >
            <Search className="w-3.5 h-3.5 text-[#000080]" />
            <span>Código de Trazabilidad del Lote (DON-XXX o OFFLINE-DON-...)</span>
          </label>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            Normativa Ley 1990 de 2019
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="input-codigo-rastreo"
            type="text"
            value={codigoBusqueda}
            onChange={(e) => setCodigoBusqueda(e.target.value)}
            placeholder="Ej. DON-101 o OFFLINE-DON-..."
            className="retro-field flex-1"
          />
          <button
            type="submit"
            disabled={cargando}
            className="btn-green text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {cargando ? (
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{cargando ? 'Buscando...' : 'Consultar Estado'}</span>
          </button>
        </div>

        {/* Accesos rápidos a lotes reales creados por los usuarios */}
        {codigosRecientes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-dashed border-[#b0b0b0]">
            <span className="text-gray-700 text-[11px] font-bold">Lotes registrados:</span>
            {codigosRecientes.map((cod) => (
              <button
                key={cod}
                type="button"
                onClick={() => {
                  setCodigoBusqueda(cod);
                  void ejecutarConsulta(cod);
                }}
                className="btn-98 !py-0.5 !px-2 text-[10px] font-bold text-[#000080]"
              >
                {cod}
              </button>
            ))}
          </div>
        )}
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="bevel-in bg-[#fff8e7] border border-amber-600 p-3 text-amber-950 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {rastreo ? (
        <TimelineTracker rastreo={rastreo} />
      ) : (
        !errorMsg && (
          <div className="bevel-out bg-[#ece9d8] p-6 text-center text-black space-y-2">
            <QrCode className="w-10 h-10 mx-auto text-[#000080]" aria-hidden="true" />
            <p className="font-bold text-sm text-black">
              Auditoría en Tiempo Real de Custodia y Rescate Alimentario
            </p>
            <p className="text-gray-700 max-w-lg mx-auto text-[11px] leading-relaxed">
              Ingresa el código del lote para inspeccionar los 3 hitos de custodia:
              publicación por el donante, retiro en campo por voluntario y acta digital firmada por el
              comedor receptor.
            </p>
          </div>
        )
      )}
    </div>
  );
}

/**
 * Vista de Rastreo y Trazabilidad de Donaciones (`/rastreo` — CMP-04 / TASK-13).
 */
export default function RastreoPage() {
  const { sesion } = useSession();
  const rol = sesion?.rol;

  const toolbarMenu = (
    <nav className="flex flex-wrap items-center justify-between gap-1.5 bg-[#ece9d8] px-3 py-1.5 border-b border-[#808080] font-mono text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href="/"
          className="btn-98 !py-0.5 !px-2 text-[11px] font-bold flex items-center gap-1 text-[#000080]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Volver a Mi Portal ({rol || 'Inicio'})</span>
        </Link>
        <Link
          href="/donaciones"
          className="btn-98 !py-0.5 !px-2 text-[11px] font-bold flex items-center gap-1"
        >
          <span>📱 Catálogo de Alimentos</span>
        </Link>
        {(rol === 'VOLUNTARIO' || rol === 'RECEPTOR' || rol === 'COORDINADOR' || rol === 'ADMIN') && (
          <Link
            href="/ruta-activa"
            className="btn-98 !py-0.5 !px-2 text-[11px] font-bold flex items-center gap-1"
          >
            <span>🚚 Ruta Activa</span>
          </Link>
        )}
      </div>

      <span className="text-[11px] text-gray-600 hidden sm:inline">
        Trazabilidad Digital Ley 1990 · Fundación Mesa Común
      </span>
    </nav>
  );

  return (
    <WindowFrame
      title="NEXO RESCATE — RASTREO Y TRAZABILIDAD DE CUSTODIA (LEY 1990 DE 2019)"
      icon={<QrCode className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />}
      menu={toolbarMenu}
      statusLeft="SCADA TRAZABILIDAD ACTIVA • 3 HITOS DE CUSTODIA • SANTIAGO DE CALI"
      statusRight={sesion ? `SESIÓN: ${sesion.rol} (${sesion.nombre})` : 'MODO CONSULTA PÚBLICA'}
    >
      <Suspense
        fallback={
          <div className="bevel-out bg-[#ece9d8] p-8 text-center font-mono text-xs text-black">
            Cargando módulo de rastreo y telemetría...
          </div>
        }
      >
        <RastreoContenido />
      </Suspense>
    </WindowFrame>
  );
}
