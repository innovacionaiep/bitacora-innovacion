/*
  Warnings:

  - You are about to drop the column `escuela` on the `proyectos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "proyectos" DROP COLUMN "escuela",
ADD COLUMN     "focalizacion" TEXT;

-- CreateTable
CREATE TABLE "proyecto_participantes" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escuelas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "escuelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_escuelas" (
    "proyecto_id" TEXT NOT NULL,
    "escuela_id" TEXT NOT NULL,

    CONSTRAINT "proyecto_escuelas_pkey" PRIMARY KEY ("proyecto_id","escuela_id")
);

-- CreateTable
CREATE TABLE "carreras" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "escuela_id" TEXT,

    CONSTRAINT "carreras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_carreras" (
    "proyecto_id" TEXT NOT NULL,
    "carrera_id" TEXT NOT NULL,

    CONSTRAINT "proyecto_carreras_pkey" PRIMARY KEY ("proyecto_id","carrera_id")
);

-- CreateTable
CREATE TABLE "comunas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "comunas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_comunas" (
    "proyecto_id" TEXT NOT NULL,
    "comuna_id" TEXT NOT NULL,

    CONSTRAINT "proyecto_comunas_pkey" PRIMARY KEY ("proyecto_id","comuna_id")
);

-- CreateTable
CREATE TABLE "grupos_interes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "grupos_interes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_grupos_interes" (
    "proyecto_id" TEXT NOT NULL,
    "grupo_interes_id" TEXT NOT NULL,

    CONSTRAINT "proyecto_grupos_interes_pkey" PRIMARY KEY ("proyecto_id","grupo_interes_id")
);

-- CreateTable
CREATE TABLE "socios_comunitarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "socios_comunitarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_socios_comunitarios" (
    "proyecto_id" TEXT NOT NULL,
    "socio_comunitario_id" TEXT NOT NULL,

    CONSTRAINT "proyecto_socios_comunitarios_pkey" PRIMARY KEY ("proyecto_id","socio_comunitario_id")
);

-- CreateTable
CREATE TABLE "objetivos_proyecto" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objetivos_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_participantes_proyecto_id_user_id_key" ON "proyecto_participantes"("proyecto_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "escuelas_codigo_key" ON "escuelas"("codigo");

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_participantes" ADD CONSTRAINT "proyecto_participantes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_escuelas" ADD CONSTRAINT "proyecto_escuelas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_escuelas" ADD CONSTRAINT "proyecto_escuelas_escuela_id_fkey" FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carreras" ADD CONSTRAINT "carreras_escuela_id_fkey" FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_carreras" ADD CONSTRAINT "proyecto_carreras_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_carreras" ADD CONSTRAINT "proyecto_carreras_carrera_id_fkey" FOREIGN KEY ("carrera_id") REFERENCES "carreras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_comunas" ADD CONSTRAINT "proyecto_comunas_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_comunas" ADD CONSTRAINT "proyecto_comunas_comuna_id_fkey" FOREIGN KEY ("comuna_id") REFERENCES "comunas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_grupos_interes" ADD CONSTRAINT "proyecto_grupos_interes_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_grupos_interes" ADD CONSTRAINT "proyecto_grupos_interes_grupo_interes_id_fkey" FOREIGN KEY ("grupo_interes_id") REFERENCES "grupos_interes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_socios_comunitarios" ADD CONSTRAINT "proyecto_socios_comunitarios_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_socios_comunitarios" ADD CONSTRAINT "proyecto_socios_comunitarios_socio_comunitario_id_fkey" FOREIGN KEY ("socio_comunitario_id") REFERENCES "socios_comunitarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos_proyecto" ADD CONSTRAINT "objetivos_proyecto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
