-- AlterTable
ALTER TABLE "proyecto_participantes" ADD COLUMN "socio_comunitario_id" TEXT;

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_socio_comunitario_id_fkey" FOREIGN KEY ("socio_comunitario_id") REFERENCES "socios_comunitarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
