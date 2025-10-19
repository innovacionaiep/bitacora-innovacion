-- CreateTable
CREATE TABLE "desarrollo_tecnico" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "continuidad_fases_anteriores" TEXT,
    "pertinencia_local" TEXT,
    "pertinencia_disciplinar" TEXT,
    "necesidad_problema" TEXT,
    "publico_objetivo" TEXT,
    "solucion_avance" TEXT,
    "perspective_genero" TEXT,
    "resultados_contribucion" TEXT,
    "metodologia_medicion" TEXT,
    "ejes_impacto" TEXT,
    "factor_innovador" TEXT,
    "escalabilidad" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desarrollo_tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "desarrollo_tecnico_proyecto_id_key" ON "desarrollo_tecnico"("proyecto_id");

-- AddForeignKey
ALTER TABLE "desarrollo_tecnico" ADD CONSTRAINT "desarrollo_tecnico_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
