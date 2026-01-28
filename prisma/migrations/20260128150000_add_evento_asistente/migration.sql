-- CreateTable
CREATE TABLE "evento_asistentes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_asistentes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_asistentes_post_id_idx" ON "evento_asistentes"("post_id");

-- CreateIndex
CREATE INDEX "evento_asistentes_user_id_idx" ON "evento_asistentes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "evento_asistentes_post_id_user_id_key" ON "evento_asistentes"("post_id", "user_id");

-- AddForeignKey
ALTER TABLE "evento_asistentes" ADD CONSTRAINT "evento_asistentes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_asistentes" ADD CONSTRAINT "evento_asistentes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

