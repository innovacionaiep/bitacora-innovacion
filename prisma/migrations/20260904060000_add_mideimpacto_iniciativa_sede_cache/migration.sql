-- CreateTable
CREATE TABLE "mideimpacto_iniciativa_sede_cache" (
    "inic_codigo" TEXT NOT NULL,
    "sede_nombres" TEXT NOT NULL DEFAULT '',
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mideimpacto_iniciativa_sede_cache_pkey" PRIMARY KEY ("inic_codigo")
);
