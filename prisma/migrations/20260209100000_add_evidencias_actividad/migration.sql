-- CreateTable
CREATE TABLE "evidencias_actividad" (
    "id" TEXT NOT NULL,
    "actividad_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre_archivo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evidencias_actividad_actividad_id_idx" ON "evidencias_actividad"("actividad_id");

-- AddForeignKey
ALTER TABLE "evidencias_actividad" ADD CONSTRAINT "evidencias_actividad_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
