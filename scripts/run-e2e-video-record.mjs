import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASE_URL = process.env.TEST_URL || 'https://nexo-rescate-alimentos.vercel.app';
const RECORDINGS_DIR = path.resolve(rootDir, 'recordings');
const SCREENSHOTS_DIR = path.resolve(RECORDINGS_DIR, 'screenshots');

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log(`[E2E] Iniciando suite automatizada contra: ${BASE_URL}`);
  console.log(`[E2E] Directorio de grabaciones: ${RECORDINGS_DIR}`);

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: RECORDINGS_DIR,
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  async function snap(name, caption) {
    const filePath = path.join(SCREENSHOTS_DIR, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`[SNAP] Captura guardada: ${name} (${caption})`);
  }

  try {
    // -------------------------------------------------------------------------
    // HITO 1: INICIO EN /login (VISTA DE LAS 3 PESTAÑAS)
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 1: Portal de Acceso y Vista de las 3 Pestañas ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await pause(1500);
    await snap('01_portal_inicio_3_pestanas.png', 'Vista inicial con las 3 pestañas de acceso');

    // -------------------------------------------------------------------------
    // HITO 2: PESTAÑA 1 - SANDBOX ROL COMERCIO DONANTE Y CREACIÓN DE LOTE
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 2: Sandbox Rol Donante ---');
    const btnDonante = page.locator('button:has-text("Entrar como DONANTE")');
    await btnDonante.click();
    await page.waitForLoadState('networkidle');
    await pause(2000);
    await snap('02_sandbox_donante_dashboard.png', 'Tablero operativo del Donante');

    // Navegar a /donar para publicar un lote
    console.log('[E2E] Navegando al wizard de donación /donar...');
    await page.goto(`${BASE_URL}/donar`, { waitUntil: 'networkidle' });
    await pause(1500);
    await snap('03_donar_paso1_formulario.png', 'Paso 1 del formulario de donación');

    // Llenar paso 1
    const alimentoInput = page.locator('input[placeholder*="Tomate Chonto"], input[type="text"]').first();
    if (await alimentoInput.isVisible()) {
      await alimentoInput.fill('Papaya Maradol de Exportación');
      await pause(600);
    }
    const cantidadInput = page.locator('input[type="number"]').first();
    if (await cantidadInput.isVisible()) {
      await cantidadInput.fill('60');
      await pause(600);
    }

    const btnPaso2 = page.locator('button:has-text("Continuar al Paso 2"), button:has-text("Paso 2")').first();
    if (await btnPaso2.isVisible()) {
      await btnPaso2.click();
      await pause(2000);
      await snap('04_donar_paso2_mapa_cali.png', 'Paso 2 con el mapa georreferenciado de Cali (OpenStreetMap)');
    }

    // Regresar al login para continuar con el siguiente rol
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await pause(1500);

    // -------------------------------------------------------------------------
    // HITO 3: PESTAÑA 1 - SANDBOX ROL VOLUNTARIO Y DISPONIBILIDAD
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 3: Sandbox Rol Voluntario ---');
    const btnVoluntario = page.locator('button:has-text("Entrar como VOLUNTARIO")');
    await btnVoluntario.click();
    await page.waitForLoadState('networkidle');
    await pause(2000);
    await snap('05_sandbox_voluntario_dashboard.png', 'Tablero operativo del Voluntario');

    // Navegar al catálogo de rescates
    await page.goto(`${BASE_URL}/donaciones`, { waitUntil: 'networkidle' });
    await pause(2000);
    await snap('06_voluntario_catalogo_rescates.png', 'Catálogo de ofertas disponibles en Cali');

    // Navegar a ruta activa
    await page.goto(`${BASE_URL}/ruta-activa`, { waitUntil: 'networkidle' });
    await pause(2000);
    await snap('07_voluntario_ruta_activa.png', 'Pantalla de ruta activa y trazabilidad GPS');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await pause(1500);

    // -------------------------------------------------------------------------
    // HITO 4: PESTAÑA 1 - SANDBOX ROL COMEDOR RECEPTOR
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 4: Sandbox Rol Receptor (Comedor) ---');
    const btnReceptor = page.locator('button:has-text("Entrar como RECEPTOR")');
    await btnReceptor.click();
    await page.waitForLoadState('networkidle');
    await pause(2000);
    await snap('08_sandbox_comedor_dashboard.png', 'Tablero del Comedor Receptor');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await pause(1500);

    // -------------------------------------------------------------------------
    // HITO 5: PESTAÑA 1 - SANDBOX ROL COORDINADOR OPERATIVO (RADAR CALI)
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 5: Sandbox Rol Coordinador (Radar de Cali) ---');
    const btnCoordinador = page.locator('button:has-text("Entrar como COORDINADOR")');
    await btnCoordinador.click();
    await page.waitForLoadState('networkidle');
    await pause(2500);
    await snap('09_sandbox_coordinador_radar.png', 'Torre de control y Radar Cartográfico con OpenStreetMap nativo');

    // Abrir consola de administración de usuarios
    await page.goto(`${BASE_URL}/admin/usuarios`, { waitUntil: 'networkidle' });
    await pause(2000);
    await snap('10_coordinador_consola_usuarios.png', 'Consola de gestión de usuarios en Coordinación');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await pause(1500);

    // -------------------------------------------------------------------------
    // HITO 6: PESTAÑA 3 - POSTULACIÓN PÚBLICA DE MIEMBROS
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 6: Pestaña 3 - Postulación Pública de Miembro ---');
    const tabPostulacion = page.locator('button:has-text("3. Postulación Pública de Miembros")');
    await tabPostulacion.click();
    await pause(1500);
    await snap('11_pestana3_postulacion_form.png', 'Formulario público de postulación');

    // Seleccionar rol Voluntario
    const btnRolVol = page.locator('button:has-text("Voluntario / Rescatista")');
    if (await btnRolVol.isVisible()) {
      await btnRolVol.click();
      await pause(800);
    }

    // Generar email único de prueba
    const testTimestamp = Date.now().toString().slice(-4);
    const testEmail = `carlos.e2e.${testTimestamp}@mesacomun.org`;

    // Diligenciar campos
    const inputNombre = page.locator('input[placeholder*="Juan Carlos"]');
    await inputNombre.fill('Carlos Mario Restrepo');
    await pause(500);

    const inputEmail = page.locator('input[placeholder*="juan.perez@correo.com"]');
    await inputEmail.fill(testEmail);
    await pause(500);

    const inputTel = page.locator('input[placeholder*="315 000"]');
    await inputTel.fill('+57 312 456 7890');
    await pause(500);

    const selectZona = page.locator('select').first();
    if (await selectZona.isVisible()) {
      await selectZona.selectOption('SUR');
      await pause(500);
    }

    const selectVehiculo = page.locator('select').nth(1);
    if (await selectVehiculo.isVisible()) {
      await selectVehiculo.selectOption('CARROMOTO');
      await pause(500);
    }

    await snap('12_pestana3_datos_diligenciados.png', 'Datos diligenciados para postulación');

    const btnEnviarPost = page.locator('button:has-text("Enviar Solicitud de Postulación")');
    await btnEnviarPost.click();
    await pause(3000);
    await snap('13_postulacion_exitosa_pendiente.png', 'Postulación registrada con éxito');

    // -------------------------------------------------------------------------
    // HITO 7: PESTAÑA 2 - VERIFICACIÓN DE BLOQUEO NORMATIVO LEY 1990
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 7: Pestaña 2 - Tarjeta de Cuenta en Revisión ---');
    // El submit de postulación activa automáticamente la tarjeta de advertencia en la Pestaña 2
    await pause(2000);
    await snap('14_bloqueo_normativo_ley1990.png', 'Tarjeta de bloqueo normativo Ley 1990 de 2019 (INVIMA)');

    // -------------------------------------------------------------------------
    // HITO 8: APROBACIÓN POR COORDINADORA EN /admin/usuarios
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 8: Aprobación de Cuenta por Coordinación ---');
    const btnVolverSandbox = page.locator('button:has-text("Entrar mediante Sandbox de Evaluación")');
    if (await btnVolverSandbox.isVisible()) {
      await btnVolverSandbox.click();
      await pause(1000);
    } else {
      await page.locator('button:has-text("1. Explorar los 5 Roles")').click();
      await pause(1000);
    }

    await page.locator('button:has-text("Entrar como COORDINADOR")').click();
    await page.waitForLoadState('networkidle');
    await pause(1500);

    await page.goto(`${BASE_URL}/admin/usuarios`, { waitUntil: 'networkidle' });
    await pause(2500);
    await snap('15_admin_usuarios_lista_pendiente.png', 'Lista de usuarios con solicitud de Carlos Mario pendiente');

    // Localizar botón de aprobar y hacer clic
    const btnAprobar = page.locator('button:has-text("✓ Aprobar")').first();
    if (await btnAprobar.isVisible()) {
      console.log('[E2E] Aprobando usuario...');
      await btnAprobar.click();
      await pause(2500);
      await snap('16_usuario_aprobado_activo.png', 'Usuario aprobado y activo en la bitácora de gobernanza');
    }

    // -------------------------------------------------------------------------
    // HITO 9: PESTAÑA 2 - LOGIN EXITOSO TRAS APROBACIÓN
    // -------------------------------------------------------------------------
    console.log('\n--- HITO 9: Pestaña 2 - Acceso Exitoso con Cuenta Aprobada ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await pause(1500);

    await page.locator('button:has-text("2. Iniciar Sesión Registrada")').click();
    await pause(1000);

    const inputLoginActivo = page.locator('input[type="email"]');
    if (await inputLoginActivo.isVisible()) {
      await inputLoginActivo.fill(testEmail);
      await pause(800);
      await page.locator('button:has-text("Ingresar al Tablero Operativo")').click();
      await page.waitForLoadState('networkidle');
      await pause(3000);
      await snap('17_login_exitoso_tablero_operativo.png', 'Acceso concedido al portal del Voluntario');
    }

    console.log('\n[E2E] ¡Secuencia de pruebas completada exitosamente!');
  } catch (err) {
    console.error('[E2E] Error durante la ejecución:', err);
    await snap('99_error_ejecucion.png', 'Captura del estado durante el error');
    throw err;
  } finally {
    console.log('[E2E] Cerrando contexto y consolidando archivo de video...');
    await context.close();
    await browser.close();

    // Renombrar el video generado por Playwright
    const files = fs.readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith('.webm'));
    if (files.length > 0) {
      files.sort((a, b) => {
        return (
          fs.statSync(path.join(RECORDINGS_DIR, b)).mtimeMs -
          fs.statSync(path.join(RECORDINGS_DIR, a)).mtimeMs
        );
      });
      const latestVideo = path.join(RECORDINGS_DIR, files[0]);
      const targetVideo = path.join(RECORDINGS_DIR, 'pruebas_portal_3_pestanas.webm');
      if (latestVideo !== targetVideo) {
        fs.copyFileSync(latestVideo, targetVideo);
        console.log(`[E2E] Video consolidado exitosamente en: ${targetVideo}`);
      }
    }
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
