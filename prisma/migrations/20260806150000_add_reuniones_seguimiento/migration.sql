-- CreateTable
CREATE TABLE "reuniones_seguimiento" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resumen" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reuniones_seguimiento_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "compromisos_proyecto" ADD COLUMN "reunion_id" TEXT;

-- CreateIndex
CREATE INDEX "reuniones_seguimiento_proyecto_id_idx" ON "reuniones_seguimiento"("proyecto_id");

-- CreateIndex
CREATE UNIQUE INDEX "reuniones_seguimiento_proyecto_id_numero_key" ON "reuniones_seguimiento"("proyecto_id", "numero");

-- CreateIndex
CREATE INDEX "compromisos_proyecto_reunion_id_idx" ON "compromisos_proyecto"("reunion_id");

-- AddForeignKey
ALTER TABLE "reuniones_seguimiento" ADD CONSTRAINT "reuniones_seguimiento_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compromisos_proyecto" ADD CONSTRAINT "compromisos_proyecto_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reuniones_seguimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
