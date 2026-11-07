-- ==============================================================================
-- Nexo Rescate de Alimentos - Migración DDL (Supabase / PostgreSQL 15)
-- TASK-24 · CMP-05 · RBAC corporativo, gestión de usuarios y bitácora inmutable
-- Trazado a: RNF-003 (Seguridad RBAC / Habeas Data) · CA-05.1, CA-05.2, CA-05.3
--
-- Contenido:
--   1. Rol ADMIN en usuarios.rol.
--   2. Columnas usuarios.estado_cuenta y usuarios.permisos_granulares.
--   3. Tabla audit_rbac_eventos: bitácora INMUTABLE (triggers + RLS + sin permisos).
--   4. RPCs transaccionales de administración (SECURITY DEFINER, solo service_role):
--        rbac_crear_usuario · rbac_actualizar_rol · rbac_cambiar_estado
--      Cada una valida que el actor sea ADMIN activo, muta la fila y escribe la
--      bitácora EN LA MISMA TRANSACCIÓN: o ocurren ambas cosas o ninguna.
--   5. tomar_donacion: rechaza (403) cuentas SUSPENDIDO o PENDIENTE_AUTORIZACION.
--
-- Contrato de retorno de las RPCs (JSONB): exito, codigo, mensaje (+ usuario en 200)
--   200 OK · 400 datos inválidos · 403 el actor no es ADMIN activo
--   404 usuario u organización inexistente · 409 conflicto de negocio
--
-- Idempotente: se puede ejecutar más de una vez sin error.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Rol ADMIN
--    El CHECK original fue creado en línea (nombre autogenerado), por eso se
--    localiza por su definición en vez de asumir el nombre.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_con RECORD;
BEGIN
    FOR v_con IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'public.usuarios'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%(rol)%'
          AND pg_get_constraintdef(c.oid) ILIKE '%DONANTE%'
    LOOP
        EXECUTE format('ALTER TABLE public.usuarios DROP CONSTRAINT %I', v_con.conname);
    END LOOP;

    ALTER TABLE public.usuarios
        ADD CONSTRAINT usuarios_rol_check
        CHECK (rol IN ('ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'DONANTE', 'RECEPTOR'));
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Estado de cuenta y permisos granulares
--    Las filas existentes quedan ACTIVO y con permisos [] (no cambia su operación).
-- ------------------------------------------------------------------------------
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    ADD COLUMN IF NOT EXISTS permisos_granulares JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_estado_cuenta_check') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_estado_cuenta_check
            CHECK (estado_cuenta IN ('ACTIVO', 'SUSPENDIDO', 'PENDIENTE_AUTORIZACION'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_permisos_granulares_check') THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_permisos_granulares_check
            CHECK (jsonb_typeof(permisos_granulares) = 'array');
    END IF;
END;
$$;

COMMENT ON COLUMN usuarios.estado_cuenta IS 'ACTIVO | SUSPENDIDO | PENDIENTE_AUTORIZACION. Una cuenta no ACTIVO no puede tomar donaciones (CA-05.2).';
COMMENT ON COLUMN usuarios.permisos_granulares IS 'Arreglo JSONB de permisos adicionales al rol, p. ej. ["admin:users:write"].';

-- ------------------------------------------------------------------------------
-- 3. Bitácora inmutable audit_rbac_eventos
--    accion: CREAR | EDITAR_ROL | SUSPENDER | REACTIVAR (docs/spec/plan-tecnico.md).
--    En SUSPENDER/REACTIVAR, rol_anterior y rol_nuevo guardan el rol vigente
--    (no cambia), de modo que cada fila es autosuficiente para una auditoría.
--    Las FK no tienen ON DELETE: una cuenta con historial se SUSPENDE, no se borra.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_rbac_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES usuarios(id),
    usuario_afectado_id UUID NOT NULL REFERENCES usuarios(id),
    accion VARCHAR(30) NOT NULL CHECK (accion IN ('CREAR', 'EDITAR_ROL', 'SUSPENDER', 'REACTIVAR')),
    rol_anterior VARCHAR(50) NULL,
    rol_nuevo VARCHAR(50) NULL,
    motivo TEXT NOT NULL CHECK (length(btrim(motivo)) >= 3),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_rbac_usuario_afectado ON audit_rbac_eventos(usuario_afectado_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_rbac_admin ON audit_rbac_eventos(admin_id, timestamp DESC);

CREATE OR REPLACE FUNCTION audit_rbac_bloquear_mutacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_rbac_eventos es inmutable: no se permite % (CA-05.2)', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_rbac_inmutable_fila ON audit_rbac_eventos;
CREATE TRIGGER trg_audit_rbac_inmutable_fila
    BEFORE UPDATE OR DELETE ON audit_rbac_eventos
    FOR EACH ROW EXECUTE FUNCTION audit_rbac_bloquear_mutacion();

DROP TRIGGER IF EXISTS trg_audit_rbac_inmutable_truncate ON audit_rbac_eventos;
CREATE TRIGGER trg_audit_rbac_inmutable_truncate
    BEFORE TRUNCATE ON audit_rbac_eventos
    FOR EACH STATEMENT EXECUTE FUNCTION audit_rbac_bloquear_mutacion();

-- RLS activo SIN políticas: ningún cliente (anon/authenticated) lee ni escribe.
-- service_role (servidor) la omite por diseño de Supabase y es el único que opera.
ALTER TABLE audit_rbac_eventos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    v_rol TEXT;
BEGIN
    EXECUTE 'REVOKE ALL ON TABLE audit_rbac_eventos FROM PUBLIC';
    FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_rol) THEN
            EXECUTE format('REVOKE ALL ON TABLE audit_rbac_eventos FROM %I', v_rol);
        END IF;
    END LOOP;
END;
$$;

COMMENT ON TABLE audit_rbac_eventos IS 'Bitácora inmutable de administración RBAC (CA-05.2). UPDATE, DELETE y TRUNCATE bloqueados por trigger.';

-- ------------------------------------------------------------------------------
-- 4. RPCs de administración
-- ------------------------------------------------------------------------------

-- Verifica que el actor sea ADMIN ACTIVO. Devuelve NULL si está autorizado o el
-- JSON de error 403 listo para retornar. Es interna: nadie la invoca desde fuera.
CREATE OR REPLACE FUNCTION rbac_verificar_admin(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol TEXT;
    v_estado TEXT;
BEGIN
    IF p_admin_id IS NULL THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 403, 'mensaje', 'Forbidden: Requiere rol ADMIN');
    END IF;

    SELECT rol, estado_cuenta INTO v_rol, v_estado
    FROM usuarios
    WHERE id = p_admin_id;

    IF NOT FOUND OR v_rol <> 'ADMIN' THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 403, 'mensaje', 'Forbidden: Requiere rol ADMIN');
    END IF;

    IF v_estado <> 'ACTIVO' THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 403, 'mensaje', 'Forbidden: La cuenta del administrador no está activa');
    END IF;

    RETURN NULL;
END;
$$;

-- Representación JSON estable de un usuario (sin datos de sesión ni secretos).
CREATE OR REPLACE FUNCTION rbac_usuario_a_json(p_usuario usuarios)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT jsonb_build_object(
        'id', p_usuario.id,
        'nombre', p_usuario.nombre,
        'email', p_usuario.email,
        'rol', p_usuario.rol,
        'telefono', p_usuario.telefono,
        'vehiculo_tipo', p_usuario.vehiculo_tipo,
        'disponible', p_usuario.disponible,
        'organizacion_id', p_usuario.organizacion_id,
        'estado_cuenta', p_usuario.estado_cuenta,
        'permisos_granulares', p_usuario.permisos_granulares,
        'created_at', p_usuario.created_at
    );
$$;

-- Alta de usuario corporativo (accion CREAR). Nace ACTIVO: lo crea un ADMIN.
CREATE OR REPLACE FUNCTION rbac_crear_usuario(
    p_admin_id UUID,
    p_nombre VARCHAR,
    p_email VARCHAR,
    p_rol VARCHAR,
    p_telefono VARCHAR,
    p_organizacion_id UUID,
    p_vehiculo_tipo VARCHAR,
    p_permisos_granulares JSONB,
    p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_err JSONB;
    v_email TEXT := lower(btrim(COALESCE(p_email, '')));
    v_permisos JSONB := COALESCE(p_permisos_granulares, '[]'::jsonb);
    v_nuevo usuarios%ROWTYPE;
BEGIN
    -- Serializa TODAS las mutaciones RBAC: evita que dos admins se suspendan o
    -- degraden mutuamente a la vez y dejen el sistema sin administrador activo.
    PERFORM pg_advisory_xact_lock(hashtext('nexo_rbac_mutaciones'));

    v_err := rbac_verificar_admin(p_admin_id);
    IF v_err IS NOT NULL THEN
        RETURN v_err;
    END IF;

    IF btrim(COALESCE(p_nombre, '')) = '' OR btrim(COALESCE(p_telefono, '')) = '' THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'El nombre y el teléfono son obligatorios.');
    END IF;

    IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'El correo electrónico no es válido.');
    END IF;

    IF p_rol IS NULL OR p_rol NOT IN ('ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'DONANTE', 'RECEPTOR') THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'El rol indicado no es válido.');
    END IF;

    IF jsonb_typeof(v_permisos) <> 'array' THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'Los permisos granulares deben ser un arreglo.');
    END IF;

    IF length(btrim(COALESCE(p_motivo, ''))) < 3 THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'El motivo es obligatorio para la bitácora.');
    END IF;

    IF p_organizacion_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM organizaciones WHERE id = p_organizacion_id) THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 404, 'mensaje', 'La organización indicada no existe.');
    END IF;

    BEGIN
        INSERT INTO usuarios
            (nombre, email, rol, telefono, organizacion_id, vehiculo_tipo, permisos_granulares, estado_cuenta)
        VALUES
            (btrim(p_nombre), v_email, p_rol, btrim(p_telefono), p_organizacion_id, p_vehiculo_tipo, v_permisos, 'ACTIVO')
        RETURNING * INTO v_nuevo;
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object('exito', false, 'codigo', 409, 'mensaje', 'Ya existe un usuario con ese correo electrónico.');
        WHEN check_violation THEN
            RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'Algún dato no cumple las reglas de validación (p. ej. tipo de vehículo).');
    END;

    INSERT INTO audit_rbac_eventos (admin_id, usuario_afectado_id, accion, rol_anterior, rol_nuevo, motivo)
    VALUES (p_admin_id, v_nuevo.id, 'CREAR', NULL, v_nuevo.rol, btrim(p_motivo));

    RETURN jsonb_build_object(
        'exito', true, 'codigo', 200,
        'mensaje', 'Usuario creado correctamente.',
        'usuario', rbac_usuario_a_json(v_nuevo)
    );
END;
$$;

-- Cambio de rol (accion EDITAR_ROL).
CREATE OR REPLACE FUNCTION rbac_actualizar_rol(
    p_admin_id UUID,
    p_usuario_id UUID,
    p_rol_nuevo VARCHAR,
    p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_err JSONB;
    v_obj usuarios%ROWTYPE;
    v_rol_anterior TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('nexo_rbac_mutaciones'));

    v_err := rbac_verificar_admin(p_admin_id);
    IF v_err IS NOT NULL THEN
        RETURN v_err;
    END IF;

    IF p_usuario_id IS NULL
       OR p_rol_nuevo IS NULL
       OR p_rol_nuevo NOT IN ('ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'DONANTE', 'RECEPTOR') THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'Usuario o rol no válidos.');
    END IF;

    IF length(btrim(COALESCE(p_motivo, ''))) < 3 THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'El motivo es obligatorio para la bitácora.');
    END IF;

    SELECT * INTO v_obj FROM usuarios WHERE id = p_usuario_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 404, 'mensaje', 'El usuario no existe.');
    END IF;

    IF v_obj.rol = p_rol_nuevo THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 409, 'mensaje', 'El usuario ya tiene ese rol.');
    END IF;

    -- Nunca dejar el sistema sin un administrador activo
    IF v_obj.rol = 'ADMIN' AND v_obj.estado_cuenta = 'ACTIVO'
       AND (SELECT count(*) FROM usuarios WHERE rol = 'ADMIN' AND estado_cuenta = 'ACTIVO') <= 1 THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 409, 'mensaje', 'No se puede cambiar el rol del último administrador activo.');
    END IF;

    v_rol_anterior := v_obj.rol;

    UPDATE usuarios SET rol = p_rol_nuevo WHERE id = p_usuario_id
    RETURNING * INTO v_obj;

    INSERT INTO audit_rbac_eventos (admin_id, usuario_afectado_id, accion, rol_anterior, rol_nuevo, motivo)
    VALUES (p_admin_id, p_usuario_id, 'EDITAR_ROL', v_rol_anterior, p_rol_nuevo, btrim(p_motivo));

    RETURN jsonb_build_object(
        'exito', true, 'codigo', 200,
        'mensaje', 'Rol actualizado correctamente.',
        'usuario', rbac_usuario_a_json(v_obj)
    );
END;
$$;

-- Cambio de estado de cuenta (acciones SUSPENDER / REACTIVAR).
-- Solo se puede pasar a ACTIVO o SUSPENDIDO. Pasar de PENDIENTE_AUTORIZACION a
-- ACTIVO es "autorizar" y se registra como REACTIVAR.
CREATE OR REPLACE FUNCTION rbac_cambiar_estado(
    p_admin_id UUID,
    p_usuario_id UUID,
    p_estado_nuevo VARCHAR,
    p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_err JSONB;
    v_obj usuarios%ROWTYPE;
    v_accion TEXT;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('nexo_rbac_mutaciones'));

    v_err := rbac_verificar_admin(p_admin_id);
    IF v_err IS NOT NULL THEN
        RETURN v_err;
    END IF;

    IF p_usuario_id IS NULL OR p_estado_nuevo IS NULL OR p_estado_nuevo NOT IN ('ACTIVO', 'SUSPENDIDO') THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'Usuario o estado no válidos (solo ACTIVO o SUSPENDIDO).');
    END IF;

    IF length(btrim(COALESCE(p_motivo, ''))) < 3 THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 400, 'mensaje', 'El motivo es obligatorio para la bitácora.');
    END IF;

    SELECT * INTO v_obj FROM usuarios WHERE id = p_usuario_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 404, 'mensaje', 'El usuario no existe.');
    END IF;

    IF v_obj.estado_cuenta = p_estado_nuevo THEN
        RETURN jsonb_build_object('exito', false, 'codigo', 409, 'mensaje', 'La cuenta ya se encuentra en ese estado.');
    END IF;

    IF p_estado_nuevo = 'SUSPENDIDO' THEN
        IF p_usuario_id = p_admin_id THEN
            RETURN jsonb_build_object('exito', false, 'codigo', 409, 'mensaje', 'Un administrador no puede suspender su propia cuenta.');
        END IF;

        IF v_obj.rol = 'ADMIN' AND v_obj.estado_cuenta = 'ACTIVO'
           AND (SELECT count(*) FROM usuarios WHERE rol = 'ADMIN' AND estado_cuenta = 'ACTIVO') <= 1 THEN
            RETURN jsonb_build_object('exito', false, 'codigo', 409, 'mensaje', 'No se puede suspender al último administrador activo.');
        END IF;
    END IF;

    v_accion := CASE WHEN p_estado_nuevo = 'SUSPENDIDO' THEN 'SUSPENDER' ELSE 'REACTIVAR' END;

    UPDATE usuarios SET estado_cuenta = p_estado_nuevo WHERE id = p_usuario_id
    RETURNING * INTO v_obj;

    INSERT INTO audit_rbac_eventos (admin_id, usuario_afectado_id, accion, rol_anterior, rol_nuevo, motivo)
    VALUES (p_admin_id, p_usuario_id, v_accion, v_obj.rol, v_obj.rol, btrim(p_motivo));

    RETURN jsonb_build_object(
        'exito', true, 'codigo', 200,
        'mensaje', CASE WHEN p_estado_nuevo = 'SUSPENDIDO' THEN 'Cuenta suspendida correctamente.' ELSE 'Cuenta activada correctamente.' END,
        'usuario', rbac_usuario_a_json(v_obj)
    );
END;
$$;

COMMENT ON FUNCTION rbac_crear_usuario(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, JSONB, TEXT) IS 'CA-05.2: alta de usuario por un ADMIN activo con bitácora atómica.';
COMMENT ON FUNCTION rbac_actualizar_rol(UUID, UUID, VARCHAR, TEXT) IS 'CA-05.2: cambio de rol por un ADMIN activo con bitácora atómica.';
COMMENT ON FUNCTION rbac_cambiar_estado(UUID, UUID, VARCHAR, TEXT) IS 'CA-05.2: suspensión/reactivación por un ADMIN activo con bitácora atómica.';

-- Permisos: Supabase concede EXECUTE por defecto a anon/authenticated sobre las
-- funciones nuevas del esquema public, así que NO basta con revocar a PUBLIC.
-- Estas funciones solo las ejecuta el servidor (service_role) desde Server Actions.
DO $$
DECLARE
    v_firma TEXT;
    v_rol TEXT;
BEGIN
    FOREACH v_firma IN ARRAY ARRAY[
        'rbac_verificar_admin(UUID)',
        'rbac_usuario_a_json(usuarios)',
        'rbac_crear_usuario(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, JSONB, TEXT)',
        'rbac_actualizar_rol(UUID, UUID, VARCHAR, TEXT)',
        'rbac_cambiar_estado(UUID, UUID, VARCHAR, TEXT)'
    ] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_firma);
        FOREACH v_rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_rol) THEN
                EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', v_firma, v_rol);
            END IF;
        END LOOP;
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        FOREACH v_firma IN ARRAY ARRAY[
            'rbac_crear_usuario(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, JSONB, TEXT)',
            'rbac_actualizar_rol(UUID, UUID, VARCHAR, TEXT)',
            'rbac_cambiar_estado(UUID, UUID, VARCHAR, TEXT)'
        ] LOOP
            EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_firma);
        END LOOP;
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. tomar_donacion: rechaza cuentas SUSPENDIDO / PENDIENTE_AUTORIZACION (403)
--    Misma firma y contrato que 20261028000000_task08_tomar_donacion_endurecida.sql
--    (se conservan privilegios y SECURITY DEFINER). Único cambio: lee estado_cuenta
--    y devuelve 403 antes de tocar la donación.
-- ------------------------------------------------------------------------------
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
    v_usuario_estado TEXT;
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
    SELECT rol, nombre, estado_cuenta INTO v_usuario_rol, v_usuario_nombre, v_usuario_estado
    FROM usuarios
    WHERE id = p_voluntario_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 404,
            'mensaje', 'El voluntario especificado no existe.'
        );
    END IF;

    -- CA-05.2: una cuenta suspendida o sin autorizar no puede tomar donaciones
    IF v_usuario_estado = 'SUSPENDIDO' THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 403,
            'mensaje', 'Tu cuenta está suspendida y no puede tomar donaciones.'
        );
    END IF;

    IF v_usuario_estado = 'PENDIENTE_AUTORIZACION' THEN
        RETURN jsonb_build_object(
            'exito', false, 'codigo', 403,
            'mensaje', 'Tu cuenta está pendiente de autorización y aún no puede tomar donaciones.'
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
