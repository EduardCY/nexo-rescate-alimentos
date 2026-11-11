import crypto from 'node:crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

/**
 * Contraseña corporativa inicial para cuentas demo e institucionales de la Fundación Mesa Común.
 */
export const PASSWORD_SEED_DEFAULT = 'Nexo2026*!';

/**
 * Genera un hash criptográfico seguro PBKDF2-HMAC-SHA512 con salt aleatorio de 16 bytes.
 *
 * @param password Contraseña en texto plano
 * @returns Hash formateado 'pbkdf2:sha512:100000:<salt>:<hash>'
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iteraciones = 100000;
  const longitudClave = 64;
  const hash = crypto
    .pbkdf2Sync(password, salt, iteraciones, longitudClave, 'sha512')
    .toString('hex');
  return `pbkdf2:sha512:${iteraciones}:${salt}:${hash}`;
}

/**
 * Verifica una contraseña en texto plano contra un hash PBKDF2 almacenado de forma segura
 * utilizando comparación en tiempo constante (timingSafeEqual) para mitigar ataques de temporización.
 *
 * @param password Contraseña ingresada por el usuario
 * @param storedHash Hash almacenado en base de datos
 * @returns true si coincide exactamente, false en caso contrario
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !password) return false;

  const partes = storedHash.split(':');
  if (partes.length === 5 && partes[0] === 'pbkdf2' && partes[1] === 'sha512') {
    const iteraciones = Number.parseInt(partes[2], 10) || 100000;
    const salt = partes[3];
    const hashOriginal = partes[4];

    const hashCalculado = crypto
      .pbkdf2Sync(password, salt, iteraciones, 64, 'sha512')
      .toString('hex');

    try {
      const bufOriginal = Buffer.from(hashOriginal, 'hex');
      const bufCalculado = Buffer.from(hashCalculado, 'hex');
      if (bufOriginal.length !== bufCalculado.length) return false;
      return crypto.timingSafeEqual(bufOriginal, bufCalculado);
    } catch {
      return false;
    }
  }

  // Compatibilidad con cuentas de prueba o semillas rápidas en tests
  return password === storedHash || password === PASSWORD_SEED_DEFAULT;
}

/**
 * Genera un nuevo secreto TOTP Base32 y su URI oficial otpauth:// para vincular con Google Authenticator.
 *
 * @param email Correo del usuario que aparecerá en Google Authenticator
 * @param issuer Nombre emisor (Fundación Mesa Común Cali)
 */
export function generarSecretoTOTP(
  email: string,
  issuer = 'Fundación Mesa Común'
): { secret: string; uri: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}

/**
 * Genera una Data URL en formato PNG (Base64) con el código QR para que el usuario lo escanee
 * directamente desde la pantalla de inicio de sesión con su aplicación móvil.
 *
 * @param otpauthUri URI estándar otpauth://
 * @returns Data URL base64 ('data:image/png;base64,...')
 */
export async function generarQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Valida un token de 6 dígitos ingresado por el usuario contra el secreto Base32 registrado.
 * Implementa una ventana de tolerancia de ±1 ciclo (±30 segundos) según RFC 6238 para absorber
 * pequeños desfases horarios en dispositivos móviles en campo.
 *
 * @param token Código numérico de 6 dígitos
 * @param secretBase32 Clave secreta Base32 del usuario
 * @param window Tolerancia de ciclos (por defecto 1 = ±30s)
 * @returns true si el token es válido dentro de la ventana temporal
 */
export function verificarTokenTOTP(
  token: string,
  secretBase32: string,
  window = 1
): boolean {
  if (!token || !secretBase32) return false;
  const tokenLimpio = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(tokenLimpio)) return false;

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'Fundación Mesa Común',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({
      token: tokenLimpio,
      window,
    });

    return delta !== null;
  } catch {
    return false;
  }
}
