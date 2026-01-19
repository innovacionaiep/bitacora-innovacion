-- CreateTable
CREATE TABLE "indicadores" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "objetivo_especifico_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "forma_calculo" TEXT NOT NULL,
    "resultado_esperado" TEXT NOT NULL,
    "resultado_alcanzado" TEXT NOT NULL DEFAULT '0',
    "porcentaje_cumplimiento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentaje_avance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "indicadores_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "indicadores" ADD CONSTRAINT "indicadores_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicadores" ADD CONSTRAINT "indicadores_objetivo_especifico_id_fkey" FOREIGN KEY ("objetivo_especifico_id") REFERENCES "objetivos_proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

