-- CreateTable
CREATE TABLE "vitrina_proyecto_comunas" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "comuna_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_comunas_pkey" PRIMARY KEY ("vitrina_proyecto_id","comuna_id")
);

-- CreateIndex
CREATE INDEX "vitrina_proyecto_comunas_comuna_id_idx" ON "vitrina_proyecto_comunas"("comuna_id");

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_comunas" ADD CONSTRAINT "vitrina_proyecto_comunas_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_comunas" ADD CONSTRAINT "vitrina_proyecto_comunas_comuna_id_fkey" FOREIGN KEY ("comuna_id") REFERENCES "comunas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
