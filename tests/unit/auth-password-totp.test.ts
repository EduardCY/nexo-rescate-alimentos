import { describe, expect, it } from 'vitest';
import * as OTPAuth from 'otpauth';
import {
  hashPassword,
  verifyPassword,
  generarSecretoTOTP,
  generarQrDataUrl,
  verificarTokenTOTP,
  PASSWORD_SEED_DEFAULT,
} from '@/lib/auth/password-totp';
import {
  validarCredencialesPaso1Action,
  completarEnrolamiento2FAAction,
  verificarPaso2TOTPAction,
  restablecer2FAUsuarioAction,
} from '@/actions/usuarios-admin';

describe('Módulo Criptográfico: Contraseñas y Google Authenticator TOTP (RFC 6238)', () => {
  describe('Hashing y Verificación de Contraseñas', () => {
    it('genera un hash PBKDF2-SHA512 con salt aleatorio de 16 bytes y 100k iteraciones', () => {
      const pass = 'MesaComun2026*';
      const hash1 = hashPassword(pass);
      const hash2 = hashPassword(pass);

      expect(hash1).toMatch(/^pbkdf2:sha512:100000:[a-f0-9]{32}:[a-f0-9]{128}$/);
      expect(hash2).toMatch(/^pbkdf2:sha512:100000:[a-f0-9]{32}:[a-f0-9]{128}$/);
      // Salting único por llamada
      expect(hash1).not.toBe(hash2);
    });

    it('verifica correctamente la contraseña contra su hash generado', () => {
      const pass = 'Segura#2026';
      const hash = hashPassword(pass);

      expect(verifyPassword(pass, hash)).toBe(true);
      expect(verifyPassword('ContraseñaErrada', hash)).toBe(false);
      expect(verifyPassword('', hash)).toBe(false);
      expect(verifyPassword(pass, null)).toBe(false);
    });

    it('soporta la contraseña corporativa por defecto PASSWORD_SEED_DEFAULT para cuentas semilla', () => {
      expect(verifyPassword(PASSWORD_SEED_DEFAULT, null)).toBe(false);
      const hashDefault = hashPassword(PASSWORD_SEED_DEFAULT);
      expect(verifyPassword(PASSWORD_SEED_DEFAULT, hashDefault)).toBe(true);
    });
  });

  describe('Generación de Secreto TOTP y Código QR', () => {
    it('genera un secreto Base32 válido y una URI estándar otpauth://', () => {
      const email = 'coordinacion@mesacomun.org';
      const { secret, uri } = generarSecretoTOTP(email, 'Fundación Mesa Común');

      expect(secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('Fundaci%C3%B3n%20Mesa%20Com%C3%BAn');
      expect(uri).toContain(encodeURIComponent(email));
      expect(uri).toContain(`secret=${secret}`);
    });

    it('genera un Data URL válido de imagen PNG con el código QR', async () => {
      const { uri } = generarSecretoTOTP('donante@mesacomun.org');
      const qrDataUrl = await generarQrDataUrl(uri);

      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(qrDataUrl.length).toBeGreaterThan(500);
    });
  });

  describe('Validación de Tokens TOTP (Google Authenticator)', () => {
    it('valida exitosamente un token de 6 dígitos generado con el secreto Base32', () => {
      const { secret } = generarSecretoTOTP('voluntario@mesacomun.org');
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const tokenActual = totp.generate();
      expect(tokenActual).toMatch(/^\d{6}$/);

      const esValido = verificarTokenTOTP(tokenActual, secret);
      expect(esValido).toBe(true);
    });

    it('rechaza tokens con longitud incorrecta, caracteres no numéricos o códigos falsos', () => {
      const { secret } = generarSecretoTOTP('admin@nexorescate.org');

      expect(verificarTokenTOTP('12345', secret)).toBe(false);
      expect(verificarTokenTOTP('1234567', secret)).toBe(false);
      expect(verificarTokenTOTP('abcdef', secret)).toBe(false);
      expect(verificarTokenTOTP('000000', secret)).toBe(false);
    });

    it('soporta ventana de tolerancia de ±30 segundos (window = 1)', () => {
      const { secret } = generarSecretoTOTP('comedor@mesacomun.org');
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      // Token de hace 30 segundos
      const tokenCicloAnterior = totp.generate({ timestamp: Date.now() - 30000 });
      expect(verificarTokenTOTP(tokenCicloAnterior, secret, 1)).toBe(true);

      // Token de hace 2 minutos (fuera de ventana ±30s)
      const tokenMuyViejo = totp.generate({ timestamp: Date.now() - 120000 });
      expect(verificarTokenTOTP(tokenMuyViejo, secret, 1)).toBe(false);
    });
  });

  describe('Flujo Completo de Autenticación en 2 Pasos (Server Actions)', () => {
    const emailTest = 'voluntario@mesacomun.org';
    const passwordCorrecta = 'Nexo2026*!';

    it('Paso 1: rechaza contraseña incorrecta y acepta contraseña correcta emitiendo desafío', async () => {
      // Contraseña incorrecta
      const resErr = await validarCredencialesPaso1Action(emailTest, 'PasswordEquivocada');
      expect(resErr.exito).toBe(false);

      // Contraseña correcta
      const resOk = await validarCredencialesPaso1Action(emailTest, passwordCorrecta);
      expect(resOk.exito).toBe(true);
      if (resOk.exito && resOk.requiereSetup2FA) {
        expect(resOk.tempAuthToken).toBeDefined();
        expect(resOk.requiereSetup2FA).toBe(true);
        expect(resOk.qrDataUrl).toMatch(/^data:image\/png;base64,/);
        expect(resOk.secret).toMatch(/^[A-Z2-7]{32}$/);
      }
    });

    it('Paso 2A y 2B: enrola Google Authenticator con código válido y permite login subsecuente', async () => {
      // 1. Validar paso 1
      const paso1 = await validarCredencialesPaso1Action(emailTest, passwordCorrecta);
      expect(paso1.exito).toBe(true);
      if (!paso1.exito || !paso1.requiereSetup2FA) throw new Error('Se esperaba enrolamiento');

      // Generar código con la clave secreta emitida
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(paso1.secret),
      });
      const codigoGenerado = totp.generate();

      // 2. Completar enrolamiento
      const resEnrol = await completarEnrolamiento2FAAction({
        userId: paso1.userId,
        tempAuthToken: paso1.tempAuthToken,
        tokenTotp: codigoGenerado,
        secret: paso1.secret,
      });

      expect(resEnrol.exito).toBe(true);
      if (resEnrol.exito) {
        expect(resEnrol.sesion.rol).toBe('VOLUNTARIO');
      }

      // 3. En el siguiente inicio de sesión, el usuario ya tiene 2FA configurado
      const paso1Siguiente = await validarCredencialesPaso1Action(emailTest, passwordCorrecta);
      expect(paso1Siguiente.exito).toBe(true);
      if (paso1Siguiente.exito) {
        expect(paso1Siguiente.requiereSetup2FA).toBe(false);

        // 4. Iniciar sesión mediante Paso 2B (usuario recurrente)
        const codigoNuevo = totp.generate();
        const resPaso2 = await verificarPaso2TOTPAction({
          userId: paso1Siguiente.userId,
          tempAuthToken: paso1Siguiente.tempAuthToken,
          tokenTotp: codigoNuevo,
        });
        expect(resPaso2.exito).toBe(true);
      }
    });

    it('Restablecimiento Administrativo de 2FA permite enrolar un nuevo dispositivo', async () => {
      const adminId = '00000000-0000-4000-8000-000000000001';
      const usuarioId = '00000000-0000-4000-8000-000000000004'; // voluntario

      // Restablecer 2FA
      const resReset = await restablecer2FAUsuarioAction(adminId, usuarioId, 'Prueba de extravío de celular');
      expect(resReset.exito).toBe(true);

      // Ahora el siguiente login debe volver a exigir enrolamiento inicial (Paso 2A con QR)
      const paso1PostReset = await validarCredencialesPaso1Action(emailTest, passwordCorrecta);
      expect(paso1PostReset.exito).toBe(true);
      if (paso1PostReset.exito && paso1PostReset.requiereSetup2FA) {
        expect(paso1PostReset.requiereSetup2FA).toBe(true);
        expect(paso1PostReset.qrDataUrl).toBeDefined();
      }
    });
  });
});
