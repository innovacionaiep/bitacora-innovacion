-- AlterTable
ALTER TABLE "proyectos" ADD COLUMN "linea" TEXT;

-- CreateTable
CREATE TABLE "lineas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fondo_id" TEXT NOT NULL,

    CONSTRAINT "lineas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lineas_fondo_id_idx" ON "lineas"("fondo_id");

-- AddForeignKey
ALTER TABLE "lineas" ADD CONSTRAINT "lineas_fondo_id_fkey" FOREIGN KEY ("fondo_id") REFERENCES "fondos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
