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

## Documentación

La especificación completa del sistema y las decisiones de diseño se encuentran versionadas dentro del repositorio:

- **Documento Maestro Consolidado (Entrega 3A):** [`docs/spec/entrega-3a-especificacion-y-plan.md`](docs/spec/entrega-3a-especificacion-y-plan.md)*Versión canónica en Markdown del documento oficial de entrega (Portada, Constitución, 5 Comportamientos en Gherkin, Plan Técnico, Backlog de 15 Tareas Atómicas y Habilitadores).*
- **Constitución del Proyecto:** [`docs/spec/constitucion.md`](docs/spec/constitucion.md)*Roles del equipo, convenciones de trabajo, política de IA, Definición de Listo (DoR) y Definición de Terminado (DoD).*
- **Especificación de Requisitos (SRS):** [`docs/spec/requisitos.md`](docs/spec/requisitos.md)*Catálogo consolidado de Requisitos Funcionales (RF-001 a RF-018) y No Funcionales (RNF-001 a RNF-006 - ISO/IEC 25010), trazados con comportamientos y marco legal.*
- **Especificación de Comportamientos (MVP):** [`docs/spec/comportamientos.md`](docs/spec/comportamientos.md)*Especificación BDD/Gherkin de los 5 comportamientos clave del núcleo trazados a los requerimientos del Módulo 1.*
- **Tablero y Catálogo de Issues (GitHub Projects):** [`docs/spec/tablero-github-projects.md`](docs/spec/tablero-github-projects.md)*Configuración de estados, plantilla oficial de issues y catálogo de historias y tareas atómicas para el tablero del proyecto.*
- **Plan Técnico:** [`docs/spec/plan-tecnico.md`](docs/spec/plan-tecnico.md)*Arquitectura PWA Serverless, modelo de datos relacional en PostgreSQL/Supabase, sincronización offline y despliegue en Vercel.*
- **Planificación e Implementación Sesión 8:** [`docs/plan-habilitadores-sesion8.md`](docs/plan-habilitadores-sesion8.md)*Memoria técnica de las tareas ejecutadas para los 5 habilitadores del Módulo 3.*
- **Guía y Checklist de Habilitadores:** [`docs/guia-habilitadores.md`](docs/guia-habilitadores.md)*Síntesis normativa de habilitadores del Módulo 3, estados del tablero y definiciones de calidad.*
- **Registro de Decisiones de Arquitectura (ADRs):** [`docs/decisiones/`](docs/decisiones/)
  *Historial de decisiones técnicas de fondo, alternativas evaluadas y consecuencias.*

---

## Uso de asistentes de IA

En cumplimiento con la política del Módulo 3, el equipo declara formalmente las herramientas de inteligencia artificial utilizadas y su ámbito de aplicación:

| Herramienta               | Modelo                          | Ámbito de Uso                                                                                                              | Convención Operativa                                                                                     |
| :------------------------ | :------------------------------ | :-------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **Antigravity IDE** | Gemini 3.8 Flash/Gemini Argon 4 | Análisis de contexto profundo, generación de esqueletos, automatización de pruebas y documentación de especificaciones. | Todo código generado es auditado manualmente por un par antes de su integración a la rama principal.    |
| **Antigravity IDE** | Claude Sonnet/Opus 5.5          | Razonamiento arquitectónico, revisión de casos de borde de concurrencia y refactorización técnica de alta complejidad.  | Ningún miembro presenta en Sprint Review código que no comprenda y sea capaz de defender técnicamente. |
