-- AlterTable
ALTER TABLE "activities" ADD COLUMN "validado_por_coordinador" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "activities" ADD COLUMN "validado_por_coordinador_id" TEXT;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_validado_por_coordinador_id_fkey" FOREIGN KEY ("validado_por_coordinador_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
