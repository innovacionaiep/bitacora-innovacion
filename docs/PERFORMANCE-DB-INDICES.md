# Informe: índices de rendimiento en base de datos (Fase 3)

**Estado:** ✅ Aplicada en producción (2026-06-22) — migración `20260622170000_add_performance_indexes`.  
**Nota:** `items_presupuesto(proyecto_id)` ya existía desde `20260202000000_add_presupuesto_items`; solo se sincronizó en `schema.prisma`.

## Contexto

La aplicación Bemindr usa PostgreSQL en Supabase (producción con usuarios reales).  
Las optimizaciones de índices son **no destructivas**: solo añaden estructuras de lectura; no modifican filas existentes.

## Estado actual del schema (revisión 2026-06-22)

| Tabla | Índice propuesto | ¿Ya existe? | Notas |
|-------|------------------|-------------|-------|
| `activities` | `(project_id)` | **No** | Sin `@@index` en schema |
| `tasks` | `(activity_id)` | **No** | Sin `@@index` en schema |
| `indicadores` | `(proyecto_id)` | **No** | Solo índices en tablas hijas (`comentarios`, `evidencias`) |
| `objetivos_proyecto` | `(proyecto_id)` | **No** | Sin `@@index` en schema |
| `items_presupuesto` | `(proyecto_id)` | **No** | Sin `@@index` en schema |
| `proyecto_participantes` | `(user_id, rol)` | **Parcial** | Existe `@@unique([proyectoId, userId, rol])`; falta índice por `user_id` solo o `(user_id, rol)` para portal/permisos |
| `historial_proyecto` | `(proyecto_id, fecha DESC)` | **Parcial** | Existe `@@index([proyectoId])` y `@@index([userId])`; el compuesto con `fecha DESC` acelera ordenación |

## Índices recomendados (pendientes de aprobación)

| Tabla | Índice | Consultas beneficiadas | Impacto esperado | Prioridad |
|-------|--------|------------------------|------------------|-----------|
| `activities` | `(project_id)` | Gantt, recálculo de avance, alertas portal | Alto | **Alta** |
| `tasks` | `(activity_id)` | Carga de tareas por actividad | Medio | Media |
| `indicadores` | `(proyecto_id)` | Tab indicadores, portal, resumen | Alto | **Alta** |
| `objetivos_proyecto` | `(proyecto_id)` | Carga de indicadores por objetivo | Medio | Media |
| `items_presupuesto` | `(proyecto_id)` | Tab presupuesto, alertas encargado | Alto | **Alta** |
| `proyecto_participantes` | `(user_id)` o `(user_id, rol)` | Permisos, listados portal, filtros por rol | Alto | **Alta** |
| `historial_proyecto` | `(proyecto_id, fecha DESC)` | Historial ordenado por fecha (mejora sobre índice simple) | Medio-Bajo | Baja |

## Riesgos y mitigaciones

### Riesgo de pérdida de datos

**Ninguno.** `CREATE INDEX` no altera ni elimina datos. Es una operación segura en tablas en producción.

### Riesgos operativos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Bloqueo breve durante creación de índice | Baja | En Supabase/PostgreSQL 14+, usar migración estándar Prisma; para tablas muy grandes considerar `CREATE INDEX CONCURRENTLY` manual |
| Mayor uso de disco | Muy baja | Estimación: KB–pocos MB por índice con volumen actual |
| Inserts/updates ligeramente más lentos | Muy baja | Despreciable con el volumen actual de la app |
| Migración mal generada con `DROP` accidental | Media | **Revisar SQL** de la migración antes de deploy; debe contener solo `CREATE INDEX` |

### Lo que NO se hará sin aprobación

- `prisma migrate reset`
- Seeds o scripts de población
- `DELETE` / `UPDATE` masivos
- Cambios de columnas o denormalización
- Ejecución directa contra producción sin revisar el SQL

## SQL esperado (referencia)

Tras `npx prisma migrate dev --name add_performance_indexes`, el archivo generado debería parecerse a:

```sql
CREATE INDEX "activities_project_id_idx" ON "activities"("project_id");
CREATE INDEX "tasks_activity_id_idx" ON "tasks"("activity_id");
CREATE INDEX "indicadores_proyecto_id_idx" ON "indicadores"("proyecto_id");
CREATE INDEX "objetivos_proyecto_proyecto_id_idx" ON "objetivos_proyecto"("proyecto_id");
CREATE INDEX "items_presupuesto_proyecto_id_idx" ON "items_presupuesto"("proyecto_id");
CREATE INDEX "proyecto_participantes_user_id_rol_idx" ON "proyecto_participantes"("user_id", "rol");
CREATE INDEX "historial_proyecto_proyecto_id_fecha_idx" ON "historial_proyecto"("proyecto_id", "fecha" DESC);
```

Los nombres exactos dependerán de Prisma. **Verificar que no haya `DROP TABLE`, `ALTER COLUMN` ni `TRUNCATE`.**

## Procedimiento seguro propuesto

1. Añadir `@@index` en `prisma/schema.prisma` para cada tabla listada.
2. Ejecutar localmente: `npx prisma migrate dev --name add_performance_indexes`
3. Revisar el SQL en `prisma/migrations/<timestamp>_add_performance_indexes/migration.sql`
4. Probar la app en local contra la BD de desarrollo/staging (sin seeds).
5. En producción: `npx prisma migrate deploy` desde CI o máquina autorizada.
6. Monitorear latencia de queries en Supabase Dashboard (24–48 h).

## Cambios de lógica (opcionales, fase posterior)

| Cambio | Beneficio | Riesgo |
|--------|-----------|--------|
| `AVG(porcentaje_avance)` agrupado en portal | Menos datos transferidos | Bajo — mismo resultado |
| Consolidar filtros de historial en una query | Menos round-trips | Bajo |
| Reducir queries en `recalculateActivityProgress` | Toggle de tarea más rápido | Medio — validar avanceGantt |
| Subir `connection_limit` de 1 a 2–3 en Vercel | Menos serialización | Medio — monitorear pool Supabase |

## Aprobación requerida

Para proceder con la migración de índices, confirma explícitamente:

1. Has revisado este informe.
2. Autorizas la creación de la migración y su deploy en producción.
3. Tienes ventana para monitorear post-deploy.

Sin esa confirmación, **no se aplicará ningún cambio de esquema en la base de datos.**
