-- AlterTable
ALTER TABLE "proyecto_participantes" ADD COLUMN "sede_id" TEXT;
ALTER TABLE "proyecto_participantes" ADD COLUMN "escuela_id" TEXT;

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_escuela_id_fkey" FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
