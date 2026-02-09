-- AlterTable
ALTER TABLE "indicadores" ADD COLUMN "validado_por_coordinador" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "indicadores" ADD COLUMN "validado_por_coordinador_id" TEXT;

-- CreateIndex
CREATE INDEX "indicadores_validado_por_coordinador_id_idx" ON "indicadores"("validado_por_coordinador_id");

-- AddForeignKey
ALTER TABLE "indicadores" ADD CONSTRAINT "indicadores_validado_por_coordinador_id_fkey" FOREIGN KEY ("validado_por_coordinador_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
