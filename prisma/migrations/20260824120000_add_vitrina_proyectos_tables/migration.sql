-- CreateTable
CREATE TABLE "vitrina_proyectos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "encargado_nombre" TEXT NOT NULL DEFAULT '',
    "encargado_correo" TEXT NOT NULL DEFAULT '',
    "encargado_cargo" TEXT NOT NULL DEFAULT '',
    "video_url" TEXT,
    "cover_offset_x" INTEGER NOT NULL DEFAULT 50,
    "cover_offset_y" INTEGER NOT NULL DEFAULT 50,
    "cover_zoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "descripcion_font_size" INTEGER NOT NULL DEFAULT 15,
    "igip_inicial" DECIMAL(12,4),
    "igip_inicial_comentario" TEXT NOT NULL DEFAULT '',
    "igip_proyeccion" DECIMAL(12,4),
    "igip_final" DECIMAL(12,4),
    "igip_final_comentario" TEXT NOT NULL DEFAULT '',
    "trl_inicial" INTEGER,
    "trl_inicial_comentario" TEXT NOT NULL DEFAULT '',
    "trl_proyeccion" INTEGER,
    "trl_final" INTEGER,
    "trl_final_comentario" TEXT NOT NULL DEFAULT '',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vitrina_proyectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_fotos" (
    "id" TEXT NOT NULL,
    "vitrina_proyecto_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "vitrina_proyecto_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_fondos" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "fondo_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_fondos_pkey" PRIMARY KEY ("vitrina_proyecto_id","fondo_id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_lineas" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "linea_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_lineas_pkey" PRIMARY KEY ("vitrina_proyecto_id","linea_id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_sedes" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "sede_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_sedes_pkey" PRIMARY KEY ("vitrina_proyecto_id","sede_id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_escuelas" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "escuela_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_escuelas_pkey" PRIMARY KEY ("vitrina_proyecto_id","escuela_id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_socios" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "socio_comunitario_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_socios_pkey" PRIMARY KEY ("vitrina_proyecto_id","socio_comunitario_id")
);

-- CreateTable
CREATE TABLE "vitrina_proyecto_etiquetas" (
    "vitrina_proyecto_id" TEXT NOT NULL,
    "etiqueta_id" TEXT NOT NULL,

    CONSTRAINT "vitrina_proyecto_etiquetas_pkey" PRIMARY KEY ("vitrina_proyecto_id","etiqueta_id")
);

-- CreateIndex
CREATE INDEX "vitrina_proyectos_nombre_idx" ON "vitrina_proyectos"("nombre");

-- CreateIndex
CREATE INDEX "vitrina_proyectos_orden_idx" ON "vitrina_proyectos"("orden");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_fotos_vitrina_proyecto_id_idx" ON "vitrina_proyecto_fotos"("vitrina_proyecto_id");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_fondos_fondo_id_idx" ON "vitrina_proyecto_fondos"("fondo_id");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_lineas_linea_id_idx" ON "vitrina_proyecto_lineas"("linea_id");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_sedes_sede_id_idx" ON "vitrina_proyecto_sedes"("sede_id");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_escuelas_escuela_id_idx" ON "vitrina_proyecto_escuelas"("escuela_id");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_socios_socio_comunitario_id_idx" ON "vitrina_proyecto_socios"("socio_comunitario_id");

-- CreateIndex
CREATE INDEX "vitrina_proyecto_etiquetas_etiqueta_id_idx" ON "vitrina_proyecto_etiquetas"("etiqueta_id");

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_fotos" ADD CONSTRAINT "vitrina_proyecto_fotos_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_fondos" ADD CONSTRAINT "vitrina_proyecto_fondos_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_fondos" ADD CONSTRAINT "vitrina_proyecto_fondos_fondo_id_fkey" FOREIGN KEY ("fondo_id") REFERENCES "fondos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_lineas" ADD CONSTRAINT "vitrina_proyecto_lineas_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_lineas" ADD CONSTRAINT "vitrina_proyecto_lineas_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "lineas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_sedes" ADD CONSTRAINT "vitrina_proyecto_sedes_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_sedes" ADD CONSTRAINT "vitrina_proyecto_sedes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_escuelas" ADD CONSTRAINT "vitrina_proyecto_escuelas_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_escuelas" ADD CONSTRAINT "vitrina_proyecto_escuelas_escuela_id_fkey" FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_socios" ADD CONSTRAINT "vitrina_proyecto_socios_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_socios" ADD CONSTRAINT "vitrina_proyecto_socios_socio_comunitario_id_fkey" FOREIGN KEY ("socio_comunitario_id") REFERENCES "socios_comunitarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_etiquetas" ADD CONSTRAINT "vitrina_proyecto_etiquetas_vitrina_proyecto_id_fkey" FOREIGN KEY ("vitrina_proyecto_id") REFERENCES "vitrina_proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitrina_proyecto_etiquetas" ADD CONSTRAINT "vitrina_proyecto_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiquetas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
