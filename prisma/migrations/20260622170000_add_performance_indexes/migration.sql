-- Índices de rendimiento (solo CREATE INDEX — no modifica ni elimina datos)
-- items_presupuesto(proyecto_id) ya existe desde 20260202000000_add_presupuesto_items

-- CreateIndex
CREATE INDEX IF NOT EXISTS "activities_project_id_idx" ON "activities"("project_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_activity_id_idx" ON "tasks"("activity_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "indicadores_proyecto_id_idx" ON "indicadores"("proyecto_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "objetivos_proyecto_proyecto_id_idx" ON "objetivos_proyecto"("proyecto_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "proyecto_participantes_user_id_rol_idx" ON "proyecto_participantes"("user_id", "rol");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "historial_proyecto_proyecto_id_fecha_idx" ON "historial_proyecto"("proyecto_id", "fecha" DESC);
