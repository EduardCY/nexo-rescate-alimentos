'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Compass, Truck, AlertCircle, ShieldCheck } from 'lucide-react';
import { RutaActivaCard, type MisionActiva } from '@/components/logistica/RutaActivaCard';
import {
  obtenerDonacionParaEntrega,
  obtenerMisionesAsignadasVoluntario,
} from '@/actions/entregas';
import { liberarDonacionAsignada } from '@/actions/donaciones';
import { useSession } from '@/lib/auth/session-context';

import WindowFrame from '@/components/nexo/WindowFrame';

function RutaActivaContenido() {
  const { sesion } = useSession();
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id') || '';
  const [mision, setMision] = useState<MisionActiva | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    async function cargarMision() {
      setCargando(true);
      try {
        let d = idParam ? await obtenerDonacionParaEntrega(idParam) : null;
        if (!d) {
          const asignadas = await obtenerMisionesAsignadasVoluntario(sesion?.userId);
          d = asignadas[0] || null;
        }

        if (activo && d) {
          setMision({
            id: d.id,
            codigo: d.codigo,
            tipoAlimento: d.tipoAlimento,
            cantidadEstimada: d.cantidadEstimada,
            unidadMedida: d.unidadMedida,
            donanteNombre: d.donanteNombre,
            direccionRecogida: d.direccionRecogida,
            indicacionesPuesto: d.indicacionesPuesto,
            telefonoDonante: d.telefonoDonante,
            requiereFrio: d.requiereFrio,
            horaLimite: d.horaLimite,
            comedorNombre: d.comedorNombre,
          });
        } else if (activo) {
          setMision(null);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }
    void cargarMision();
    return () => {
      activo = false;
    };
  }, [idParam, sesion?.userId]);

  if (cargando) {
    return (
      <div className="bevel-out bg-[#ece9d8] p-8 text-center font-mono text-xs text-black">
        Consultando misión activa asignada en despacho...
      </div>
    );
  }

  if (!mision) {
    return (
      <div className="bevel-out bg-[#ece9d8] p-6 text-center text-black font-mono text-xs space-y-3 max-w-md mx-auto my-4 border border-[#a0a0a0]">
        <AlertCircle className="w-10 h-10 text-[#000080] mx-auto" aria-hidden="true" />
        <h2 className="text-sm font-bold text-black uppercase">
          No Tienes Misiones Activas Asignadas
        </h2>
        <p className="text-gray-700 text-[11px] leading-relaxed">
          Explora el catálogo de excedentes disponibles en las plazas y comercios de Cali para aceptar
          y despachar un rescate de alimentos.
        </p>
        <Link
          href="/donaciones"
          className="btn-green text-xs font-bold inline-flex items-center gap-2"
        >
          <Compass className="w-4 h-4" aria-hidden="true" />
          <span>Explorar Catálogo de Alimentos &gt;</span>
        </Link>
      </div>
    );
  }

  const handleLiberarMision = async (id: string) => {
    if (
      !window.confirm(
        '¿Confirmas que deseas liberar esta misión por fuerza mayor o imprevisto en vía?\n\nEl lote volverá al catálogo para que otro rescatista o comedor lo recoja.'
      )
    ) {
      return;
    }
    setCargando(true);
    try {
      await liberarDonacionAsignada(id, 'Imprevisto en vía reportado desde Hoja de Ruta');
      setMision(null);
    } finally {
      setCargando(false);
    }
  };

  return (
    <section aria-label="Detalle de la misión de rescate asignada" className="space-y-3">
      <RutaActivaCard mision={mision} onLiberarMision={handleLiberarMision} />

      <footer className="bevel-in bg-[#f5f5f5] p-2.5 text-[11px] font-mono text-gray-700 flex items-center gap-2 border border-gray-400 max-w-2xl mx-auto">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
        <span>
          Rescate amparado bajo la Ley 1990 de 2019. Transporte seguro y trazabilidad de alimentos.
        </span>
      </footer>
    </section>
  );
}

/**
 * Vista de ruta activa en campo para el voluntario o comedor asignado (CMP-03 / TASK-18).
 */
export default function RutaActivaPage() {
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
        <Link
          href="/rastreo"
          className="btn-98 !py-0.5 !px-2 text-[11px] font-bold flex items-center gap-1"
        >
          <span>🔍 Rastrear Lote</span>
        </Link>
        {(rol === 'ADMIN' || rol === 'COORDINADOR') && (
          <Link
            href="/impacto"
            className="btn-98 !py-0.5 !px-2 text-[11px] font-bold flex items-center gap-1"
          >
            <span>📊 Impacto</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-950 font-bold bg-emerald-100 px-2 py-0.5 border border-emerald-600">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        <span>GPS / Despacho Activo</span>
      </div>
    </nav>
  );

  return (
    <WindowFrame
      title="NEXO LOGÍSTICA — HOJA DE RUTA ACTIVA DE TRANSPORTE"
      icon={<Truck className="w-4 h-4 text-amber-400 shrink-0" aria-hidden />}
      menu={toolbarMenu}
      statusLeft="SCADA LOGÍSTICA ACTIVA • NAVEGACIÓN GPS Y DESPACHO • SANTIAGO DE CALI"
      statusRight={sesion ? `OPERARIO: ${sesion.rol} (${sesion.nombre})` : 'MODO DESPACHO'}
    >
      <Suspense
        fallback={
          <div className="bevel-out bg-[#ece9d8] p-8 text-center font-mono text-xs text-black">
            Cargando hoja de ruta activa...
          </div>
        }
      >
        <RutaActivaContenido />
      </Suspense>
    </WindowFrame>
  );
}
