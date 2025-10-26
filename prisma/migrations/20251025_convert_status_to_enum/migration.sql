-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('TODO', 'WAITING', 'IN_PROGRESS', 'DONE');

-- AlterTable
-- Primero, convertir la columna status existente a tipo enum
ALTER TABLE "activities" ALTER COLUMN "status" TYPE "ActivityStatus" USING (status::"ActivityStatus");

-- Asegurar que el default sea correcto
ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'TODO'::"ActivityStatus";

