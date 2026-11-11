import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('🚀 Iniciando validación visual de páginas homologadas Win98/SCADA...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const baseUrl = process.env.BASE_URL || 'https://nexo-rescate-alimentos.vercel.app';
  const outDir = path.resolve('recordings/screenshots');

  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  // 1. Admin Usuarios sin sesión (RoleGuardBanner Retro HTTP 403)
  console.log(`📸 Capturando ${baseUrl}/admin/usuarios (Sin sesión - HTTP 403 Retro)`);
  await page.goto(`${baseUrl}/admin/usuarios`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'homologacion_admin_guard.png') });

  // 2. Inyectar sesión de COORDINADOR
  console.log('🔑 Inyectando sesión de COORDINADOR para vistas autenticadas...');
  await page.evaluate(() => {
    const sesionCoordinador = {
      id: '00000000-0000-4000-8000-000000000002',
      userId: '00000000-0000-4000-8000-000000000002',
      nombre: 'Coordinación Mesa Común',
      email: 'coordinacion@mesacomun.org',
      rol: 'COORDINADOR',
      estadoCuenta: 'ACTIVO',
      organizacion: 'Mesa Común Cali',
      tipoOrganizacion: 'BANCO_ALIMENTOS',
      totpConfigurado: true,
      iniciadoEn: new Date().toISOString(),
    };
    localStorage.setItem('nexo_sesion_activa_v2', JSON.stringify(sesionCoordinador));
    document.cookie = `nexo_rol=COORDINADOR; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `nexo_user_id=${sesionCoordinador.id}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `nexo_estado_cuenta=ACTIVO; path=/; max-age=86400; SameSite=Lax`;
  });

  // 3. Rastreo con sesión
  console.log(`📸 Capturando ${baseUrl}/rastreo`);
  await page.goto(`${baseUrl}/rastreo`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'homologacion_rastreo.png') });

  // 4. Ruta Activa con sesión
  console.log(`📸 Capturando ${baseUrl}/ruta-activa`);
  await page.goto(`${baseUrl}/ruta-activa`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'homologacion_ruta_activa.png') });

  // 5. Admin Usuarios con sesión
  console.log(`📸 Capturando ${baseUrl}/admin/usuarios (Con sesión COORDINADOR)`);
  await page.goto(`${baseUrl}/admin/usuarios`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'homologacion_admin_usuarios.png') });

  // 6. Impacto con sesión
  console.log(`📸 Capturando ${baseUrl}/impacto (Con sesión COORDINADOR)`);
  await page.goto(`${baseUrl}/impacto`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'homologacion_impacto.png') });

  console.log('✅ Todas las capturas fueron tomadas con éxito.');
  await browser.close();
}

main().catch((err) => {
  console.error('❌ Error capturando pantallas:', err);
  process.exit(1);
});
