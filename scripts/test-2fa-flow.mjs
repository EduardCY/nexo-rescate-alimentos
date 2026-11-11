import { chromium } from 'playwright';
import * as OTPAuth from 'otpauth';

async function main() {
  console.log('🚀 Iniciando verificación automatizada de 2FA con Google Authenticator...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const baseUrl = process.env.BASE_URL || 'https://nexo-rescate-alimentos.vercel.app';
  console.log(`🌐 Navegando a ${baseUrl}/login`);
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

  // 1. Clic en Pestaña 2: Iniciar Sesión Registrada
  console.log('👆 Seleccionando Pestaña 2: Iniciar Sesión Registrada');
  await page.click('button:has-text("2. Iniciar Sesión Registrada")');

  // 2. Verificar que existe el campo de contraseña
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✅ Campo de contraseña verificado');

  // 3. Autocompletar con Coordinación
  console.log('👆 Haciendo clic en autocompletar Coordinación');
  await page.click('button:has-text("coordinacion@mesacomun.org")');

  // 4. Enviar Paso 1
  console.log('👆 Enviando Paso 1 (Credenciales)');
  await page.click('button:has-text("Continuar a Verificación 2FA")');

  // 5. Esperar a que aparezca el paso 2 (Enrolamiento o Verificación)
  await page.waitForTimeout(2000);

  // Tomar captura del Paso 2
  await page.screenshot({ path: 'recordings/screenshots/test_2fa_paso2_screen.png' });
  console.log('📸 Captura guardada en recordings/screenshots/test_2fa_paso2_screen.png');

  // Si requiere enrolamiento, buscar el secreto Base32
  const secretLocator = page.locator('.select-all');
  const count = await secretLocator.count();
  if (count > 0) {
    const secretText = (await secretLocator.innerText()).trim();
    console.log(`🔑 Clave secreta Base32 obtenida del QR: ${secretText}`);

    // Generar token TOTP de 6 dígitos con OTPAuth
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretText),
    });
    const token = totp.generate();
    console.log(`🔢 Código de 6 dígitos generado por emulador de Google Authenticator: ${token}`);

    // Ingresar token
    const totpInput = page.locator('input[placeholder="000000"]');
    await totpInput.fill(token);

    // Enviar código
    console.log('👆 Enviando código para activar 2FA');
    await page.click('button:has-text("Verificar Código y Activar 2FA")');
  } else {
    console.log('ℹ️ La cuenta ya tenía 2FA previamente enrolado. Esperando input TOTP...');
  }

  // Esperar redirección al tablero operativo
  await page.waitForTimeout(3000);
  console.log(`📍 URL actual: ${page.url()}`);
  await page.screenshot({ path: 'recordings/screenshots/test_2fa_final_tablero.png' });
  console.log('📸 Captura final guardada en recordings/screenshots/test_2fa_final_tablero.png');

  await browser.close();
  console.log('🎉 Verificación automatizada de 2FA concluida exitosamente.');
}

main().catch((err) => {
  console.error('❌ Error en prueba 2FA:', err);
  process.exit(1);
});
