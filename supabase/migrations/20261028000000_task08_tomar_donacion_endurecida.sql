-- ==============================================================================
-- TASK-08 · Endurecimiento del RPC tomar_donacion (CMP-03 · ADR-001)
-- Trazado a: RF-004, RF-010, RNF-004 · CA-03.1, CA-03.2, CA-03.3
--
-- Reemplaza (CREATE OR REPLACE, misma firma) la función definida en
-- 20261009000000_init_schema.sql. No se edita la migración original porque ya
-- pudo haberse aplicado en Supabase.
--
-- Defectos corregidos (reproducidos contra PostgreSQL 16 con RLS activo):
--   1. Con la anon key (como llama supabase-js) la función respondía 404 y no
--      asignaba nada: no existe política RLS de UPDATE sobre donaciones ni de
--      INSERT sobre trazabilidad_eventos, así que el SELECT ... FOR UPDATE no
--      veía la fila. Ahora corre como SECURITY DEFINER, y las tablas siguen
--      cerradas a UPDATE directo desde el cliente.
--   2. Una donación ASIGNADA/ENTREGADA con hora_limite vencida pasaba a EXPIRADA
--      (transición inválida según la máquina de estados). Ahora se evalúa el
--      estado ANTES que la hora.
--   3. Un voluntario inexistente lanzaba una excepción SQL (violación de FK).
--      Ahora devuelve JSON controlado (404).
--   4. EXPIRADA/CANCELADA respondía 409 con el mensaje de "ya reservada".
--      CA-03.3 exige el mensaje de "oferta no vigente" (ahora 410).
--   5. Un usuario con rol DONANTE podía tomar donaciones (ahora 403).
--
-- Contrato de retorno (JSONB). Siempre incluye: exito, codigo, mensaje.
--   200  Asignación exitosa (incluye datos de recogida para CA-03.1).
--   400  Parámetros nulos.
--   403  El usuario es DONANTE y no puede tomar donaciones.
--   404  La donación o el voluntario no existen.
--   409  La donación ya no está DISPONIBLE (ya fue tomada/entregada). CA-03.2.
--   410  La oferta no está vigente: EXPIRADA, CANCELADA o hora límite vencida. CA-03.3.
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
    v_nombre         TEXT;
    v_don            donaciones%ROWTYPE;
    v_telefono_donante TEXT;
    v_ahora          TIMESTAMPTZ;
BEGIN
    -- 0. Parámetros obligatorios
    IF p_donacion_id IS NULL OR p_voluntario_id IS NULL THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 400,
            'mensaje', 'Se requieren la donación y el voluntario.'
        );
    END IF;

    -- 1. Validar quien toma (antes del cerrojo: no retiene la fila sin necesidad)
    SELECT rol, nombre INTO v_usuario_rol, v_usuario_nombre
    FROM usuarios
    WHERE id = p_voluntario_id;

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

    -- 2. Bloqueo pesimista de la fila (ADR-001). Los competidores concurrentes
    --    esperan aquí; al liberarse el cerrojo releen la fila ya actualizada.
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

    -- Se toma la hora DESPUÉS de obtener el cerrojo: NOW() congela el inicio de
    -- la transacción y un competidor que esperó el lock compararía con una hora vieja.
    v_ahora := clock_timestamp();

    -- 3. El estado se evalúa ANTES que la hora límite
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

    -- 4. Estaba DISPONIBLE pero la ventana de recogida ya venció
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

    -- 5. Transición atómica DISPONIBLE -> ASIGNADA
    UPDATE donaciones
    SET estado = 'ASIGNADA',
        voluntario_id = p_voluntario_id,
        voluntario_nombre = v_nombre,
        asignada_at = v_ahora
    WHERE id = p_donacion_id;

    -- 6. Auditoría inmutable de la transición, en la misma transacción
    INSERT INTO trazabilidad_eventos
        (donacion_id, estado_anterior, estado_nuevo, usuario_id, usuario_nombre, timestamp, observaciones)
    VALUES
        (p_donacion_id, 'DISPONIBLE', 'ASIGNADA', p_voluntario_id, v_nombre, v_ahora,
         'Donación tomada exitosamente con reserva única atómica');

    -- 7. Datos de recogida que CA-03.1 exige mostrar solo a quien ganó la reserva.
    --    El teléfono vive en usuarios (sin política de lectura pública), por eso
    --    solo se expone a través de este retorno.
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

COMMENT ON FUNCTION tomar_donacion(UUID, UUID, VARCHAR) IS
    'CMP-03 / ADR-001: toma única de una donación con SELECT ... FOR UPDATE. Retorna JSONB {exito, codigo 200|400|403|404|409|410, mensaje, ...}.';

-- Permisos: la función cambia estado, así que no se deja ejecutable por PUBLIC.
-- Los roles de Supabase se otorgan solo si existen (portable a PostgreSQL puro/CI).
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
