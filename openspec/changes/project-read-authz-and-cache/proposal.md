# project-read-authz-and-cache

## Intent
Scope project list/dashboard/activity reads to the session user; key caches by userId+role; tighten participant email lookup and last_active queries.

## Applied
- `getProyectos` → `getProyectosParaUsuarioPorRolActivo`
- `getProyectosDashboard` filtered + per-user cache key
- `getActivities` → `requireProjectAccess`
- `isParticipantWithActiveRole` email = indexed equals insensitive
- `getLastActiveByUserId(userIds)` scoped query
