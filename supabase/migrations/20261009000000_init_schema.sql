-- ==============================================================================
-- Nexo Rescate de Alimentos - Migración Inicial DDL (Supabase / PostgreSQL 15)
-- Versión: 1.0.0
-- Módulo: 3 - MVP Rescate de Alimentos
-- Gobernanza: Trazado a RF-001 a RF-006, RF-014, RF-017, RNF-003, RNF-004 y ADR-001
-- ==============================================================================

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Secuencia para generación determinística del código único legible (DON-101, DON-102...)
CREATE SEQUENCE IF NOT EXISTS donacion_codigo_seq START WITH 101;

-- 3. Función generadora de código único de donación
CREATE OR REPLACE FUNCTION generar_codigo_donacion()
RETURNS TEXT AS $$
BEGIN
    RETURN 'DON-' || nextval('donacion_codigo_seq')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Tabla: organizaciones (Donantes, Comedores Receptores, Fundación Central)
CREATE TABLE IF NOT EXISTS organizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('DONANTE', 'RECEPTOR', 'FUNDACION')),
    direccion TEXT NOT NULL,
    zona VARCHAR(50) NOT NULL CHECK (zona IN ('NORTE', 'CENTRO', 'SUR', 'ORIENTE', 'LADERA')),
    telefono VARCHAR(50) NULL,
    tiene_refrigeracion BOOLEAN NOT NULL DEFAULT false,
    capacidad_raciones_dia INT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla: usuarios (Donantes, Voluntarios, Coordinadoras, Receptores)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('COORDINADOR', 'VOLUNTARIO', 'DONANTE', 'RECEPTOR')),
    telefono VARCHAR(50) NOT NULL,
    vehiculo_tipo VARCHAR(50) NULL CHECK (vehiculo_tipo IN ('MOTO', 'CARROMOTO', 'CARRO', 'BICICLETA', 'A_PIE')),
    disponible BOOLEAN NOT NULL DEFAULT true,
    organizacion_id UUID NULL REFERENCES organizaciones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabla: donaciones (Núcleo transaccional del sistema)
CREATE TABLE IF NOT EXISTS donaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL DEFAULT generar_codigo_donacion(),
    donante_id UUID NOT NULL REFERENCES usuarios(id),
    donante_nombre VARCHAR(255) NOT NULL,
    tipo_alimento VARCHAR(255) NOT NULL,
    requiere_frio BOOLEAN NOT NULL DEFAULT false,
    cantidad_estimada NUMERIC(10,2) NOT NULL CHECK (cantidad_estimada > 0),
    unidad_medida VARCHAR(50) NOT NULL CHECK (unidad_medida IN ('kg', 'canastillas', 'bultos', 'unidades')),
    direccion_recogida TEXT NOT NULL,
    hora_limite TIMESTAMPTZ NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'ASIGNADA', 'ENTREGADA', 'EXPIRADA', 'CANCELADA')),
    voluntario_id UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    voluntario_nombre VARCHAR(255) NULL,
    comedor_id UUID NULL REFERENCES organizaciones(id) ON DELETE SET NULL,
    comedor_nombre VARCHAR(255) NULL,
    exencion_sanitaria_aceptada BOOLEAN NOT NULL CHECK (exencion_sanitaria_aceptada = true),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    asignada_at TIMESTAMPTZ NULL,
    entregada_at TIMESTAMPTZ NULL
);

-- Índices para optimizar consultas de catálogo y vigencia temporal
CREATE INDEX IF NOT EXISTS idx_donaciones_estado_hora ON donaciones(estado, hora_limite);
CREATE INDEX IF NOT EXISTS idx_donaciones_codigo ON donaciones(codigo);
CREATE INDEX IF NOT EXISTS idx_donaciones_donante ON donaciones(donante_id);

-- 7. Tabla: trazabilidad_eventos (Auditoría inmutable de transiciones de estado)
CREATE TABLE IF NOT EXISTS trazabilidad_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donacion_id UUID NOT NULL REFERENCES donaciones(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(20) NULL,
    estado_nuevo VARCHAR(20) NOT NULL,
    usuario_id UUID NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_nombre VARCHAR(255) NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    observaciones TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_trazabilidad_donacion ON trazabilidad_eventos(donacion_id, timestamp);

-- 8. Procedimiento Transaccional Atómico: tomar_donacion (ADR-001 / CMP-03 Corazón del MVP)
-- Implementa bloqueo pesimista mediante SELECT ... FOR UPDATE para erradicar condiciones de carrera.
CREATE OR REPLACE FUNCTION tomar_donacion(
    p_donacion_id UUID,
    p_voluntario_id UUID,
    p_voluntario_nombre VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
    v_actual_estado TEXT;
    v_hora_limite TIMESTAMPTZ;
BEGIN
    -- Bloqueo pesimista de la fila seleccionada
    SELECT estado, hora_limite INTO v_actual_estado, v_hora_limite
    FROM donaciones
    WHERE id = p_donacion_id
    FOR UPDATE;

    -- Validación 1: Donación no encontrada
    IF v_actual_estado IS NULL THEN
        RETURN jsonb_build_object(
            'exito', false,
            'codigo', 404,
            'mensaje', 'La donación especificada no existe.'
        );
    END IF;

    -- Validación 2: Ventana temporal expirada
    IF v_hora_limite <= NOW() THEN
        UPDATE donaciones
        SET estado = 'EXPIRADA'
        WHERE id = p_donacion_id;

        INSERT INTO trazabilidad_eventos (donacion_id, estado_anterior, estado_nuevo, usuario_id, observaciones)
        VALUES (p_donacion_id, v_actual_estado, 'EXPIRADA', p_voluntario_id, 'Expiración automática por hora límite al intentar reserva');

        RETURN jsonb_build_object(
            'exito', false,
            'codigo', 410,
            'mensaje', 'La ventana de recogida de esta donación ha expirado.'
        );
    END IF;

    -- Validación 3: Donación ya no se encuentra DISPONIBLE (Conflicto de concurrencia)
    IF v_actual_estado != 'DISPONIBLE' THEN
        RETURN jsonb_build_object(
            'exito', false,
            'codigo', 409,
            'mensaje', 'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.'
        );
    END IF;

    -- Transición atómica exitosa
    UPDATE donaciones
    SET estado = 'ASIGNADA',
        voluntario_id = p_voluntario_id,
        voluntario_nombre = p_voluntario_nombre,
        asignada_at = NOW()
    WHERE id = p_donacion_id;

    -- Registro en auditoría inmutable
    INSERT INTO trazabilidad_eventos (donacion_id, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, observaciones)
    VALUES (p_donacion_id, 'DISPONIBLE', 'ASIGNADA', p_voluntario_id, p_voluntario_nombre, 'Donación tomada exitosamente con reserva única atómica');

    RETURN jsonb_build_object(
        'exito', true,
        'codigo', 200,
        'mensaje', 'Donación asignada correctamente.'
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Seguridad a nivel de fila (Row Level Security - RLS)
ALTER TABLE organizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE donaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE trazabilidad_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura abierta para el MVP (sujetas a afinamiento con Auth)
CREATE POLICY "Permitir lectura general de donaciones disponibles"
    ON donaciones FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserción de donaciones a donantes"
    ON donaciones FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir lectura general de trazabilidad"
    ON trazabilidad_eventos FOR SELECT
    USING (true);
