-- CreateTable
CREATE TABLE "asignaturas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "asignaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_asignaturas" (
    "proyecto_id" TEXT NOT NULL,
    "asignatura_id" TEXT NOT NULL,

    CONSTRAINT "proyecto_asignaturas_pkey" PRIMARY KEY ("proyecto_id","asignatura_id")
);

-- AddForeignKey
ALTER TABLE "proyecto_asignaturas" ADD CONSTRAINT "proyecto_asignaturas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_asignaturas" ADD CONSTRAINT "proyecto_asignaturas_asignatura_id_fkey" FOREIGN KEY ("asignatura_id") REFERENCES "asignaturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
