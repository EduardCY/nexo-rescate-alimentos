-- ============================================================================
-- MIGRACIÓN: Autenticación por Contraseña y Google Authenticator (TOTP RFC 6238)
-- PLATAFORMA: Nexo Rescate de Alimentos - Fundación Mesa Común (Cali, Colombia)
-- ============================================================================

-- 1. Ampliación de columnas en tabla 'usuarios'
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS totp_configurado BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS totp_actualizado_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN usuarios.password_hash IS 'Hash criptográfico PBKDF2-HMAC-SHA512 con salt de 16 bytes y 100k iteraciones.';
COMMENT ON COLUMN usuarios.totp_secret IS 'Clave secreta Base32 RFC 6238 para Google Authenticator.';
COMMENT ON COLUMN usuarios.totp_configurado IS 'Indica si el usuario ya verificó y sincronizó su autenticador TOTP.';
COMMENT ON COLUMN usuarios.totp_actualizado_at IS 'Fecha del último enrolamiento o reseteo administrativo del 2FA.';

-- 2. Asegurar cuentas institucionales semilla con contraseña por defecto Nexo2026*!
-- Hash correspondiente: pbkdf2:sha512:100000:db6eefe4736dfd731610466a6b9bd72b:c4b3d50df2840e5a8b921aa5a9206987a7df6e33832cd7a3feb7cb0470127d186de97e388dc35fdab07622465685391ac6d2f3a7447938258d2011411d8ffab3
INSERT INTO usuarios (
    id, nombre, email, rol, telefono, disponible, estado_cuenta,
    password_hash, totp_configurado, created_at
) VALUES
(
    '00000000-0000-4000-8000-000000000001',
    'Administrador Corporativo Nexo',
    'admin@nexorescate.org',
    'ADMIN',
    '+573001112233',
    true,
    'ACTIVO',
    'pbkdf2:sha512:100000:db6eefe4736dfd731610466a6b9bd72b:c4b3d50df2840e5a8b921aa5a9206987a7df6e33832cd7a3feb7cb0470127d186de97e388dc35fdab07622465685391ac6d2f3a7447938258d2011411d8ffab3',
    false,
    NOW()
),
(
    '00000000-0000-4000-8000-000000000002',
    'Marcela Ocampo (Coordinación Operativa)',
    'coordinacion@mesacomun.org',
    'COORDINADOR',
    '+573150001122',
    true,
    'ACTIVO',
    'pbkdf2:sha512:100000:db6eefe4736dfd731610466a6b9bd72b:c4b3d50df2840e5a8b921aa5a9206987a7df6e33832cd7a3feb7cb0470127d186de97e388dc35fdab07622465685391ac6d2f3a7447938258d2011411d8ffab3',
    false,
    NOW()
),
(
    '00000000-0000-4000-8000-000000000003',
    'Comercio Donante Certificado',
    'donante@mesacomun.org',
    'DONANTE',
    '+573162223344',
    true,
    'ACTIVO',
    'pbkdf2:sha512:100000:db6eefe4736dfd731610466a6b9bd72b:c4b3d50df2840e5a8b921aa5a9206987a7df6e33832cd7a3feb7cb0470127d186de97e388dc35fdab07622465685391ac6d2f3a7447938258d2011411d8ffab3',
    false,
    NOW()
),
(
    '00000000-0000-4000-8000-000000000004',
    'Voluntario Operativo Cali',
    'voluntario@mesacomun.org',
    'VOLUNTARIO',
    '+573173334455',
    true,
    'ACTIVO',
    'pbkdf2:sha512:100000:db6eefe4736dfd731610466a6b9bd72b:c4b3d50df2840e5a8b921aa5a9206987a7df6e33832cd7a3feb7cb0470127d186de97e388dc35fdab07622465685391ac6d2f3a7447938258d2011411d8ffab3',
    false,
    NOW()
),
(
    '00000000-0000-4000-8000-000000000005',
    'Comedor Comunitario Siloé Esperanza',
    'comedor@mesacomun.org',
    'RECEPTOR',
    '+573184445566',
    true,
    'ACTIVO',
    'pbkdf2:sha512:100000:db6eefe4736dfd731610466a6b9bd72b:c4b3d50df2840e5a8b921aa5a9206987a7df6e33832cd7a3feb7cb0470127d186de97e388dc35fdab07622465685391ac6d2f3a7447938258d2011411d8ffab3',
    false,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    estado_cuenta = 'ACTIVO';
