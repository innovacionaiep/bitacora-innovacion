-- CreateTable
CREATE TABLE "proyecto_borradores" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_borradores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proyecto_borradores_user_id_idx" ON "proyecto_borradores"("user_id");

-- AddForeignKey
ALTER TABLE "proyecto_borradores" ADD CONSTRAINT "proyecto_borradores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
