-- CreateEnum
CREATE TYPE "CuentaPresupuesto" AS ENUM ('RRHH', 'OPERACION', 'INVERSION');

-- CreateEnum
CREATE TYPE "EstadoGastoPresupuesto" AS ENUM ('PENDIENTE', 'SOLICITADO', 'EN_PEDIDO', 'EJECUTADO_OK');

-- CreateTable
CREATE TABLE "items_presupuesto" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "cuenta" "CuentaPresupuesto" NOT NULL,
    "item" TEXT NOT NULL,
    "detalle" TEXT,
    "monto" INTEGER NOT NULL,
    "estado" "EstadoGastoPresupuesto" NOT NULL DEFAULT 'PENDIENTE',
    "id_solicitud" TEXT,
    "id_pedido" TEXT,
    "id_recepcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecciones_presupuesto" (
    "id" TEXT NOT NULL,
    "item_presupuesto_id" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "monto" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecciones_presupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_presupuesto_proyecto_id_idx" ON "items_presupuesto"("proyecto_id");

-- CreateIndex
CREATE UNIQUE INDEX "proyecciones_presupuesto_item_presupuesto_id_mes_anio_key" ON "proyecciones_presupuesto"("item_presupuesto_id", "mes", "anio");

-- AddForeignKey
ALTER TABLE "items_presupuesto" ADD CONSTRAINT "items_presupuesto_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecciones_presupuesto" ADD CONSTRAINT "proyecciones_presupuesto_item_presupuesto_id_fkey" FOREIGN KEY ("item_presupuesto_id") REFERENCES "items_presupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
