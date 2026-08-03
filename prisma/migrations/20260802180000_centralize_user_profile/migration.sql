-- AlterTable: perfil centralizado en users
ALTER TABLE "users" ADD COLUMN "rut" TEXT;
ALTER TABLE "users" ADD COLUMN "cargo" TEXT;
ALTER TABLE "users" ADD COLUMN "sede_id" TEXT;
ALTER TABLE "users" ADD COLUMN "escuela_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_escuela_id_fkey" FOREIGN KEY ("escuela_id") REFERENCES "escuelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill (solo INSERT/UPDATE sobre datos reales; sin DELETE ni seeds)

-- 1) Crear Users pendientes para emails de participantes syncables sin User existente
INSERT INTO "users" ("id", "email", "name", "password", "created_at", "updated_at")
SELECT
  'cm' || substr(md5(d.email_norm || gen_random_uuid()::text), 1, 22),
  d.email_norm,
  (
    SELECT pp2.nombre
    FROM "proyecto_participantes" pp2
    WHERE pp2.email IS NOT NULL
      AND lower(trim(pp2.email)) = d.email_norm
      AND pp2.nombre IS NOT NULL
      AND trim(pp2.nombre) <> ''
    ORDER BY pp2.created_at DESC
    LIMIT 1
  ),
  NULL,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT lower(trim(email)) AS email_norm
  FROM "proyecto_participantes"
  WHERE email IS NOT NULL
    AND trim(email) <> ''
    AND rol IN ('Encargado', 'Coordinador', 'Colaborador', 'Docente', 'Estudiante')
) d
WHERE NOT EXISTS (
  SELECT 1 FROM "users" u WHERE lower(trim(u.email)) = d.email_norm
);

-- 2) Copiar perfil desde participantes hacia users (solo si el user aún no tiene el campo)
UPDATE "users" u
SET
  "rut" = COALESCE(u."rut", src.rut),
  "cargo" = COALESCE(u."cargo", src.cargo),
  "sede_id" = COALESCE(u."sede_id", src.sede_id),
  "escuela_id" = COALESCE(u."escuela_id", src.escuela_id),
  "name" = COALESCE(NULLIF(trim(u."name"), ''), src.nombre)
FROM (
  SELECT DISTINCT ON (lower(trim(pp.email)))
    lower(trim(pp.email)) AS email_norm,
    pp.rut,
    pp.cargo,
    pp.sede_id,
    pp.escuela_id,
    pp.nombre
  FROM "proyecto_participantes" pp
  WHERE pp.email IS NOT NULL
    AND trim(pp.email) <> ''
    AND pp.rol IN ('Encargado', 'Coordinador', 'Colaborador', 'Docente', 'Estudiante')
  ORDER BY lower(trim(pp.email)), pp.created_at DESC
) src
WHERE lower(trim(u.email)) = src.email_norm;

-- 3) Enlazar participantes huérfanos syncables por email (evitar conflicto unique proyecto+user+rol)
UPDATE "proyecto_participantes" pp
SET user_id = u.id
FROM "users" u
WHERE pp.user_id IS NULL
  AND pp.email IS NOT NULL
  AND trim(pp.email) <> ''
  AND lower(trim(pp.email)) = lower(trim(u.email))
  AND pp.rol IN ('Encargado', 'Coordinador', 'Colaborador', 'Docente', 'Estudiante')
  AND NOT EXISTS (
    SELECT 1
    FROM "proyecto_participantes" pp2
    WHERE pp2.proyecto_id = pp.proyecto_id
      AND pp2.user_id = u.id
      AND pp2.rol = pp.rol
  );

-- 4) Asegurar UserRole por cada participación syncable vinculada
INSERT INTO "user_roles" ("id", "user_id", "role", "created_at")
SELECT
  'cm' || substr(md5(pp.user_id || pp.rol || gen_random_uuid()::text), 1, 22),
  pp.user_id,
  pp.rol,
  NOW()
FROM (
  SELECT DISTINCT user_id, rol
  FROM "proyecto_participantes"
  WHERE user_id IS NOT NULL
    AND rol IN ('Encargado', 'Coordinador', 'Colaborador', 'Docente', 'Estudiante')
) pp
WHERE NOT EXISTS (
  SELECT 1 FROM "user_roles" ur
  WHERE ur.user_id = pp.user_id AND ur.role = pp.rol
);

-- 5) active_role si está vacío y hay roles
UPDATE "users" u
SET "active_role" = (
  SELECT ur.role
  FROM "user_roles" ur
  WHERE ur.user_id = u.id
  ORDER BY ur.created_at ASC
  LIMIT 1
)
WHERE u."active_role" IS NULL
  AND EXISTS (SELECT 1 FROM "user_roles" ur WHERE ur.user_id = u.id);
