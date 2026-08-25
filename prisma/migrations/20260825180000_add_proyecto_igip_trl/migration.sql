-- Tab IGIP-TRL por línea (default On) y ficha 1:1 por proyecto.
ALTER TABLE "lineas" ADD COLUMN IF NOT EXISTS "tab_igip_trl_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "proyecto_igip" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "originalidad" INTEGER,
    "estado_del_arte" INTEGER,
    "contribucion_social" INTEGER,
    "contribucion_conocimiento" INTEGER,
    "potencial_expansion" INTEGER,
    "transferencia_tecnologica" INTEGER,
    "igip" DECIMAL(12,4),
    "trl" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_igip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_igip_proyecto_id_key" ON "proyecto_igip"("proyecto_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proyecto_igip_proyecto_id_fkey'
  ) THEN
    ALTER TABLE "proyecto_igip"
      ADD CONSTRAINT "proyecto_igip_proyecto_id_fkey"
      FOREIGN KEY ("proyecto_id")
      REFERENCES "proyectos"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
