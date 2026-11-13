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
  KeyRound,
  QrCode,
  Eye,
  EyeOff,
  ArrowLeft,
  Smartphone,
} from 'lucide-react';
import type { RolUsuario, ZonaCali } from '@/types';
import {
  autenticarPorCorreoAction,
  validarCredencialesPaso1Action,
  completarEnrolamiento2FAAction,
  verificarPaso2TOTPAction,
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
  const enable2FA = process.env.NEXT_PUBLIC_ENABLE_2FA !== 'false';
  const sandboxHabilitado = process.env.NEXT_PUBLIC_ENABLE_DEMO_SANDBOX === 'true';

  const [pestana, setPestana] = useState<'sandbox' | 'login' | 'postulacion'>(
    sandboxHabilitado ? 'sandbox' : 'login'
  );
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [estadoPendienteVisible, setEstadoPendienteVisible] = useState(false);

  // Estados para inicio de sesión en 2 pasos (Contraseña + Google Authenticator TOTP)
  const [pasoLogin, setPasoLogin] = useState<1 | 2>(1);
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [mostrarPasswordLogin, setMostrarPasswordLogin] = useState(false);
  const [userIdPendiente, setUserIdPendiente] = useState<string | null>(null);
  const [tempAuthToken, setTempAuthToken] = useState<string | null>(null);
  const [requiereSetup2FA, setRequiereSetup2FA] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secretManual, setSecretManual] = useState<string | null>(null);
  const [codigoTotp, setCodigoTotp] = useState('');
  const [segundosRestantesTotp, setSegundosRestantesTotp] = useState(30);

  // Estados para postulación pública con contraseña
  const [rolPostulacion, setRolPostulacion] = useState<RolUsuario>('VOLUNTARIO');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [passwordPostulacion, setPasswordPostulacion] = useState('');
  const [confirmPasswordPostulacion, setConfirmPasswordPostulacion] = useState('');
  const [mostrarPasswordPostulacion, setMostrarPasswordPostulacion] = useState(false);
  const [zona, setZona] = useState<ZonaCali>('CENTRO');
  const [vehiculoTipo, setVehiculoTipo] = useState<'MOTO' | 'CARROMOTO' | 'CARRO' | 'BICICLETA' | 'A_PIE'>('MOTO');
  const [organizacionNombre, setOrganizacionNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tieneRefrigeracion, setTieneRefrigeracion] = useState(false);
  const [capacidadRacionesDia, setCapacidadRacionesDia] = useState('');

  // Contador regresivo visual del ciclo TOTP (30s)
  useEffect(() => {
    const calcularRestante = () => {
      const seg = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSegundosRestantesTotp(seg === 0 ? 30 : seg);
    };
    calcularRestante();
    const timer = setInterval(calcularRestante, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Paso 1 de Login: Validar Correo Electrónico y Contraseña Corporativa
  const handleLoginPaso1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || !passwordLogin || cargando) return;
    setCargando(true);
    setErrorMsg(null);
    setEstadoPendienteVisible(false);

    try {
      const res = await validarCredencialesPaso1Action(emailLogin.trim(), passwordLogin);
      if (!res.exito) {
        if (res.estadoCuenta === 'PENDIENTE_AUTORIZACION') {
          setEstadoPendienteVisible(true);
          return;
        }
        setErrorMsg(res.mensaje);
        return;
      }

      // Si 2FA está desactivado temporalmente para pruebas (bypass2FA)
      if (res.bypass2FA) {
        await establecerSesion(res.sesion);
        const rutaDestino =
          res.sesion.rol === 'VOLUNTARIO'
            ? '/ruta-activa'
            : res.sesion.rol === 'DONANTE'
            ? '/donar'
            : res.sesion.rol === 'RECEPTOR'
            ? '/donaciones'
            : '/';
        router.push(rutaDestino);
        return;
      }

      setUserIdPendiente(res.userId);
      setTempAuthToken(res.tempAuthToken);
      if (res.requiereSetup2FA) {
        setRequiereSetup2FA(true);
        setQrDataUrl(res.qrDataUrl);
        setSecretManual(res.secret);
      } else {
        setRequiereSetup2FA(false);
        setQrDataUrl(null);
        setSecretManual(null);
      }
      setCodigoTotp('');
      setPasoLogin(2);
    } catch {
      setErrorMsg('Error de conexión al verificar credenciales.');
    } finally {
      setCargando(false);
    }
  };

  // Paso 2 de Login: Verificar Token TOTP (Enrolamiento o Verificación Recurrente)
  const handleVerificarTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenLimpio = codigoTotp.replace(/\D/g, '');
    if (tokenLimpio.length !== 6 || cargando || !userIdPendiente || !tempAuthToken) {
      setErrorMsg('Ingresa los 6 dígitos del código de Google Authenticator.');
      return;
    }

    setCargando(true);
    setErrorMsg(null);

    try {
      let res: { exito: true; sesion: SesionUsuarioActiva } | { exito: false; mensaje: string };
      if (requiereSetup2FA) {
        if (!secretManual) {
          setErrorMsg('Error interno en la configuración de la clave secreta.');
          return;
        }
        res = await completarEnrolamiento2FAAction({
          userId: userIdPendiente,
          tempAuthToken,
          tokenTotp: tokenLimpio,
          secret: secretManual,
        });
      } else {
        res = await verificarPaso2TOTPAction({
          userId: userIdPendiente,
          tempAuthToken,
          tokenTotp: tokenLimpio,
        });
      }

      if (!res.exito) {
        setErrorMsg(res.mensaje);
        return;
      }

      await establecerSesion(res.sesion);
      if (typeof window !== 'undefined') {
        window.location.assign('/');
      } else {
        router.push('/');
      }
    } catch {
      setErrorMsg('Error de conexión al verificar el código de seguridad.');
    } finally {
      setCargando(false);
    }
  };

  const handleVolverPaso1 = () => {
    setPasoLogin(1);
    setPasswordLogin('');
    setUserIdPendiente(null);
    setTempAuthToken(null);
    setQrDataUrl(null);
    setSecretManual(null);
    setCodigoTotp('');
    setErrorMsg(null);
  };

  // Manejo de postulación pública externa (VOLUNTARIO, DONANTE, RECEPTOR)
  const handlePostulacionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;

    if (passwordPostulacion.length < 8) {
      setErrorMsg('La contraseña corporativa debe tener al menos 8 caracteres.');
      return;
    }
    if (passwordPostulacion !== confirmPasswordPostulacion) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

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
        password: passwordPostulacion,
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
      setPasswordPostulacion('');
      setConfirmPasswordPostulacion('');
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
            {sandboxHabilitado && (
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
                <span>Explorar los 5 Roles (Entorno Local)</span>
              </button>
            )}
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
              <span>Iniciar Sesión Registrada</span>
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
              <span>Postulación Pública de Miembros</span>
            </button>
          </div>
          <span className="text-[11px] text-gray-600 hidden sm:inline">
            Normativa Ley 1990 de 2019 · Fundación Mesa Común
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

        {/* PESTAÑA 1: SANDBOX DE EVALUACIÓN DE LOS 5 ROLES (SOLO SI ESTÁ HABILITADO EN LOCAL) */}
        {sandboxHabilitado && pestana === 'sandbox' && (
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
                {sandboxHabilitado && (
                  <button
                    type="button"
                    onClick={() => {
                      setEstadoPendienteVisible(false);
                      setPestana('sandbox');
                    }}
                    className="btn-98 w-full py-1.5 font-bold text-xs text-[#000080]"
                  >
                    Volver a exploración de roles
                  </button>
                )}
              </div>
            ) : pasoLogin === 1 ? (
              <div className="space-y-4">
                {sandboxHabilitado && (
                  <div className="bg-[#f0f4f8] border border-[#7090b0] p-3 text-[11px] leading-relaxed">
                    <p className="font-bold text-[#002060] mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#000080]" />
                      <span>Cuentas Corporativas de Entorno Local:</span>
                    </p>
                    <p className="text-gray-700 mb-2">
                      Contraseña de entorno local:{' '}
                      <code className="bg-white px-1.5 py-0.5 border border-gray-400 font-bold font-mono text-[#000080]">
                        Nexo2026*!
                      </code>{' '}
                      <span className="text-gray-500 text-[10px]">
                        (En tu primer inicio escanearás el QR en Google Authenticator)
                      </span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailLogin('coordinacion@mesacomun.org');
                          setPasswordLogin('Nexo2026*!');
                        }}
                        className="text-left bg-white border border-gray-300 p-1 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span><strong>Coord:</strong> coordinacion@mesacomun.org</span>
                        <span className="text-[#000080] font-bold">Llenar &gt;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailLogin('admin@nexorescate.org');
                          setPasswordLogin('Nexo2026*!');
                        }}
                        className="text-left bg-white border border-gray-300 p-1 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span><strong>Admin:</strong> admin@nexorescate.org</span>
                        <span className="text-[#000080] font-bold">Llenar &gt;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailLogin('donante@mesacomun.org');
                          setPasswordLogin('Nexo2026*!');
                        }}
                        className="text-left bg-white border border-gray-300 p-1 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span><strong>Donante:</strong> donante@mesacomun.org</span>
                        <span className="text-[#000080] font-bold">Llenar &gt;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailLogin('voluntario@mesacomun.org');
                          setPasswordLogin('Nexo2026*!');
                        }}
                        className="text-left bg-white border border-gray-300 p-1 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span><strong>Voluntario:</strong> voluntario@mesacomun.org</span>
                        <span className="text-[#000080] font-bold">Llenar &gt;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailLogin('comedor@mesacomun.org');
                          setPasswordLogin('Nexo2026*!');
                        }}
                        className="text-left bg-white border border-gray-300 p-1 hover:bg-gray-100 flex items-center justify-between sm:col-span-2"
                      >
                        <span><strong>Comedor:</strong> comedor@mesacomun.org</span>
                        <span className="text-[#000080] font-bold">Llenar &gt;</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Formulario Paso 1: Correo + Contraseña */}
                <form onSubmit={handleLoginPaso1Submit} className="bevel-out bg-[#ece9d8] p-4 space-y-4">
                  <div className="border-b border-[#a0a0a0] pb-2">
                    <h2 className="font-bold text-sm text-black flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#000080]" />
                      <span>Paso 1 de 2: Credenciales de Acceso Corporativo</span>
                    </h2>
                    <p className="text-gray-600 text-[11px] mt-0.5">
                      Ingresa tu correo institucional y contraseña registrada.
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

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-800">Contraseña:</label>
                      <button
                        type="button"
                        onClick={() => setMostrarPasswordLogin(!mostrarPasswordLogin)}
                        className="text-[10px] text-gray-600 hover:text-black flex items-center gap-1"
                      >
                        {mostrarPasswordLogin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{mostrarPasswordLogin ? 'Ocultar' : 'Mostrar'}</span>
                      </button>
                    </div>
                    <input
                      type={mostrarPasswordLogin ? 'text' : 'password'}
                      required
                      value={passwordLogin}
                      onChange={(e) => setPasswordLogin(e.target.value)}
                      placeholder="••••••••"
                      className="bevel-in w-full px-2 py-1.5 bg-white font-mono text-xs text-black"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={cargando}
                    className="btn-98 w-full py-2 font-bold text-xs text-[#000080] flex items-center justify-center gap-2 hover:bg-[#000080] hover:text-white"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {cargando
                        ? 'Verificando credenciales...'
                        : enable2FA
                        ? 'Continuar a Verificación 2FA >'
                        : 'Ingresar al Sistema >'}
                    </span>
                  </button>
                </form>
              </div>
            ) : (
              /* Paso 2: Código TOTP de Google Authenticator */
              <div className="space-y-4">
                <form onSubmit={handleVerificarTotpSubmit} className="bevel-out bg-[#ece9d8] p-4 space-y-4">
                  <div className="border-b border-[#a0a0a0] pb-2 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-sm text-black flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-700" />
                        <span>
                          {requiereSetup2FA
                            ? 'Paso 2 de 2: Enrolamiento de Google Authenticator'
                            : 'Paso 2 de 2: Verificación de Seguridad (2FA)'}
                        </span>
                      </h2>
                      <p className="text-gray-600 text-[11px] mt-0.5">
                        Cuenta: <strong>{emailLogin}</strong>
                      </p>
                    </div>
                    {!requiereSetup2FA && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-500 rounded text-[10px] font-bold">
                        ⏳ {segundosRestantesTotp}s
                      </span>
                    )}
                  </div>

                  {requiereSetup2FA ? (
                    /* Pantalla de Enrolamiento Inicial con QR y Clave Manual */
                    <div className="space-y-3">
                      <div className="bg-[#ffffd8] border border-[#d0c060] p-2.5 text-[11px] leading-relaxed text-gray-800">
                        <p className="font-bold text-[#604000] mb-0.5">
                          🛡️ PRIMER INICIO DE SESIÓN — VINCULACIÓN OBLIGATORIA:
                        </p>
                        <p>
                          Abre <strong>Google Authenticator</strong> en tu teléfono móvil, pulsa{' '}
                          <strong>&quot;+&quot;</strong> y escanea el código QR que se muestra abajo:
                        </p>
                      </div>

                      {qrDataUrl && (
                        <div className="bg-white p-3 border-2 border-[#808080] text-center space-y-2">
                          <img
                            src={qrDataUrl}
                            alt="Código QR para Google Authenticator"
                            className="w-44 h-44 mx-auto border border-gray-300"
                          />
                          <p className="text-[10px] text-gray-500">¿No puedes escanear el QR? Ingresa manualmente:</p>
                          <div className="bg-gray-100 p-1.5 border border-gray-400 font-mono text-center font-bold tracking-widest text-[#000080] select-all text-xs break-all">
                            {secretManual}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1 text-center">
                        <label className="block font-bold text-gray-800 text-xs">
                          Ingresa el código de 6 dígitos generado en Google Authenticator:
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          value={codigoTotp}
                          onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="w-48 mx-auto text-center font-mono font-bold text-2xl tracking-[0.35em] py-2 bg-white bevel-in block border border-gray-400 text-black"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Pantalla de Verificación Recurrente */
                    <div className="space-y-3">
                      <p className="text-gray-700 text-xs">
                        Ingresa el código temporal de 6 dígitos que muestra la aplicación{' '}
                        <strong>Google Authenticator</strong> en tu dispositivo:
                      </p>

                      <div className="space-y-1 text-center py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          autoFocus
                          value={codigoTotp}
                          onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="w-48 mx-auto text-center font-mono font-bold text-2xl tracking-[0.35em] py-2 bg-white bevel-in block border border-gray-400 text-black"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={cargando || codigoTotp.length !== 6}
                      className="btn-98 w-full py-2 font-bold text-xs text-[#000080] flex items-center justify-center gap-2 hover:bg-[#000080] hover:text-white disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>
                        {cargando
                          ? 'Validando token...'
                          : requiereSetup2FA
                          ? 'Verificar Código y Activar 2FA'
                          : 'Verificar e Ingresar al Tablero'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVolverPaso1}
                      disabled={cargando}
                      className="btn-98 w-full py-1 text-xs text-gray-700 flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver al Paso 1 (Cambiar Correo o Contraseña)</span>
                    </button>
                  </div>
                </form>
              </div>
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

            {/* Credenciales de Acceso */}
            <div className="bevel-out bg-[#ece9d8] p-3 space-y-3">
              <div className="flex items-center justify-between border-b border-[#a0a0a0] pb-1">
                <p className="font-bold text-black flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#000080]" />
                  <span>2. Credenciales de Acceso (Contraseña + 2FA)</span>
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarPasswordPostulacion(!mostrarPasswordPostulacion)}
                  className="text-[10px] text-gray-600 hover:text-black flex items-center gap-1"
                >
                  {mostrarPasswordPostulacion ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{mostrarPasswordPostulacion ? 'Ocultar' : 'Mostrar'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold">Contraseña (Mínimo 8 caracteres):</label>
                  <input
                    type={mostrarPasswordPostulacion ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={passwordPostulacion}
                    onChange={(e) => setPasswordPostulacion(e.target.value)}
                    placeholder="••••••••"
                    className="bevel-in w-full px-2 py-1 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold">Confirmar Contraseña:</label>
                  <input
                    type={mostrarPasswordPostulacion ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPasswordPostulacion}
                    onChange={(e) => setConfirmPasswordPostulacion(e.target.value)}
                    placeholder="••••••••"
                    className="bevel-in w-full px-2 py-1 bg-white"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500">
                🔒 Esta contraseña protegerá tu acceso junto con Google Authenticator una vez tu solicitud sea aprobada por Coordinación.
              </p>
            </div>

            {/* Datos Específicos según Rol */}
            {rolPostulacion === 'VOLUNTARIO' && (
              <div className="bevel-out bg-[#ece9d8] p-3 space-y-2">
                <p className="font-bold text-black border-b border-[#a0a0a0] pb-1">
                  3. Medio de Transporte para Rescate
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
                  3. Datos de la Organización ({rolPostulacion === 'DONANTE' ? 'Comercio Donante' : 'Comedor Beneficiario'})
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
