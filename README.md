# Rescate de Alimentos

**Equipo:** Nexo Cívico Studio (Equipo 3)
**Slogan:** Software de bajo impacto operativo, alta eficiencia social.
**Alternativa seleccionada:** Aplicación Web Progresiva (PWA) Serverless

---

## Qué hace

La plataforma **Rescate de Alimentos** es una herramienta web accesible desde cualquier celular que conecta en tiempo real a comerciantes y restaurantes donantes de Cali con comedores comunitarios y fundaciones receptoras. Permite a los donantes publicar alimentos aptos para consumo en menos de un minuto, asegura que los alimentos que requieren refrigeración solo se entreguen a comedores con neveras funcionales, coordina a los voluntarios de transporte mediante rutas claras evitando que dos personas vayan por la misma donación, y genera de forma automática los reportes de kilos rescatados y personas beneficiadas necesarios para asegurar la financiación de la Fundación Mesa Común ante cooperantes internacionales.

---

## Cómo levantarlo

Sigue estos pasos para ejecutar el proyecto en tu máquina local:

### 1. Prerrequisitos

- **Node.js**: versión 18.17.0 o superior (recomendado Node.js 20 LTS).
- **npm** (versión 9+) o **pnpm**.
- **Git** instalado y configurado.

### 2. Clonar el repositorio

```bash
git clone https://github.com/EduardCY/Nexo-RescateAlimentos.git
cd Nexo-RescateAlimentos
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar variables de entorno

Copia la plantilla de variables de entorno y ajusta los valores necesarios:

```bash
cp .env.example .env.local
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre tu navegador en [http://localhost:3000](http://localhost:3000) para ver la aplicación funcionando.

### 6. Ejecución de pruebas y validaciones

```bash
# Ejecutar linter de código
npm run lint

# Ejecutar suite de pruebas unitarias y de integración
npm run test
```

---

## Despliegue en la Nube y Ciclo de Vida del Servicio ($0 USD/mes)

La plataforma está configurada y desplegada bajo una arquitectura **Serverless de costo cero**, utilizando los planes gratuitos (*Free Tier*) de **Vercel** y **Supabase**.

- **URL de Producción Activa:** [https://nexo-rescate-alimentos.vercel.app](https://nexo-rescate-alimentos.vercel.app)
- **Repositorio de Base de Datos:** Supabase Cloud (PostgreSQL 15 administrado).

### ¿Se mantienen activos automáticamente?

| Servicio | Permanencia y Disponibilidad | Política de Inactividad | Cómo reactivarlo si se apaga |
| :--- | :--- | :--- | :--- |
| **Vercel (Frontend & Serverless)** | **Siempre activo (24/7/365)** | Ninguna. Escala a cero computacionalmente cuando no hay peticiones, pero la URL nunca se desactiva. | No aplica; siempre está disponible. |
| **Supabase (Base de Datos PostgreSQL)** | **Activo con uso regular** | **Pausa automática tras 7 días sin peticiones** (política del Free Tier de Supabase para ahorro de recursos). | Entrar a [supabase.com/dashboard](https://supabase.com/dashboard) y presionar **"Restore project"** (restaura datos y esquemas en 1 minuto). |

> [!TIP]
> **Para mantener Supabase activo durante el semestre:** Basta con ingresar a la aplicación web o consultar el catálogo de donaciones una vez por semana. Para las fechas de entrega y sustanciación, verificar 24 horas antes que el proyecto no esté en estado *Paused*.

### Cómo desplegar nuevas versiones

1. **Despliegue automático (CI/CD):** Cada `git push origin main` compila y despliega automáticamente la nueva versión una vez vinculado el repositorio en Vercel.
2. **Despliegue manual por Terminal (CLI):**
   ```bash
   npx vercel --prod
   ```

### Cómo pausar o detener el proyecto (Apagado / Desactivación)

Si una vez evaluado el proyecto el equipo desea apagar o desmantelar los servicios:

1. **Detener o pausar Vercel:**
   - **Pausa temporal:** Ir a [Vercel Dashboard](https://vercel.com) → Seleccionar proyecto `nexo-rescate-alimentos` → **Settings** → **Advanced** → **Pause Project**.
   - **Eliminación definitiva:** En la misma pestaña **Advanced**, presionar **Delete Project**.
2. **Pausar o eliminar Supabase:**
   - **Pausa manual inmediata:** Ir a [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings** → **General** → **Pause project**.
   - **Eliminación definitiva:** En **Project Settings** → **General** → **Delete project**.
3. **Detener entorno local:**
   - Presionar `Ctrl + C` en la terminal donde esté corriendo `npm run dev`.

---

## Documentación

La especificación completa del sistema, su gobernanza ágil y las decisiones de diseño se encuentran versionadas dentro del repositorio:

- **Constitución del Proyecto:** [`docs/spec/constitucion.md`](docs/spec/constitucion.md) — *Roles del equipo (Equipo 3), convenciones de trabajo, política de IA, Definición de Listo (DoR) y Definición de Terminado (DoD).*
- **Especificación de Requisitos (SRS):** [`docs/spec/requisitos.md`](docs/spec/requisitos.md) — *Catálogo consolidado de Requisitos Funcionales (RF-001 a RF-018) y No Funcionales (RNF-001 a RNF-006 - ISO/IEC 25010), trazados con comportamientos y marco legal colombiano.*
- **Especificación de Comportamientos (MVP):** [`docs/spec/comportamientos.md`](docs/spec/comportamientos.md) — *Especificación formal BDD/Gherkin de los 5 comportamientos clave del núcleo (CMP-01 a CMP-05) y comportamiento transversal PWA.*
- **Tablero y Catálogo de Issues (GitHub Projects):** [`docs/spec/tablero-github-projects.md`](docs/spec/tablero-github-projects.md) — *Configuración de estados, jerarquía nativa de Issues Principales y 33 Sub-issues, trazabilidad 1:1 con GitHub Projects #6.*
- **Plan Técnico:** [`docs/spec/plan-tecnico.md`](docs/spec/plan-tecnico.md) — *Arquitectura PWA Serverless, modelo relacional en PostgreSQL/Supabase, políticas RLS, Dexie v2 (Patrón Outbox y sincronización delta) y Service Worker.*
- **Registro de Decisiones de Arquitectura (ADRs):** [`docs/decisiones/ADR-001-bloqueo-atomico-segunda-toma.md`](docs/decisiones/ADR-001-bloqueo-atomico-segunda-toma.md) — *Decisión técnica de concurrencia y bloqueo atómico con SELECT FOR UPDATE contra segunda toma simultánea.*
- **Guía de Ejecución por Olas y Prompts:** [`planeacion_sprints/prompts/README.md`](planeacion_sprints/prompts/README.md) — *Manual operativo del Product Owner y cuadernos de prompts de ejecución técnica para las Olas de desarrollo.*

---

## Uso de asistentes de IA

En cumplimiento con la política del Módulo 3, el equipo declara formalmente las herramientas de inteligencia artificial utilizadas y su ámbito de aplicación:

| Herramienta               | Modelo                          | Ámbito de Uso                                                                                                              | Convención Operativa                                                                                     |
| :------------------------ | :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Antigravity IDE** | Gemini 3.8 Flash/Gemini Argon 4 | Análisis de contexto profundo, generación de esqueletos, automatización de pruebas y documentación de especificaciones. | Todo código generado es auditado manualmente por un par antes de su integración a la rama principal.    |
| **Antigravity IDE** | Claude Sonnet/Opus 5.5          | Razonamiento arquitectónico, revisión de casos de borde de concurrencia y refactorización técnica de alta complejidad.  | Ningún miembro presenta en Sprint Review código que no comprenda y sea capaz de defender técnicamente. |
