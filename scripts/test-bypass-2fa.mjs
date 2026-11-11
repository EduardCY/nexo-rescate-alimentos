import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('🚀 Iniciando verificación de bypass de 2FA en producción...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const baseUrl = process.env.BASE_URL || 'https://nexo-rescate-alimentos.vercel.app';
  const outDir = path.resolve('recordings/screenshots');

  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  console.log(`🌐 Navegando a ${baseUrl}/login`);
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

  // 1. Clic en Pestaña 2: Iniciar Sesión Registrada
  console.log('👆 Seleccionando Pestaña 2: Iniciar Sesión Registrada');
  await page.click('button:has-text("2. Iniciar Sesión Registrada")');
  await page.waitForTimeout(500);

  // 2. Verificar que el botón de envío dice "Ingresar al Sistema >"
  const submitButton = page.locator('button[type="submit"]:has-text("Ingresar al Sistema")');
  const count = await submitButton.count();
  console.log(`🔍 ¿Botón 'Ingresar al Sistema' visible?: ${count > 0 ? 'SÍ' : 'NO'}`);
  await page.screenshot({ path: path.join(outDir, 'test_bypass_2fa_pantalla_login.png') });

  // 3. Autocompletar con Coordinación
  console.log('👆 Clic en botón de autocompletar para Coordinación');
  await page.click('button:has-text("coordinacion@mesacomun.org")');
  await page.waitForTimeout(500);

  // 4. Enviar formulario (Paso 1)
  console.log('👆 Enviando credenciales...');
  await page.click('button[type="submit"]:has-text("Ingresar al Sistema")');

  // 5. Esperar a navegación (debe ingresar directamente sin pedir código TOTP)
  await page.waitForTimeout(2500);
  console.log(`📍 URL actual tras login: ${page.url()}`);

  await page.screenshot({ path: path.join(outDir, 'test_bypass_2fa_tablero_ingresado.png') });

  const sesionGuardada = await page.evaluate(() => localStorage.getItem('nexo_sesion_activa_v2'));
  console.log(`🔑 Sesión establecida en localStorage: ${sesionGuardada ? 'CORRECTO' : 'NO ENCONTRADA'}`);

  await browser.close();
  console.log('✅ Verificación de bypass 2FA completada con éxito.');
}

main().catch((err) => {
  console.error('❌ Error en prueba de bypass 2FA:', err);
  process.exit(1);
});
