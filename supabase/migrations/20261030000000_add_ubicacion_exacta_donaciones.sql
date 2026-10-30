-- ==============================================================================
-- Nexo Rescate de Alimentos - Migración DDL (Supabase / PostgreSQL 15)
-- Versión: 1.1.0
-- Gobernanza: Trazado a CMP-01, CA-01.1, CA-01.5, RNF-001, RNF-002
-- Objetivo: Almacenar campos opcionales de georreferenciación y contacto en donaciones
-- ==============================================================================

ALTER TABLE donaciones
  ADD COLUMN IF NOT EXISTS indicaciones_puesto TEXT NULL,
  ADD COLUMN IF NOT EXISTS telefono_donante VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS latitud NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS longitud NUMERIC(10, 7) NULL;

COMMENT ON COLUMN donaciones.indicaciones_puesto IS 'Indicaciones específicas del puesto, muelle o pabellón en plaza de mercado';
COMMENT ON COLUMN donaciones.telefono_donante IS 'Teléfono de contacto o WhatsApp del donante para coordinación logística';
COMMENT ON COLUMN donaciones.latitud IS 'Latitud WGS84 para cartografía OpenStreetMap';
COMMENT ON COLUMN donaciones.longitud IS 'Longitud WGS84 para cartografía OpenStreetMap';
