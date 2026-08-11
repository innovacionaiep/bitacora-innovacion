-- AlterTable: fondos — feature flag escalamiento
ALTER TABLE "fondos" ADD COLUMN IF NOT EXISTS "escalamiento_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Activar Escalamiento para Innovación Docente
UPDATE "fondos"
SET "escalamiento_enabled" = true
WHERE "nombre" = 'Innovación Docente';

-- CreateTable: proyecto_escalamiento
CREATE TABLE IF NOT EXISTS "proyecto_escalamiento" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "nueva_instancia_1" TEXT,
    "nueva_instancia_2" TEXT,
    "acuerdo_continuidad" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_escalamiento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_escalamiento_proyecto_id_key" ON "proyecto_escalamiento"("proyecto_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proyecto_escalamiento_proyecto_id_fkey'
  ) THEN
    ALTER TABLE "proyecto_escalamiento"
      ADD CONSTRAINT "proyecto_escalamiento_proyecto_id_fkey"
      FOREIGN KEY ("proyecto_id")
      REFERENCES "proyectos"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
