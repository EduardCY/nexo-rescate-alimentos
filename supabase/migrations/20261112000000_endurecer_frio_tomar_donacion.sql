-- ==============================================================================
-- Entrega 3C · Endurecimiento de Cadena de Frío en RPC tomar_donacion (CMP-02 / CMP-03 / CA-02.2)
-- Trazado a: RF-014, RF-004, RF-010, RNF-004 · CA-02.2, CA-03.1..CA-03.4
--
-- Reemplaza (CREATE OR REPLACE, misma firma) la función endurecida en
-- 20261028000000_task08_tomar_donacion_endurecida.sql para validar también en SQL
-- que un comedor receptor sin refrigeración funcional (tiene_refrigeracion = false)
-- no pueda tomar un lote con requiere_frio = true (retorna 403).
-- ==============================================================================

CREATE OR REPLACE FUNCTION tomar_donacion(
    p_donacion_id UUID,
    p_voluntario_id UUID,
    p_voluntario_nombre VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    c_msg_conflicto  CONSTANT TEXT := 'Esta donación acaba de ser reservada por otra persona. Te mostramos las ofertas disponibles más cercanas.';
    c_msg_no_vigente CONSTANT TEXT := 'La oferta seleccionada ya no se encuentra vigente para recogida.';

    v_usuario_rol    TEXT;
    v_usuario_nombre TEXT;
    v_tiene_frio     BOOLEAN;
    v_nombre         TEXT;
    v_don            donaciones%ROWTYPE;
    v_telefono_donante TEXT;
    v_ahora          TIMESTAMPTZ;
BEGIN
    IF p_donacion_id IS NULL OR p_voluntario_id IS NULL THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 400,
            'mensaje', 'Se requieren la donación y el voluntario.'
        );
    END IF;

    SELECT u.rol, u.nombre, o.tiene_refrigeracion
    INTO v_usuario_rol, v_usuario_nombre, v_tiene_frio
    FROM usuarios u
    LEFT JOIN organizaciones o ON o.id = u.organizacion_id
    WHERE u.id = p_voluntario_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 404,
            'mensaje', 'El voluntario especificado no existe.'
        );
    END IF;

    IF v_usuario_rol = 'DONANTE' THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 403,
            'mensaje', 'Un donante no puede tomar donaciones.'
        );
    END IF;

    v_nombre := COALESCE(NULLIF(btrim(p_voluntario_nombre), ''), v_usuario_nombre);

    SELECT * INTO v_don
    FROM donaciones
    WHERE id = p_donacion_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 404,
            'mensaje', 'La donación especificada no existe.'
        );
    END IF;

    v_ahora := clock_timestamp();

    IF v_don.estado IN ('EXPIRADA', 'CANCELADA') THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 410, 'mensaje', c_msg_no_vigente
        );
    END IF;

    IF v_don.estado <> 'DISPONIBLE' THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 409, 'mensaje', c_msg_conflicto
        );
    END IF;

    IF v_don.hora_limite <= v_ahora THEN
        UPDATE donaciones
        SET estado = 'EXPIRADA'
        WHERE id = p_donacion_id;

        INSERT INTO trazabilidad_eventos
            (donacion_id, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, timestamp, observaciones)
        VALUES
            (p_donacion_id, 'DISPONIBLE', 'EXPIRADA', p_voluntario_id, v_nombre, v_ahora,
             'Expiración automática por hora límite al intentar reserva');

        RETURN jsonb_build_object(
            'exito', false, 'codigo', 410, 'mensaje', c_msg_no_vigente
        );
    END IF;

    -- CA-02.2 / RF-014: Bloqueo de cadena de frío para comedores sin refrigeración
    IF v_don.requiere_frio IS TRUE AND v_usuario_rol = 'RECEPTOR' AND v_tiene_frio IS FALSE THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 403,
            'mensaje', 'Este alimento requiere refrigeración y el comedor seleccionado no dispone de equipo de frío operativo.'
        );
    END IF;

    UPDATE donaciones
    SET estado = 'ASIGNADA',
        voluntario_id = p_voluntario_id,
        voluntario_nombre = v_nombre,
        asignada_at = v_ahora
    WHERE id = p_donacion_id;

    INSERT INTO trazabilidad_eventos
        (donacion_id, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, timestamp, observaciones)
    VALUES
        (p_donacion_id, 'DISPONIBLE', 'ASIGNADA', p_voluntario_id, v_nombre, v_ahora,
         'Donación tomada exitosamente con reserva única atómica');

    SELECT telefono INTO v_telefono_donante
    FROM usuarios
    WHERE id = v_don.donante_id;

    RETURN jsonb_build_object(
        'exito', true,
        'codigo', 200,
        'mensaje', 'Donación asignada correctamente.',
        'donacion_id', v_don.id,
        'donacion_codigo', v_don.codigo,
        'estado', 'ASIGNADA',
        'voluntario_id', p_voluntario_id,
        'voluntario_nombre', v_nombre,
        'asignada_at', v_ahora,
        'direccion_recogida', v_don.direccion_recogida,
        'donante_nombre', v_don.donante_nombre,
        'donante_telefono', v_telefono_donante
    );
END;
$$;

REVOKE ALL ON FUNCTION tomar_donacion(UUID, UUID, VARCHAR) FROM PUBLIC;

DO $$
DECLARE
    v_rol TEXT;
BEGIN
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_rol) THEN
            EXECUTE format(
                'GRANT EXECUTE ON FUNCTION tomar_donacion(UUID, UUID, VARCHAR) TO %I', v_rol
            );
        END IF;
    END LOOP;
END;
$$;
