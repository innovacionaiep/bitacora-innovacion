-- CreateTable
CREATE TABLE "desarrollo_tecnico_categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "desarrollo_tecnico_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desarrollo_tecnico_subcategorias" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT NOT NULL DEFAULT 'FileText',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "campo_key" TEXT,

    CONSTRAINT "desarrollo_tecnico_subcategorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desarrollo_tecnico_valores" (
    "id" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "subcategoria_id" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "desarrollo_tecnico_valores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "desarrollo_tecnico_valores_proyecto_id_subcategoria_id_key" ON "desarrollo_tecnico_valores"("proyecto_id", "subcategoria_id");

-- AddForeignKey
ALTER TABLE "desarrollo_tecnico_subcategorias" ADD CONSTRAINT "desarrollo_tecnico_subcategorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "desarrollo_tecnico_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desarrollo_tecnico_valores" ADD CONSTRAINT "desarrollo_tecnico_valores_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desarrollo_tecnico_valores" ADD CONSTRAINT "desarrollo_tecnico_valores_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "desarrollo_tecnico_subcategorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
