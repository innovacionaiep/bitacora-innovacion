-- AlterTable: fondos — feature flag convenios
ALTER TABLE "fondos" ADD COLUMN IF NOT EXISTS "convenios_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: proyectos — convenio firmado metadata
ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "convenio_firmado_url" TEXT;
ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "convenio_firmado_public_id" TEXT;
ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "convenio_firmado_nombre" TEXT;
ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "convenio_firmado_at" TIMESTAMP(3);
ALTER TABLE "proyectos" ADD COLUMN IF NOT EXISTS "convenio_firmado_by_user_id" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'proyectos_convenio_firmado_by_user_id_fkey'
  ) THEN
    ALTER TABLE "proyectos"
      ADD CONSTRAINT "proyectos_convenio_firmado_by_user_id_fkey"
      FOREIGN KEY ("convenio_firmado_by_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
