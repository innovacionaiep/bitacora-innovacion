-- Migración para agregar campos faltantes a la tabla de tareas
-- Ejecutar este script en Supabase SQL Editor

-- Agregar campos faltantes a la tabla tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Actualizar las tareas existentes con fechas por defecto si no las tienen
UPDATE tasks 
SET start_date = CURRENT_DATE, 
    end_date = CURRENT_DATE + INTERVAL '1 day'
WHERE start_date IS NULL OR end_date IS NULL;

-- Hacer los campos de fecha NOT NULL después de actualizar
ALTER TABLE tasks 
ALTER COLUMN start_date SET NOT NULL,
ALTER COLUMN end_date SET NOT NULL;

-- Crear índices para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
