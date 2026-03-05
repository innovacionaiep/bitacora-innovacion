-- Eliminar todo lo relacionado con reuniones de seguimiento (ya no se hace seguimiento de reuniones en la app).

-- 1. Quitar FK y columna reunion_id de compromisos_proyecto
ALTER TABLE "compromisos_proyecto" DROP CONSTRAINT IF EXISTS "compromisos_proyecto_reunion_id_fkey";
ALTER TABLE "compromisos_proyecto" DROP COLUMN IF EXISTS "reunion_id";

-- 2. Eliminar tablas que dependen de reuniones_seguimiento (en orden por FKs)
DROP TABLE IF EXISTS "puntos_reunion";
DROP TABLE IF EXISTS "tareas_marcadas_en_reunion";
DROP TABLE IF EXISTS "indicadores_actualizados_en_reunion";
DROP TABLE IF EXISTS "puntos_foda";
DROP TABLE IF EXISTS "temas_presupuesto_reunion";

-- 3. Eliminar tabla principal de reuniones
DROP TABLE IF EXISTS "reuniones_seguimiento";

-- 4. Quitar columnas de reuniones en proyectos
ALTER TABLE "proyectos" DROP COLUMN IF EXISTS "reuniones_hechas";
ALTER TABLE "proyectos" DROP COLUMN IF EXISTS "reuniones_totales";
