-- Remove coordinator validation feature columns (schema only; no row deletes)

-- Activities
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_validado_por_coordinador_id_fkey";
ALTER TABLE "activities" DROP COLUMN IF EXISTS "validado_por_coordinador_id";
ALTER TABLE "activities" DROP COLUMN IF EXISTS "validado_por_coordinador";

-- Indicadores
ALTER TABLE "indicadores" DROP CONSTRAINT IF EXISTS "indicadores_validado_por_coordinador_id_fkey";
DROP INDEX IF EXISTS "indicadores_validado_por_coordinador_id_idx";
ALTER TABLE "indicadores" DROP COLUMN IF EXISTS "validado_por_coordinador_id";
ALTER TABLE "indicadores" DROP COLUMN IF EXISTS "validado_por_coordinador";

-- Compromisos
ALTER TABLE "compromisos_proyecto" DROP COLUMN IF EXISTS "validado_por_coordinador";
