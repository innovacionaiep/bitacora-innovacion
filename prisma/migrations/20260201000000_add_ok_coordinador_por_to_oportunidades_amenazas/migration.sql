-- AlterTable
ALTER TABLE "oportunidades_amenazas" ADD COLUMN "ok_coordinador_por_id" TEXT,
ADD COLUMN "ok_coordinador_por_rol_activo" TEXT;

-- CreateIndex
CREATE INDEX "oportunidades_amenazas_ok_coordinador_por_id_idx" ON "oportunidades_amenazas"("ok_coordinador_por_id");

-- AddForeignKey
ALTER TABLE "oportunidades_amenazas" ADD CONSTRAINT "oportunidades_amenazas_ok_coordinador_por_id_fkey" FOREIGN KEY ("ok_coordinador_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
