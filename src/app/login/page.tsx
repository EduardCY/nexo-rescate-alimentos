'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Store,
  Utensils,
  Truck,
  Compass,
  ShieldCheck,
  LogIn,
  UserPlus,
  Snowflake,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { RolUsuario, ZonaCali } from '@/types';
import {
  autenticarPorCorreoAction,
  registrarPostulacionPublicaAction,
} from '@/actions/usuarios-admin';
import { useSession } from '@/lib/auth/session-context';
import type { SesionUsuarioActiva } from '@/actions/organizaciones';

const ROLES_EVALUACION: Array<{
  rol: RolUsuario;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  capacidades: string[];
  icono: React.ReactNode;
  colorBadge: string;
  defaultEmail: string;
  defaultNombre: string;
}> = [
  {
    rol: 'DONANTE',
    titulo: 'Comercio Donante',
    subtitulo: 'Plazas de Mercado, Fruvers, Panaderías y Mayoristas',
    descripcion: 'Publica excedentes perecederos bajo la Ley 1990 de 2019 y gestiona sus certificados tributarios DIAN.',
    capacidades: [
      'Publicar excedentes perecederos (/donar)',
      'Ver y gestionar únicamente sus propios lotes',
      'Descargar actas y certificados tributarios (Art. 257 E.T.)',
      'Restricción: No ve lotes ajenos ni toma rescates ni registra comedores',
    ],
    icono: <Store className="w-5 h-5 text-emerald-700" />,
    colorBadge: 'bg-emerald-100 text-emerald-900 border-emerald-500',
    defaultEmail: 'donante@mesacomun.org',
    defaultNombre: 'Comercio Donante Certificado',
  },
  {
    rol: 'VOLUNTARIO',
    titulo: 'Voluntario de Rescate',
    subtitulo: 'Transporte de Alimentos en Moto, Carromoto o Vehículo',
    descripcion: 'Explora el catálogo de lotes disponibles por zonas de Cali, acepta rescates y ejecuta la ruta GPS.',
    capacidades: [
      'Visualizar catálogo de rescates DISPONIBLE (/donaciones)',
      'Tomar donaciones en tiempo real con bloqueo pesimista (CMP-03)',
      'Navegación GPS y trazabilidad en ruta activa (/ruta-activa)',
      'Restricción: No publica donaciones ni aprueba miembros ni ve impacto',
    ],
    icono: <Truck className="w-5 h-5 text-amber-700" />,
    colorBadge: 'bg-amber-100 text-amber-900 border-amber-500',
    defaultEmail: 'voluntario@mesacomun.org',
    defaultNombre: 'Voluntario Operativo Cali',
  },
  {
    rol: 'RECEPTOR',
    titulo: 'Comedor Comunitario / ONG',
    subtitulo: 'Ollas Comunitarias, Fundaciones y Hogares de Paso',
    descripcion: 'Gestiona la capacidad instalada y cadena de frío de su propia sede y firma actas de recepción.',
    capacidades: [
      'Gestionar la ficha de capacidad y refrigeración de su propio comedor',
      'Ver entregas asignadas en tránsito hacia su sede',
      'Firma y validación digital de acta de recepción física (CMP-04)',
      'Restricción: No crea otros comedores ni ejecuta matching global',
    ],
    icono: <Utensils className="w-5 h-5 text-sky-700" />,
    colorBadge: 'bg-sky-100 text-sky-900 border-sky-500',
    defaultEmail: 'comedor@mesacomun.org',
    defaultNombre: 'Comedor Comunitario Siloé Esperanza',
  },
  {
    rol: 'COORDINADOR',
    titulo: 'Coordinador Operativo (Torre de Control)',
    subtitulo: 'Mesa de Despacho Logístico — Fundación Mesa Común',
    descripcion: 'Torre de control: directorio de comedores, pre-asignación por cadena de frío, aprobación de miembros y métricas.',
    capacidades: [
      'Supervisión y asignación de lotes a comedores con frío compatible',
      'Directorio y gestión de comedores comunitarios en Cali',
      'Aprobación de postulaciones públicas en PENDIENTE_AUTORIZACION',
      'Auditoría de lotes expirados y exportación de reportes CSV (/impacto)',
    ],
    icono: <Compass className="w-5 h-5 text-purple-700" />,
    colorBadge: 'bg-purple-100 text-purple-900 border-purple-500',
    defaultEmail: 'coordinacion@mesacomun.org',
    defaultNombre: 'Marcela Ocampo (Coordinación Operativa)',
  },
  {
    rol: 'ADMIN',
    titulo: 'Administrador Corporativo',
    subtitulo: 'Gobernanza RBAC, Auditoría y Mantenimiento del Sistema',
    descripcion: 'Control absoluto del RBAC, bitácora inmutable de auditoría, gestión de usuarios y herramientas de purga.',
    capacidades: [
      'Gobernanza total de usuarios, roles y permisos (/admin/usuarios)',
      'Inspección de la bitácora inmutable de eventos (audit_rbac_eventos)',
      'Suspensión, reactivación y control de cuentas corporativas',
      'Herramienta de Purga Total del Sistema y limpieza cartográfica',
    ],
    icono: <ShieldCheck className="w-5 h-5 text-red-700" />,
    colorBadge: 'bg-red-100 text-red-900 border-red-500',
    defaultEmail: 'admin@nexorescate.org',
    defaultNombre: 'Administrador Corporativo Nexo',
  },
];

const ROLES_PUBLICOS: Array<{ rol: RolUsuario; titulo: string; descripcion: string }> = [
  {
    rol: 'VOLUNTARIO',
    titulo: 'Voluntario / Rescatista de Alimentos',
    descripcion: 'Deseo transportar excedentes desde los donantes hasta los comedores comunitarios.',
  },
  {
    rol: 'DONANTE',
    titulo: 'Comercio o Empresa Donante',
    descripcion: 'Tengo un puesto en galería, restaurante, fruver o empresa con excedentes aptos para consumo.',
  },
  {
    rol: 'RECEPTOR',
    titulo: 'Comedor Comunitario / Entidad Beneficiaria',
    descripcion: 'Opero una olla comunitaria, comedor infantil o fundación que atiende población vulnerable.',
  },
];

const ZONAS_CALI: ZonaCali[] = ['CENTRO', 'NORTE', 'SUR', 'ORIENTE', 'LADERA'];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sesion, establecerSesion } = useSession();

  const [pestana, setPestana] = useState<'sandbox' | 'login' | 'postulacion'>('sandbox');
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [estadoPendienteVisible, setEstadoPendienteVisible] = useState(false);

  // Campos de inicio de sesión
  const [emailLogin, setEmailLogin] = useState('');

  // Campos de postulación pública
  const [rolPostulacion, setRolPostulacion] = useState<RolUsuario>('VOLUNTARIO');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState<ZonaCali>('CENTRO');
  const [vehiculoTipo, setVehiculoTipo] = useState<'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE'>('MOTO');
  const [organizacionNombre, setOrganizacionNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tieneRefrigeracion, setTieneRefrigeracion] = useState(false);
  const [capacidadRacionesDia, setCapacidadRacionesDia] = useState('');

  useEffect(() => {
    const estadoParam = searchParams.get('estado');
    if (estadoParam === 'pendiente') {
      setEstadoPendienteVisible(true);
      setPestana('login');
    }
  }, [searchParams]);

  // Manejo de acceso por tarjeta de evaluación (Sandbox de 5 roles)
  const handleEntrarRolEvaluacion = async (config: typeof ROLES_EVALUACION[0]) => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const DEMO_UUIDS: Record<RolUsuario, string> = {
        ADMIN: '00000000-0000-4000-8000-000000000001',
        COORDINADOR: '00000000-0000-4000-8000-000000000002',
        DONANTE: '00000000-0000-4000-8000-000000000003',
        VOLUNTARIO: '00000000-0000-4000-8000-000000000004',
        RECEPTOR: '00000000-0000-4000-8000-000000000005',
      };
      const demoId = DEMO_UUIDS[config.rol];
      const sesionDemo: SesionUsuarioActiva = {
        id: demoId,
        userId: demoId,
        nombre: config.defaultNombre,
        email: config.defaultEmail,
        rol: config.rol,
        telefono: '+573150001122',
        zona: 'CENTRO',
        estadoCuenta: 'ACTIVO',
        vehiculoTipo: config.rol === 'VOLUNTARIO' ? 'CARROMOTO' : undefined,
        tieneRefrigeracion: config.rol === 'RECEPTOR',
        capacidadRacionesDia: config.rol === 'RECEPTOR' ? 250 : undefined,
        organizacionNombre:
          config.rol === 'DONANTE'
            ? 'Galería Santa Elena - Puesto 45'
            : config.rol === 'RECEPTOR'
            ? 'Comedor Comunitario Siloé Esperanza'
            : undefined,
      };

      await establecerSesion(sesionDemo);
      if (typeof window !== 'undefined') {
        window.location.assign('/');
      } else {
        router.push('/');
      }
    } catch {
      setErrorMsg('No fue posible inicializar la sesión del rol seleccionado.');
    } finally {
      setCargando(false);
    }
  };

  // Manejo de inicio de sesión con correo registrado
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || cargando) return;
    setCargando(true);
    setErrorMsg(null);
    setEstadoPendienteVisible(false);

    try {
      const res = await autenticarPorCorreoAction(emailLogin.trim());
      if (!res.exito) {
        setErrorMsg(res.mensaje);
        return;
      }

      const u = res.usuario;
      if (u.estadoCuenta === 'PENDIENTE_AUTORIZACION') {
        setEstadoPendienteVisible(true);
        return;
      }

      if (u.estadoCuenta === 'SUSPENDIDO') {
        setErrorMsg('Esta cuenta ha sido SUSPENDIDA por la administración corporativa (CA-05.2).');
        return;
      }

      const sesionActiva: SesionUsuarioActiva = {
        id: u.id,
        userId: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        telefono: u.telefono,
        zona: 'CENTRO',
        estadoCuenta: u.estadoCuenta,
        vehiculoTipo: u.vehiculoTipo,
        organizacionId: u.organizacionId,
      };

      await establecerSesion(sesionActiva);
      if (typeof window !== 'undefined') {
        window.location.assign('/');
      } else {
        router.push('/');
      }
    } catch {
      setErrorMsg('Error de conexión al verificar credenciales.');
    } finally {
      setCargando(false);
    }
  };

  // Manejo de postulación pública externa (VOLUNTARIO, DONANTE, RECEPTOR)
  const handlePostulacionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    setErrorMsg(null);
    setMensajeExito(null);

    try {
      const res = await registrarPostulacionPublicaAction({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        zona,
        rol: rolPostulacion,
        vehiculoTipo: rolPostulacion === 'VOLUNTARIO' ? vehiculoTipo : undefined,
        organizacionNombre:
          rolPostulacion === 'DONANTE' || rolPostulacion === 'RECEPTOR'
            ? organizacionNombre.trim()
            : undefined,
        direccion:
          rolPostulacion === 'DONANTE' || rolPostulacion === 'RECEPTOR'
            ? direccion.trim()
            : undefined,
        tieneRefrigeracion: rolPostulacion === 'RECEPTOR' ? tieneRefrigeracion : undefined,
        capacidadRacionesDia:
          rolPostulacion === 'RECEPTOR' && capacidadRacionesDia
            ? Number(capacidadRacionesDia)
            : undefined,
      });

      if (!res.exito) {
        setErrorMsg(res.error);
        return;
      }

      setMensajeExito(res.mensaje);
      setEstadoPendienteVisible(true);
      // Limpiar formulario
      setNombre('');
      setEmail('');
      setTelefono('');
      setOrganizacionNombre('');
      setDireccion('');
      setCapacidadRacionesDia('');
    } catch {
      setErrorMsg('No fue posible procesar la postulación.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#090d16] p-2 sm:p-4 lg:p-6 flex items-center justify-center text-black">
      <div className="bevel-out w-full max-w-5xl bg-[#d4d0c8] p-[3px] shadow-[8px_8px_0_rgba(0,0,0,0.65)]">
        {/* Barra de Título Corporativa */}
        <header className="titlebar flex items-center justify-between gap-2 px-3 py-1.5 text-white">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-emerald-400 text-black font-extrabold text-[11px] flex items-center justify-center">
              ■
            </span>
            <h1 className="font-mono text-xs sm:text-sm font-bold tracking-wide">
              NEXO RESCATE DE ALIMENTOS — PORTAL CORPORATIVO (FUNDACIÓN MESA COMÚN, CALI)
            </h1>
          </div>
          {sesion && (
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono font-bold text-[#000080]"
            >
              Ir al Tablero ({sesion.rol}) &gt;
            </button>
          )}
        </header>

        {/* Pestañas de Navegación del Portal */}
        <nav className="flex flex-wrap items-center justify-between gap-2 bg-[#ece9d8] px-3 py-2 border-b border-[#808080] font-mono text-xs">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPestana('sandbox');
                setErrorMsg(null);
                setEstadoPendienteVisible(false);
              }}
              className={`min-h-[40px] px-3 py-1 font-bold flex items-center gap-1.5 ${
                pestana === 'sandbox' ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>1. Explorar los 5 Roles (Auditoría en 1 Clic)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana('login');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] px-3 py-1 font-bold flex items-center gap-1.5 ${
                pestana === 'login' ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>2. Iniciar Sesión Registrada</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPestana('postulacion');
                setErrorMsg(null);
                setEstadoPendienteVisible(false);
              }}
              className={`min-h-[40px] px-3 py-1 font-bold flex items-center gap-1.5 ${
                pestana === 'postulacion' ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>3. Postulación Pública de Miembros</span>
            </button>
          </div>
          <span className="text-[11px] text-gray-600 hidden sm:inline">
            Normativa Ley 1990 de 2019 · EatCloud Architecture
          </span>
        </nav>

        {/* Panel de Alertas Globales */}
        {errorMsg && (
          <div className="m-3 p-2.5 bg-red-100 border-2 border-red-600 text-red-900 font-mono text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {mensajeExito && (
          <div className="m-3 p-2.5 bg-emerald-100 border-2 border-emerald-600 text-emerald-950 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-700" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* PESTAÑA 1: SANDBOX DE EVALUACIÓN DE LOS 5 ROLES */}
        {pestana === 'sandbox' && (
          <div className="p-3 sm:p-4 space-y-4 font-mono text-xs">
            <div className="bg-[#ffffd8] border border-[#d0c060] p-3 text-[11px] leading-relaxed">
              <p className="font-bold text-[#604000] mb-1">
                ℹ️ SANDBOX CORPORATIVO DE EVALUACIÓN Y AUDITORÍA DE ROLES:
              </p>
              <p>
                Como usuario evaluador o auditor, puedes ingresar en un clic a cualquiera de los{' '}
                <strong>5 roles del ecosistema</strong> para auditar sus vistas, capacidades y
                restricciones estrictas según la normativa colombiana de rescate de alimentos. Para
                cambiar de rol, haz clic en <strong>&quot;Cerrar Sesión / Cambiar Rol&quot;</strong> en la
                barra superior.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ROLES_EVALUACION.map((c) => (
                <div
                  key={c.rol}
                  className="bevel-out bg-[#ece9d8] p-3 flex flex-col justify-between gap-3 hover:bg-[#f5f3e9] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1 border-b border-[#a0a0a0] pb-1.5">
                      <div className="flex items-center gap-2">
                        {c.icono}
                        <h2 className="font-bold text-xs text-black">{c.titulo}</h2>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${c.colorBadge}`}>
                        {c.rol}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-700 font-semibold">{c.subtitulo}</p>
                    <p className="text-[11px] text-gray-600 leading-snug">{c.descripcion}</p>
                    <div className="pt-2 border-t border-dashed border-[#b0b0b0] space-y-1">
                      <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">
                        Capacidades y Restricciones:
                      </p>
                      <ul className="list-disc pl-3.5 space-y-0.5 text-[10px] text-gray-700">
                        {c.capacidades.map((cap, i) => (
                          <li
                            key={i}
                            className={cap.startsWith('Restricción') ? 'text-red-700 font-medium' : ''}
                          >
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={cargando}
                    onClick={() => handleEntrarRolEvaluacion(c)}
                    className="btn-98 w-full py-1.5 font-bold text-xs text-[#000080] flex items-center justify-center gap-2 hover:bg-[#000080] hover:text-white"
                  >
                    <span>Entrar como {c.rol} &gt;</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: INICIAR SESIÓN CON CORREO REGISTRADO */}
        {pestana === 'login' && (
          <div className="p-4 sm:p-6 space-y-4 font-mono text-xs max-w-xl mx-auto">
            {estadoPendienteVisible ? (
              <div className="bevel-out bg-[#fff8e7] border-2 border-amber-600 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Clock className="w-5 h-5 text-amber-700 animate-spin" />
                  <span>CUENTA EN REVISIÓN (PENDIENTE_AUTORIZACION)</span>
                </div>
                <p className="text-xs text-gray-800 leading-relaxed">
                  Tu postulación se encuentra registrada y en espera de validación por parte de la{' '}
                  <strong>Coordinación Operativa de la Fundación Mesa Común</strong>.
                </p>
                <div className="bg-white p-3 border border-amber-300 text-[11px] space-y-1.5 text-gray-700">
                  <p className="font-bold text-gray-900">¿Por qué este proceso es obligatorio?</p>
                  <p>
                    Bajo la <strong>Ley 1990 de 2019</strong> y la <strong>Resolución 2674 INVIMA</strong>,
                    los rescatistas y beneficiarios deben ser verificados en identidad, vehículo y capacidad
                    sanitaria antes de recibir acceso a los lotes de alimentos perecederos.
                  </p>
                  <p className="text-[#000080] font-semibold pt-1">
                    👉 Un Coordinador u Administrador puede activar tu cuenta desde su mesa de despacho.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEstadoPendienteVisible(false);
                    setPestana('sandbox');
                  }}
                  className="btn-98 w-full py-1.5 font-bold text-xs text-[#000080]"
                >
                  Entrar mediante Sandbox de Evaluación
                </button>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="bevel-out bg-[#ece9d8] p-4 space-y-4">
                <div>
                  <h2 className="font-bold text-sm text-black mb-1">
                    Acceso Corporativo por Correo Electrónico
                  </h2>
                  <p className="text-gray-600 text-[11px]">
                    Ingresa con tu correo corporativo registrado en Fundación Mesa Común.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-gray-800">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    value={emailLogin}
                    onChange={(e) => setEmailLogin(e.target.value)}
                    placeholder="ej. coordinacion@mesacomun.org"
                    className="bevel-in w-full px-2 py-1.5 bg-white font-mono text-xs text-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="btn-98 w-full py-2 font-bold text-xs text-[#000080] flex items-center justify-center gap-2 hover:bg-[#000080] hover:text-white"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{cargando ? 'Verificando cuenta...' : 'Ingresar al Tablero Operativo'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* PESTAÑA 3: POSTULACIÓN PÚBLICA DE MIEMBROS */}
        {pestana === 'postulacion' && (
          <form
            onSubmit={handlePostulacionSubmit}
            className="p-3 sm:p-5 space-y-4 font-mono text-xs max-w-2xl mx-auto"
          >
            <div className="bg-[#e8f4fc] border border-[#6090d0] p-3 text-[11px] leading-relaxed">
              <p className="font-bold text-[#003080] mb-1">
                📝 FORMULARIO DE POSTULACIÓN PÚBLICA (VOLUNTARIOS, DONANTES Y COMEDORES):
              </p>
              <p>
                Al registrarte, tu cuenta ingresará en estado <strong>PENDIENTE_AUTORIZACION</strong>. Un
                Coordinador logístico o Administrador validará tus datos para garantizar la inocuidad
                alimentaria y seguridad de la red.
              </p>
            </div>

            {/* Selector de Rol Público */}
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-900">Selecciona el tipo de vinculación:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ROLES_PUBLICOS.map((rp) => (
                  <button
                    key={rp.rol}
                    type="button"
                    onClick={() => setRolPostulacion(rp.rol)}
                    className={`p-2.5 text-left border ${
                      rolPostulacion === rp.rol
                        ? 'bg-[#000080] text-white border-black bevel-in'
                        : 'bg-[#ece9d8] text-black border-[#808080] btn-98'
                    }`}
                  >
                    <p className="font-bold text-xs">{rp.titulo}</p>
                    <p className="text-[10px] mt-1 opacity-90 leading-tight">{rp.descripcion}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Datos Personales */}
            <div className="bevel-out bg-[#ece9d8] p-3 space-y-3">
              <p className="font-bold text-black border-b border-[#a0a0a0] pb-1">
                1. Datos del Solicitante
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold">Nombre Completo:</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="ej. Juan Carlos Pérez"
                    className="bevel-in w-full px-2 py-1 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. juan.perez@correo.com"
                    className="bevel-in w-full px-2 py-1 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold">Teléfono de Contacto (Cali):</label>
                  <input
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+57 315 000 0000"
                    className="bevel-in w-full px-2 py-1 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold">Zona de Cobertura en Cali:</label>
                  <select
                    value={zona}
                    onChange={(e) => setZona(e.target.value as ZonaCali)}
                    className="bevel-in w-full px-2 py-1 bg-white"
                  >
                    {ZONAS_CALI.map((z) => (
                      <option key={z} value={z}>
                        Zona {z}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Datos Específicos según Rol */}
            {rolPostulacion === 'VOLUNTARIO' && (
              <div className="bevel-out bg-[#ece9d8] p-3 space-y-2">
                <p className="font-bold text-black border-b border-[#a0a0a0] pb-1">
                  2. Medio de Transporte para Rescate
                </p>
                <div className="space-y-1">
                  <label className="block font-bold">Vehículo o Medio de Desplazamiento:</label>
                  <select
                    value={vehiculoTipo}
                    onChange={(e) => setVehiculoTipo(e.target.value as any)}
                    className="bevel-in w-full px-2 py-1 bg-white"
                  >
                    <option value="MOTO">Motocicleta (Capacidad recomendada hasta 30 kg)</option>
                    <option value="CARROMOTO">Carromoto / Motocarguero (Hasta 150 kg)</option>
                    <option value="CARRO">Automóvil o Camioneta</option>
                    <option value="BICICLETA">Bicicleta de Carga / Morral Térmico</option>
                    <option value="A_PIE">A Pie / Zona de Barrio Cercana</option>
                  </select>
                </div>
              </div>
            )}

            {(rolPostulacion === 'DONANTE' || rolPostulacion === 'RECEPTOR') && (
              <div className="bevel-out bg-[#ece9d8] p-3 space-y-3">
                <p className="font-bold text-black border-b border-[#a0a0a0] pb-1">
                  2. Datos de la Organización ({rolPostulacion === 'DONANTE' ? 'Comercio Donante' : 'Comedor Beneficiario'})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold">Nombre del Establecimiento:</label>
                    <input
                      type="text"
                      required
                      value={organizacionNombre}
                      onChange={(e) => setOrganizacionNombre(e.target.value)}
                      placeholder={
                        rolPostulacion === 'DONANTE'
                          ? 'ej. Puesto 45 Galería Santa Elena'
                          : 'ej. Comedor San Antonio Siloé'
                      }
                      className="bevel-in w-full px-2 py-1 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold">Dirección en Cali:</label>
                    <input
                      type="text"
                      required
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="ej. Calle 25 con Carrera 29"
                      className="bevel-in w-full px-2 py-1 bg-white"
                    />
                  </div>
                </div>

                {rolPostulacion === 'RECEPTOR' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="block font-bold">Capacidad de Raciones Diarias:</label>
                      <input
                        type="number"
                        min="1"
                        value={capacidadRacionesDia}
                        onChange={(e) => setCapacidadRacionesDia(e.target.value)}
                        placeholder="ej. 200"
                        className="bevel-in w-full px-2 py-1 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="checkRefri"
                        checked={tieneRefrigeracion}
                        onChange={(e) => setTieneRefrigeracion(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="checkRefri" className="font-bold flex items-center gap-1 cursor-pointer">
                        <Snowflake className="w-4 h-4 text-sky-700" />
                        <span>Cuenta con refrigeración o congelación</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="btn-98 w-full py-2.5 font-bold text-xs text-[#000080] flex items-center justify-center gap-2 hover:bg-[#000080] hover:text-white"
            >
              <UserPlus className="w-4 h-4" />
              <span>{cargando ? 'Enviando postulación...' : 'Enviar Solicitud de Postulación'}</span>
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center font-mono text-white text-xs">
          Cargando Portal de Acceso Corporativo...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
