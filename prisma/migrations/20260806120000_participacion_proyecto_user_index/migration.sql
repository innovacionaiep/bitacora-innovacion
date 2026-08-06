-- Add supporting index for participation lookups by (proyecto, user).
-- Intentionally NOT a UNIQUE(proyecto_id, user_id): admin@test.cl may hold
-- multiple participation roles; app-level validation enforces 1 role for others.
CREATE INDEX IF NOT EXISTS "proyecto_participantes_proyecto_id_user_id_idx"
ON "proyecto_participantes"("proyecto_id", "user_id");
