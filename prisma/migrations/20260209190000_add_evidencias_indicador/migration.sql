-- CreateTable
CREATE TABLE "evidencias_indicador" (
    "id" TEXT NOT NULL,
    "indicador_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre_archivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_indicador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidencias_indicador_indicador_id_idx" ON "evidencias_indicador"("indicador_id");

-- AddForeignKey
ALTER TABLE "evidencias_indicador" ADD CONSTRAINT "evidencias_indicador_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "indicadores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
