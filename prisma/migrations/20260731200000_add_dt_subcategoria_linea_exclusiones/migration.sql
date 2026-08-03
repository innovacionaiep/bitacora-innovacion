-- Opt-out: elementos de desarrollo técnico deshabilitados por línea de fondo.
-- Sin filas = el elemento aplica a todas las líneas.
CREATE TABLE IF NOT EXISTS "desarrollo_tecnico_subcategoria_lineas_excluidas" (
    "id" TEXT NOT NULL,
    "subcategoria_id" TEXT NOT NULL,
    "linea_id" TEXT NOT NULL,

    CONSTRAINT "desarrollo_tecnico_subcategoria_lineas_excluidas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "desarrollo_tecnico_subcategoria_lineas_excluidas_subcategoria_id_linea_id_key"
  ON "desarrollo_tecnico_subcategoria_lineas_excluidas"("subcategoria_id", "linea_id");

CREATE INDEX IF NOT EXISTS "desarrollo_tecnico_subcategoria_lineas_excluidas_linea_id_idx"
  ON "desarrollo_tecnico_subcategoria_lineas_excluidas"("linea_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'desarrollo_tecnico_subcategoria_lineas_excluidas_subcategoria_id_fkey'
  ) THEN
    ALTER TABLE "desarrollo_tecnico_subcategoria_lineas_excluidas"
      ADD CONSTRAINT "desarrollo_tecnico_subcategoria_lineas_excluidas_subcategoria_id_fkey"
      FOREIGN KEY ("subcategoria_id")
      REFERENCES "desarrollo_tecnico_subcategorias"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'desarrollo_tecnico_subcategoria_lineas_excluidas_linea_id_fkey'
  ) THEN
    ALTER TABLE "desarrollo_tecnico_subcategoria_lineas_excluidas"
      ADD CONSTRAINT "desarrollo_tecnico_subcategoria_lineas_excluidas_linea_id_fkey"
      FOREIGN KEY ("linea_id")
      REFERENCES "lineas"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
