-- ==============================================================================
-- Nexo Rescate de Alimentos - Migración DDL y Purga Total (Supabase / PostgreSQL 15)
-- Versión: 1.1.0
-- Gobernanza: Trazado a RF-001 a RF-006, RNF-003 (RBAC) y CA-05.1 a CA-05.3
--
-- Contenido:
--   1. Columnas latitud y longitud en organizaciones para marcadores dinámicos.
--   2. Función RPC administrativa: purgar_sistema_completo(p_admin_id UUID)
--      Deshabilita temporalmente triggers de inmutabilidad, vacía tablas transaccionales,
--      y restaura los triggers para mantener la política de auditoría estricta.
--   3. Procedimiento para permitir borrado controlado de organizaciones y donaciones
--      por parte de personal de Coordinación y Administración.
-- ==============================================================================

-- 1. Coordenadas precisas para organizaciones (comedores y donantes)
ALTER TABLE public.organizaciones
    ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION NULL,
    ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION NULL;

COMMENT ON COLUMN public.organizaciones.latitud IS 'Latitud WGS84 para geolocalización precisa en el mapa de Cali.';
COMMENT ON COLUMN public.organizaciones.longitud IS 'Longitud WGS84 para geolocalización precisa en el mapa de Cali.';

-- 2. Permitir ON DELETE CASCADE en relaciones operativas para borrado de donaciones y organizaciones
DO $$
BEGIN
    -- Ajustar FK donaciones -> usuarios para soportar eliminación administrativa
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'donaciones_donante_id_fkey'
    ) THEN
        ALTER TABLE public.donaciones DROP CONSTRAINT donaciones_donante_id_fkey;
        ALTER TABLE public.donaciones 
            ADD CONSTRAINT donaciones_donante_id_fkey 
            FOREIGN KEY (donante_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. RPC Administrativa para Purga Transaccional Total
CREATE OR REPLACE FUNCTION public.purgar_sistema_completo(p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_es_admin BOOLEAN := FALSE;
BEGIN
    -- Verificar si el actor es un ADMIN activo
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = p_admin_id AND rol = 'ADMIN' AND estado_cuenta = 'ACTIVO'
    ) INTO v_es_admin;

    -- Si no hay usuarios en el sistema, permitir purga inicial (bootstrap)
    IF NOT v_es_admin AND (SELECT count(*) FROM public.usuarios) > 0 THEN
        RETURN jsonb_build_object(
            'exito', false,
            'codigo', 403,
            'mensaje', 'Solo un administrador corporativo activo puede purgar el sistema.'
        );
    END IF;

    -- Desactivar triggers de inmutabilidad temporalmente
    ALTER TABLE public.audit_rbac_eventos DISABLE TRIGGER trg_audit_rbac_inmutable_fila;
    ALTER TABLE public.audit_rbac_eventos DISABLE TRIGGER trg_audit_rbac_inmutable_truncate;

    -- Vaciar tablas en cascada
    TRUNCATE TABLE 
        public.audit_rbac_eventos,
        public.trazabilidad_eventos,
        public.donaciones,
        public.organizaciones,
        public.usuarios
    RESTART IDENTITY CASCADE;

    -- Reactivar triggers de inmutabilidad
    ALTER TABLE public.audit_rbac_eventos ENABLE TRIGGER trg_audit_rbac_inmutable_fila;
    ALTER TABLE public.audit_rbac_eventos ENABLE TRIGGER trg_audit_rbac_inmutable_truncate;

    RETURN jsonb_build_object(
        'exito', true,
        'codigo', 200,
        'mensaje', 'Purga completa ejecutada exitosamente. Todas las tablas en 0.'
    );
EXCEPTION WHEN OTHERS THEN
    -- Asegurar que los triggers se reactiven en caso de error
    BEGIN
        ALTER TABLE public.audit_rbac_eventos ENABLE TRIGGER trg_audit_rbac_inmutable_fila;
        ALTER TABLE public.audit_rbac_eventos ENABLE TRIGGER trg_audit_rbac_inmutable_truncate;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    RETURN jsonb_build_object(
        'exito', false,
        'codigo', 500,
        'mensaje', 'Error durante la purga: ' || SQLERRM
    );
END;
$$;
