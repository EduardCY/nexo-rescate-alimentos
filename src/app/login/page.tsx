'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ArrowRight,
} from 'lucide-react';
import type { RolUsuario, ZonaCali } from '@/types';
import {
  iniciarSesionPorEmail,
  listarUsuariosParaAcceso,
  registrarUsuarioPorRol,
  type SesionUsuarioActiva,
} from '@/actions/organizaciones';
import { useSession } from '@/lib/auth/session-context';

const ROLES_CONFIG: Array<{
  rol: RolUsuario;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  icono: React.ReactNode;
  colorBadge: string;
}> = [
  {
    rol: 'DONANTE',
    titulo: 'Comerciante Donante',
    subtitulo: 'Puestos de Galería, Fruvers, Panaderías y Restaurantes',
    descripcion: 'Publica excedentes de alimentos bajo la Ley 1990 de 2019 y descarga certificados tributarios DIAN.',
    icono: <Store className="w-5 h-5 text-emerald-700" />,
    colorBadge: 'bg-emerald-100 text-emerald-900 border-emerald-500',
  },
  {
    rol: 'RECEPTOR',
    titulo: 'Comedor Comunitario / ONG',
    subtitulo: 'Ollas Comunitarias, Fundaciones y Hogares de Paso',
    descripcion: 'Registra tu comedor, capacidad de comensales y refrigeración, y firma actas de recepción física.',
    icono: <Utensils className="w-5 h-5 text-sky-700" />,
    colorBadge: 'bg-sky-100 text-sky-900 border-sky-500',
  },
  {
    rol: 'VOLUNTARIO',
    titulo: 'Voluntario Logístico',
    subtitulo: 'Rescatistas en Moto, Carromoto, Bicicleta o Vehículo',
    descripcion: 'Explora el catálogo por zonas de Cali, acepta rescates, navega por GPS y entrega en comedores.',
    icono: <Truck className="w-5 h-5 text-amber-700" />,
    colorBadge: 'bg-amber-100 text-amber-900 border-amber-500',
  },
  {
    rol: 'COORDINADOR',
    titulo: 'Coordinador Operativo',
    subtitulo: 'Mesa de Despacho Logístico y Supervisión de Red',
    descripcion: 'Gestiona el directorio de comedores, asigna donaciones, audita lotes expirados y exporta métricas.',
    icono: <Compass className="w-5 h-5 text-purple-700" />,
    colorBadge: 'bg-purple-100 text-purple-900 border-purple-500',
  },
  {
    rol: 'ADMIN',
    titulo: 'Administrador del Sistema',
    subtitulo: 'Gobernanza RBAC, Auditoría e Impacto Global',
    descripcion: 'Administra usuarios y roles, suspende cuentas, audita trazabilidad y supervisa toda la red.',
    icono: <ShieldCheck className="w-5 h-5 text-red-700" />,
    colorBadge: 'bg-red-100 text-red-900 border-red-500',
  },
];

const ZONAS_CALI: ZonaCali[] = ['CENTRO', 'NORTE', 'SUR', 'ORIENTE', 'LADERA'];

/**
 * Pantalla inicial de Autenticación y Registro Diferenciado por Rol (`/login`).
 *
 * ¿Por qué?: Garantiza que cada actor de la red en Santiago de Cali ingrese con los datos reales
 * de su rol específico y acceda únicamente a su portal dedicado sin botones ajenos.
 */
export default function LoginPage() {
  const router = useRouter();
  const { sesion, establecerSesion } = useSession();

  const [modo, setModo] = useState<'registro' | 'login'>('registro');
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario>('DONANTE');
  const [usuariosExistentes, setUsuariosExistentes] = useState<SesionUsuarioActiva[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos de inicio de sesión
  const [emailLogin, setEmailLogin] = useState('');

  // Campos comunes de registro
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('+57 315 ');
  const [zona, setZona] = useState<ZonaCali>('CENTRO');

  // Campos específicos de DONANTE y RECEPTOR
  const [organizacionNombre, setOrganizacionNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nit, setNit] = useState('');
  const [plazaGaleria, setPlazaGaleria] = useState('Galería Santa Elena');

  // Campos específicos de RECEPTOR (Comedor Comunitario)
  const [comensalesDiarios, setComensalesDiarios] = useState('150');
  const [tieneRefrigeracion, setTieneRefrigeracion] = useState(true);
  const [urgencia, setUrgencia] = useState<'Alta' | 'Media' | 'Normal'>('Alta');

  // Campos específicos de VOLUNTARIO
  const [medioTransporte, setMedioTransporte] = useState('Moto');

  useEffect(() => {
    listarUsuariosParaAcceso()
      .then((lista) => {
        setUsuariosExistentes(lista);
        if (lista.length > 0) {
          setModo('login');
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || cargando) return;
    setCargando(true);
    setErrorMsg(null);

    try {
      const res = await iniciarSesionPorEmail(emailLogin.trim());
      if (res.exito && res.sesion) {
        await establecerSesion(res.sesion);
        router.push('/');
      } else if (!res.exito) {
        setErrorMsg(res.error);
      }
    } catch {
      setErrorMsg('Error al verificar la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  const handleAccesoDirecto = async (u: SesionUsuarioActiva) => {
    if (u.estadoCuenta === 'SUSPENDIDO') {
      setErrorMsg('Esta cuenta ha sido suspendida por un Administrador (CA-05.2).');
      return;
    }
    await establecerSesion(u);
    router.push('/');
  };

  const handleRegistroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    setErrorMsg(null);

    try {
      const res = await registrarUsuarioPorRol({
        nombre: nombre.trim(),
        email: email.trim(),
        rol: rolSeleccionado,
        telefono: telefono.trim(),
        zona,
        organizacionNombre:
          rolSeleccionado === 'DONANTE' || rolSeleccionado === 'RECEPTOR'
            ? organizacionNombre.trim()
            : undefined,
        direccion:
          rolSeleccionado === 'DONANTE' || rolSeleccionado === 'RECEPTOR'
            ? direccion.trim()
            : undefined,
        nit: rolSeleccionado === 'DONANTE' ? nit.trim() : undefined,
        plazaGaleria: rolSeleccionado === 'DONANTE' ? plazaGaleria : undefined,
        comensalesDiarios:
          rolSeleccionado === 'RECEPTOR' ? Number(comensalesDiarios) || 120 : undefined,
        tieneRefrigeracion: rolSeleccionado === 'RECEPTOR' ? tieneRefrigeracion : undefined,
        urgencia: rolSeleccionado === 'RECEPTOR' ? urgencia : undefined,
        medioTransporte: rolSeleccionado === 'VOLUNTARIO' ? medioTransporte : undefined,
      });

      if (res.exito && res.sesion) {
        await establecerSesion(res.sesion);
        router.push('/');
      } else if (!res.exito) {
        setErrorMsg(res.error);
      }
    } catch {
      setErrorMsg('No fue posible completar el registro.');
    } finally {
      setCargando(false);
    }
  };

  const rolInfo = ROLES_CONFIG.find((r) => r.rol === rolSeleccionado) || ROLES_CONFIG[0];

  return (
    <main className="min-h-screen bg-[#090d16] p-2 sm:p-4 lg:p-6 flex items-center justify-center text-black">
      <div className="bevel-out w-full max-w-4xl bg-[#d4d0c8] p-[3px] shadow-[8px_8px_0_rgba(0,0,0,0.65)]">
        {/* Barra de título Windows 98 */}
        <header className="titlebar flex items-center justify-between gap-2 px-2.5 py-1.5 text-white">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-400 text-black font-extrabold text-[10px] flex items-center justify-center">
              ■
            </span>
            <h1 className="font-mono text-xs sm:text-sm font-bold tracking-wide">
              NEXO RESCATE DE ALIMENTOS — ACCESO Y REGISTRO POR ROL (CALI, COLOMBIA)
            </h1>
          </div>
          {sesion && (
            <button
              type="button"
              onClick={() => router.push('/')}
              className="btn-98 !py-0.5 !px-2 text-[11px] font-mono font-bold text-[#000080]"
            >
              Ir a mi Portal ({sesion.rol}) &gt;
            </button>
          )}
        </header>

        {/* Selector de Modo: Registro de Cuenta vs Iniciar Sesión */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#ece9d8] px-3 py-2 border-b border-[#808080] font-mono text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setModo('registro');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] px-3 py-1 font-bold flex items-center gap-1.5 ${
                modo === 'registro' ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>1. Crear Cuenta por Rol</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('login');
                setErrorMsg(null);
              }}
              className={`min-h-[40px] px-3 py-1 font-bold flex items-center gap-1.5 ${
                modo === 'login' ? 'bg-[#000080] text-white bevel-in' : 'btn-98 text-black'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>2. Iniciar Sesión ({usuariosExistentes.length})</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-700">
            Ley 1990 de 2019 • Trazabilidad Real Sin Datos Ficticios
          </span>
        </div>

        <div className="p-3 sm:p-5">
          {errorMsg && (
            <div
              role="alert"
              className="mb-4 bevel-in bg-red-100 border-2 border-red-700 p-3 text-red-950 font-mono text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {modo === 'login' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Formulario de Login por Correo */}
              <form
                onSubmit={handleLoginSubmit}
                className="lg:col-span-5 bevel-out bg-white p-4 flex flex-col gap-3 font-mono text-xs"
              >
                <div className="titlebar px-2 py-1 text-white font-bold">
                  INGRESAR CON CORREO REGISTRADO
                </div>
                <div>
                  <label className="retro-label" htmlFor="login-email">
                    Correo electrónico *
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={emailLogin}
                    onChange={(e) => setEmailLogin(e.target.value)}
                    placeholder="usuario@organizacion.org"
                    className="retro-field min-h-[44px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className="btn-green min-h-[48px] font-bold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{cargando ? 'VERIFICANDO...' : 'ENTRAR AL PORTAL'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModo('registro')}
                  className="btn-98 min-h-[40px] font-bold text-[#000080]"
                >
                  ¿No tienes cuenta? Regístrate aquí &gt;
                </button>
              </form>

              {/* Cuentas reales creadas en esta sesión / base de datos */}
              <div className="lg:col-span-7 bevel-in bg-[#f8fafc] p-4 font-mono text-xs flex flex-col gap-2">
                <h2 className="font-bold text-[#000080] text-sm">
                  CUENTAS REGISTRADAS EN EL SISTEMA ({usuariosExistentes.length})
                </h2>
                {usuariosExistentes.length === 0 ? (
                  <div className="bevel-in bg-[#ffffe1] p-4 text-slate-800 my-auto">
                    <p className="font-bold mb-1">Aún no hay usuarios registrados.</p>
                    <p className="text-[11px] text-slate-600 mb-3">
                      El sistema inicia limpio sin datos simulados. Crea tu primera cuenta como Donante, Comedor Comunitario, Voluntario, Coordinador o Administrador.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModo('registro')}
                      className="btn-green min-h-[42px] px-4 font-bold"
                    >
                      + Crear primera cuenta ahora
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                    {usuariosExistentes.map((u) => (
                      <div
                        key={u.userId}
                        className="bevel-out bg-white p-2.5 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-black">{u.nombre}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-[#000080] text-white">
                              {u.rol}
                            </span>
                            {u.estadoCuenta === 'SUSPENDIDO' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-red-600 text-white">
                                SUSPENDIDO
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600">
                            {u.email} {u.organizacionNombre ? `• ${u.organizacionNombre}` : ''} • Zona {u.zona || 'CENTRO'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAccesoDirecto(u)}
                          className="btn-98 min-h-[38px] px-3 font-bold text-[#000080] shrink-0"
                        >
                          Ingresar &gt;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Columna Izquierda: Selección de los 5 Roles */}
              <div className="lg:col-span-5 flex flex-col gap-2">
                <p className="font-mono text-xs font-bold text-[#000080] uppercase">
                  Paso 1: Selecciona tu Rol en la Red *
                </p>
                {ROLES_CONFIG.map((r) => {
                  const activo = rolSeleccionado === r.rol;
                  return (
                    <button
                      key={r.rol}
                      type="button"
                      onClick={() => setRolSeleccionado(r.rol)}
                      className={`w-full text-left p-3 font-mono transition-all ${
                        activo
                          ? 'bevel-in bg-white ring-2 ring-[#000080]'
                          : 'bevel-out bg-[#ece9d8] hover:bg-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          {r.icono}
                          <span className="font-extrabold text-xs sm:text-sm text-black">
                            {r.titulo}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.5 text-[10px] font-extrabold border ${r.colorBadge}`}>
                          {r.rol}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">{r.subtitulo}</p>
                      <p className="text-[10px] text-slate-600 mt-1 leading-snug">{r.descripcion}</p>
                    </button>
                  );
                })}
              </div>

              {/* Columna Derecha: Formulario Específico del Rol Seleccionado */}
              <form
                onSubmit={handleRegistroSubmit}
                className="lg:col-span-7 bevel-out bg-white p-4 font-mono text-xs flex flex-col gap-3"
              >
                <div className="titlebar px-2.5 py-1.5 text-white font-bold flex items-center justify-between">
                  <span>PASO 2: DATOS DE REGISTRO — {rolInfo.titulo.toUpperCase()}</span>
                  <span className="bg-white/20 px-1.5 py-0.5 text-[10px]">{rolSeleccionado}</span>
                </div>

                {/* Datos personales básicos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="retro-label" htmlFor="reg-nombre">
                      {rolSeleccionado === 'DONANTE'
                        ? 'Nombre del comerciante / encargado *'
                        : rolSeleccionado === 'RECEPTOR'
                        ? 'Nombre del coordinador(a) del comedor *'
                        : 'Nombre completo *'}
                    </label>
                    <input
                      id="reg-nombre"
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Doña Rosa Valencia"
                      className="retro-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="retro-label" htmlFor="reg-email">
                      Correo electrónico *
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contacto@ejemplo.org"
                      className="retro-field min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="retro-label" htmlFor="reg-telefono">
                      Teléfono / WhatsApp de contacto *
                    </label>
                    <input
                      id="reg-telefono"
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+57 315 400 1122"
                      className="retro-field min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="retro-label" htmlFor="reg-zona">
                      Zona de Cali *
                    </label>
                    <select
                      id="reg-zona"
                      value={zona}
                      onChange={(e) => setZona(e.target.value as ZonaCali)}
                      className="retro-field min-h-[44px] font-bold"
                    >
                      {ZONAS_CALI.map((z) => (
                        <option key={z} value={z}>
                          ZONA {z} — Santiago de Cali
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Campos exclusivos para DONANTE */}
                {rolSeleccionado === 'DONANTE' && (
                  <div className="bevel-in bg-[#f0fdf4] p-3 border border-emerald-600 flex flex-col gap-3">
                    <p className="font-extrabold text-emerald-950 text-xs">
                      ▣ DATOS DEL COMERCIO O PUESTO DONANTE
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="retro-label" htmlFor="reg-comercio">
                          Nombre del Puesto / Comercio / Restaurante *
                        </label>
                        <input
                          id="reg-comercio"
                          type="text"
                          required
                          value={organizacionNombre}
                          onChange={(e) => setOrganizacionNombre(e.target.value)}
                          placeholder="Ej. Puesto 45 Doña Rosa"
                          className="retro-field min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="retro-label" htmlFor="reg-plaza">
                          Plaza de Mercado / Sector *
                        </label>
                        <select
                          id="reg-plaza"
                          value={plazaGaleria}
                          onChange={(e) => setPlazaGaleria(e.target.value)}
                          className="retro-field min-h-[44px]"
                        >
                          <option value="Galería Santa Elena">Galería Santa Elena</option>
                          <option value="Central Mayorista Cavasa">Central Mayorista Cavasa</option>
                          <option value="Galería Alameda">Galería Alameda</option>
                          <option value="Galería La Floresta">Galería La Floresta</option>
                          <option value="Galería Alfonso López">Galería Alfonso López</option>
                          <option value="Restaurante / Supermercado Independiente">
                            Restaurante / Supermercado Independiente
                          </option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="retro-label" htmlFor="reg-dir-donante">
                          Dirección y número de local / muelle *
                        </label>
                        <input
                          id="reg-dir-donante"
                          type="text"
                          required
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Ej. Calle 25 # 29-10, Pabellón 2 Puesto 45"
                          className="retro-field min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="retro-label" htmlFor="reg-nit">
                          NIT o Cédula (para Certificado DIAN Ley 1990)
                        </label>
                        <input
                          id="reg-nit"
                          type="text"
                          value={nit}
                          onChange={(e) => setNit(e.target.value)}
                          placeholder="Ej. 901.428.192-3"
                          className="retro-field min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos exclusivos para RECEPTOR (Comedor Comunitario) */}
                {rolSeleccionado === 'RECEPTOR' && (
                  <div className="bevel-in bg-[#e0f2fe] p-3 border border-sky-700 flex flex-col gap-3">
                    <p className="font-extrabold text-sky-950 text-xs">
                      ▣ DATOS DEL COMEDOR COMUNITARIO / FUNDACIÓN RECEPTORA
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="retro-label" htmlFor="reg-comedor">
                          Nombre del Comedor Comunitario *
                        </label>
                        <input
                          id="reg-comedor"
                          type="text"
                          required
                          value={organizacionNombre}
                          onChange={(e) => setOrganizacionNombre(e.target.value)}
                          placeholder="Ej. Comedor Comunitario Siloé Esperanza"
                          className="retro-field min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="retro-label" htmlFor="reg-dir-comedor">
                          Dirección física en Cali *
                        </label>
                        <input
                          id="reg-dir-comedor"
                          type="text"
                          required
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Ej. Calle 1 Oeste # 50-12, Siloé"
                          className="retro-field min-h-[44px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="retro-label" htmlFor="reg-comensales">
                          Beneficiarios / Comensales diarios *
                        </label>
                        <input
                          id="reg-comensales"
                          type="number"
                          min="10"
                          required
                          value={comensalesDiarios}
                          onChange={(e) => setComensalesDiarios(e.target.value)}
                          className="retro-field min-h-[44px] font-bold"
                        />
                      </div>
                      <div>
                        <label className="retro-label" htmlFor="reg-urgencia">
                          Prioridad alimentaria *
                        </label>
                        <select
                          id="reg-urgencia"
                          value={urgencia}
                          onChange={(e) =>
                            setUrgencia(e.target.value as 'Alta' | 'Media' | 'Normal')
                          }
                          className="retro-field min-h-[44px] font-bold"
                        >
                          <option value="Alta">Prioridad Alta (Vulnerabilidad crítica)</option>
                          <option value="Media">Prioridad Media</option>
                          <option value="Normal">Prioridad Normal</option>
                        </select>
                      </div>
                    </div>
                    <div className="bevel-out bg-white p-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Snowflake className="w-5 h-5 text-sky-700 shrink-0" />
                        <div>
                          <p className="font-bold text-black">
                            ¿Cuenta con nevera / cuarto frío operativo?
                          </p>
                          <p className="text-[10px] text-slate-600">
                            Indispensable para poder asignarle lácteos, cárnicos y alimentos que requieren frío (CA-02.2).
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTieneRefrigeracion(!tieneRefrigeracion)}
                        className={`min-h-[42px] px-3 font-extrabold ${
                          tieneRefrigeracion ? 'btn-blue' : 'btn-98'
                        }`}
                      >
                        {tieneRefrigeracion ? '❄ SÍ TIENE FRÍO' : 'SIN NEVERA'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Campos exclusivos para VOLUNTARIO */}
                {rolSeleccionado === 'VOLUNTARIO' && (
                  <div className="bevel-in bg-[#fef3c7] p-3 border border-amber-600 flex flex-col gap-2">
                    <p className="font-extrabold text-amber-950 text-xs">
                      ▣ DATOS OPERATIVOS DEL VOLUNTARIO EN CAMPO
                    </p>
                    <div>
                      <label className="retro-label" htmlFor="reg-transporte">
                        Medio de transporte disponible para rescates *
                      </label>
                      <select
                        id="reg-transporte"
                        value={medioTransporte}
                        onChange={(e) => setMedioTransporte(e.target.value)}
                        className="retro-field min-h-[44px] font-bold"
                      >
                        <option value="Moto">Motocicleta con cajón / parrilla</option>
                        <option value="Carromoto">Carromoto de carga</option>
                        <option value="Vehículo particular">Vehículo particular / Camioneta</option>
                        <option value="Bicicleta">Bicicleta de reparto</option>
                        <option value="A pie">A pie (entregas dentro de la misma galería/barrio)</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="btn-green min-h-[48px] text-sm font-extrabold flex items-center justify-center gap-2 mt-1"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {cargando
                      ? 'CREANDO CUENTA Y PORTAL...'
                      : `REGISTRARME E INGRESAR COMO ${rolSeleccionado}`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
