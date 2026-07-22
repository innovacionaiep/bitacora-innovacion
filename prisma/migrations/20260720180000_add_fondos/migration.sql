-- CreateTable
CREATE TABLE "fondos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "fondos_pkey" PRIMARY KEY ("id")
);
