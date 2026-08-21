-- Flags de tabs de proyecto por línea. Fuente de verdad deja de ser el fondo.
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_convenio_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_participantes_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_actividades_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_indicadores_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_presupuesto_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_seguimiento_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_escalamiento_enabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "lineas" AS l
SET "tab_convenio_enabled" = f."convenios_enabled"
FROM "fondos" AS f
WHERE l."fondo_id" = f."id";

UPDATE "lineas" AS l
SET "tab_escalamiento_enabled" = f."escalamiento_enabled"
FROM "fondos" AS f
WHERE l."fondo_id" = f."id";
