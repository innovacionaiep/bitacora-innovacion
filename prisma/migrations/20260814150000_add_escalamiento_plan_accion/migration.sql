-- AlterTable: proyecto_escalamiento — plan de acción de 8 filas (JSON)
ALTER TABLE "proyecto_escalamiento" ADD COLUMN IF NOT EXISTS "plan_accion" JSONB;
