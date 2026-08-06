-- Improve listUsersByAppRole lookups (filter by role)
CREATE INDEX IF NOT EXISTS "user_roles_role_idx" ON "user_roles"("role");
CREATE INDEX IF NOT EXISTS "user_roles_role_user_id_idx" ON "user_roles"("role", "user_id");
