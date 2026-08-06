# enabled-roles-no-active-role

## Intent
Eliminate "active role" as a product concept. Account-level permissions become the union of enabled roles (`UserRole`). Project-scoped actions use the single participation role (`ProyectoParticipante.rol`). Exception: `admin@test.cl` may hold multiple participation roles in one project.

## Capabilities
- enabled-roles-union-authz
- single-participation-role-per-project
- portal-all-participations

## Rollback
Revert authz helpers/guards, permissions provider, portal/listado filters, create-project role picker, and copy changes. Schema unique index (if applied) requires a follow-up migration to drop the partial unique index.

## Status
In progress.
