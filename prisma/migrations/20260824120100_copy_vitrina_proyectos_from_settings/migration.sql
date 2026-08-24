-- Copia proyectos reales desde system_settings (key = vitrina_proyectos).
-- No modifica ni borra la fila JSON de respaldo.

INSERT INTO "vitrina_proyectos" (
    "id",
    "nombre",
    "descripcion",
    "encargado_nombre",
    "encargado_correo",
    "encargado_cargo",
    "video_url",
    "cover_offset_x",
    "cover_offset_y",
    "cover_zoom",
    "descripcion_font_size",
    "igip_inicial",
    "igip_inicial_comentario",
    "igip_proyeccion",
    "igip_final",
    "igip_final_comentario",
    "trl_inicial",
    "trl_inicial_comentario",
    "trl_proyeccion",
    "trl_final",
    "trl_final_comentario",
    "orden",
    "created_at",
    "updated_at"
)
SELECT
    COALESCE(NULLIF(btrim(elem->>'id'), ''), gen_random_uuid()::text),
    btrim(elem->>'nombre'),
    COALESCE(elem->>'descripcion', ''),
    COALESCE(elem->>'encargadoNombre', ''),
    COALESCE(elem->>'encargadoCorreo', ''),
    COALESCE(elem->>'encargadoCargo', ''),
    NULLIF(btrim(COALESCE(elem->>'videoUrl', '')), ''),
    CASE
        WHEN (elem->>'coverOffsetX') ~ '^[0-9]+(\.[0-9]+)?$' THEN LEAST(100, GREATEST(0, round((elem->>'coverOffsetX')::numeric)))::integer
        ELSE 50
    END,
    CASE
        WHEN (elem->>'coverOffsetY') ~ '^[0-9]+(\.[0-9]+)?$' THEN LEAST(100, GREATEST(0, round((elem->>'coverOffsetY')::numeric)))::integer
        ELSE 50
    END,
    CASE
        WHEN (elem->>'coverZoom') ~ '^[0-9]+(\.[0-9]+)?$' THEN LEAST(3, GREATEST(1, (elem->>'coverZoom')::double precision))
        ELSE 1
    END,
    CASE
        WHEN (elem->>'descripcionFontSize') ~ '^[0-9]+(\.[0-9]+)?$' THEN LEAST(28, GREATEST(12, round((elem->>'descripcionFontSize')::numeric)))::integer
        ELSE 15
    END,
    CASE
        WHEN (elem->>'igipInicial') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (elem->>'igipInicial')::decimal(12,4)
        ELSE NULL
    END,
    COALESCE(elem->>'igipInicialComentario', ''),
    CASE
        WHEN (elem->>'igipProyeccion') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (elem->>'igipProyeccion')::decimal(12,4)
        ELSE NULL
    END,
    CASE
        WHEN (elem->>'igipFinal') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (elem->>'igipFinal')::decimal(12,4)
        ELSE NULL
    END,
    COALESCE(elem->>'igipFinalComentario', ''),
    CASE
        WHEN (elem->>'trlInicial') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN round((elem->>'trlInicial')::numeric)::integer
        ELSE NULL
    END,
    COALESCE(elem->>'trlInicialComentario', ''),
    CASE
        WHEN (elem->>'trlProyeccion') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN round((elem->>'trlProyeccion')::numeric)::integer
        ELSE NULL
    END,
    CASE
        WHEN (elem->>'trlFinal') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN round((elem->>'trlFinal')::numeric)::integer
        ELSE NULL
    END,
    COALESCE(elem->>'trlFinalComentario', ''),
    (ord - 1)::integer,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) WITH ORDINALITY AS t(elem, ord)
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND NULLIF(btrim(elem->>'nombre'), '') IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "vitrina_proyecto_fotos" ("id", "vitrina_proyecto_id", "url", "public_id", "orden")
SELECT
    gen_random_uuid()::text,
    vp.id,
    foto->>'url',
    foto->>'publicId',
    (foto_ord - 1)::integer
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(elem->'fotos', '[]'::jsonb)) WITH ORDINALITY AS f(foto, foto_ord)
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'fotos', '[]'::jsonb)) = 'array'
  AND NULLIF(btrim(foto->>'url'), '') IS NOT NULL
  AND NULLIF(btrim(foto->>'publicId'), '') IS NOT NULL
  AND foto->>'url' LIKE 'https://%'
  AND (foto_ord - 1) < 4;

INSERT INTO "vitrina_proyecto_fondos" ("vitrina_proyecto_id", "fondo_id")
SELECT DISTINCT vp.id, cat_id
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(elem->'fondoIds', '[]'::jsonb)) AS cat_id
JOIN "fondos" c ON c.id = cat_id
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'fondoIds', '[]'::jsonb)) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO "vitrina_proyecto_lineas" ("vitrina_proyecto_id", "linea_id")
SELECT DISTINCT vp.id, cat_id
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(elem->'lineaIds', '[]'::jsonb)) AS cat_id
JOIN "lineas" c ON c.id = cat_id
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'lineaIds', '[]'::jsonb)) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO "vitrina_proyecto_sedes" ("vitrina_proyecto_id", "sede_id")
SELECT DISTINCT vp.id, cat_id
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(elem->'sedeIds', '[]'::jsonb)) AS cat_id
JOIN "sedes" c ON c.id = cat_id
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'sedeIds', '[]'::jsonb)) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO "vitrina_proyecto_escuelas" ("vitrina_proyecto_id", "escuela_id")
SELECT DISTINCT vp.id, cat_id
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(elem->'escuelaIds', '[]'::jsonb)) AS cat_id
JOIN "escuelas" c ON c.id = cat_id
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'escuelaIds', '[]'::jsonb)) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO "vitrina_proyecto_socios" ("vitrina_proyecto_id", "socio_comunitario_id")
SELECT DISTINCT vp.id, cat_id
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(elem->'socioIds', '[]'::jsonb)) AS cat_id
JOIN "socios_comunitarios" c ON c.id = cat_id
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'socioIds', '[]'::jsonb)) = 'array'
ON CONFLICT DO NOTHING;

INSERT INTO "vitrina_proyecto_etiquetas" ("vitrina_proyecto_id", "etiqueta_id")
SELECT DISTINCT vp.id, cat_id
FROM "system_settings" s
CROSS JOIN LATERAL jsonb_array_elements(s.value::jsonb) AS elem
JOIN "vitrina_proyectos" vp ON vp.id = NULLIF(btrim(elem->>'id'), '')
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(elem->'etiquetaIds', '[]'::jsonb)) AS cat_id
JOIN "etiquetas" c ON c.id = cat_id
WHERE s.key = 'vitrina_proyectos'
  AND left(btrim(s.value), 1) = '['
  AND jsonb_typeof(COALESCE(elem->'etiquetaIds', '[]'::jsonb)) = 'array'
ON CONFLICT DO NOTHING;
