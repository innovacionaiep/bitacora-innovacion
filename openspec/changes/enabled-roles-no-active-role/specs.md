# Specs — enabled-roles-no-active-role

## enabled-roles-union-authz

### Requirements
- Global permission checks MUST evaluate the union of the user's enabled roles against the RolePermission matrix (Admin enabled ⇒ all permissions).
- `requireAdmin` / Admin UI gates MUST use presence of enabled role `Admin`, not `activeRole`.
- Client permission provider MUST expose the union of enabled roles (no active-role selector).
- JWT MUST stop accepting client-driven `activeRole` updates for authorization; session continues to expose `availableRoles`.

### Acceptance
- Unit tests cover `userHasEnabledRole`, `anyRoleHasPermission`, and Admin bypass.
- Sidebar/layouts that used `activeRole` use union / Admin-enabled instead.

## single-participation-role-per-project

### Requirements
- A linked account (`userId` set) MAY have at most one `ProyectoParticipante` row per project, except email `admin@test.cl`.
- Project-scoped authorization MUST use that participation role's matrix permissions (plus Admin-enabled global bypass).
- Creating a project MUST require choosing the creator's participation role from their enabled participation-capable roles.
- Adding/updating participants MUST reject a second role for the same account/email in the project (except the admin exception).

### Acceptance
- Pure helpers and Server Action validation enforce uniqueness.
- Read-only audit lists existing duplicates before any unique index migration.
- Partial unique index `(proyecto_id, user_id) WHERE user_id IS NOT NULL` applied only when audit is clean (exception rows for admin@test.cl handled in app validation, not index exemptions if duplicates exist for that email).

## portal-all-participations

### Requirements
- Portal Inicio MUST list all projects the user participates in (no filter by active role).
- "Mis proyectos" MUST show a "Mi rol" column.
- Compromisos/alertas/historial panels aggregate across all participations; per-item actions still respect the participation role for that project.
