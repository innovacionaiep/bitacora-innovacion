-- AlterTable
ALTER TABLE "proyecto_participantes" ADD COLUMN "rut" TEXT;
ALTER TABLE "proyecto_participantes" ADD COLUMN "carrera_id" TEXT;
ALTER TABLE "proyecto_participantes" ADD COLUMN "asignatura_id" TEXT;

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "carreras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_asignatura_id_fkey" FOREIGN KEY ("asignatura_id") REFERENCES "asignaturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
