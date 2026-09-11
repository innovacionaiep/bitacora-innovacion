-- Links públicos de ficha de proyecto (caducar = revoked_at, nunca DELETE).
CREATE TABLE IF NOT EXISTS "proyecto_links_publicos" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "proyecto_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "proyecto_links_publicos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_links_publicos_token_key" ON "proyecto_links_publicos"("token");
CREATE INDEX IF NOT EXISTS "proyecto_links_publicos_proyecto_id_idx" ON "proyecto_links_publicos"("proyecto_id");
CREATE INDEX IF NOT EXISTS "proyecto_links_publicos_proyecto_id_revoked_at_idx" ON "proyecto_links_publicos"("proyecto_id", "revoked_at");
CREATE UNIQUE INDEX IF NOT EXISTS "proyecto_links_publicos_one_active"
ON "proyecto_links_publicos" ("proyecto_id")
WHERE "revoked_at" IS NULL;

ALTER TABLE "proyecto_links_publicos"
ADD CONSTRAINT "proyecto_links_publicos_proyecto_id_fkey"
FOREIGN KEY ("proyecto_id") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "proyecto_links_publicos"
ADD CONSTRAINT "proyecto_links_publicos_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
