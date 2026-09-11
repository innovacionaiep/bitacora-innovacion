# Spec: links-publicos-proyecto

## Requirements

### R1 — Config tab
Admin with `view.ajustes` MUST see Configuración → Links públicos. The panel MUST list all project names in a dropdown. When a project is selected and it has no active link, the UI MUST show Generar link público. When it has an active link, the UI MUST show the absolute URL, a copy action, and Caducar link.

### R2 — One active link
A project MUST have at most one active public link (`revokedAt` is null). Generating MUST fail if one is already active. Caducar MUST set `revokedAt` and MUST NOT delete the row. After caducar, Generar MUST create a new token.

### R3 — Indefinite until revoked
An active link MUST NOT expire by time. Only Caducar (or a later generate after caducar) invalidates access.

### R4 — Public route
`GET /p/{token}` MUST be reachable without login. Invalid or revoked tokens MUST NOT show the ficha. Valid tokens MUST render the same tabs as `/proyectos` for that project's línea except **Convenio** (MUST be hidden), read-only, without the app sidebar or project list.

### R5 — Read-only
The public view MUST hide mutation UI (edit, import, upload, add participant/activity, drag-and-drop reorder). Drag-and-drop MUST NOT start a mutation. Server mutations MUST still require a session even if a public-link cookie is present.

### R6 — Read access
Project GET loaders that currently require `requireProjectAccess` MUST accept `requireProjectReadAccess`: session access OR an active public-link cookie (or ALS token) for that same project.

## Scenarios

### S1 Generate then caducar
- Given an admin selects a project with no active link
- When they generate
- Then a hex token URL `/p/{token}` is shown
- When they caducar
- Then the same token MUST no longer open the ficha

### S2 One active
- Given a project already has an active link
- When generate is called
- Then it MUST fail without inserting another active row

### S3 Guest view
- Given a valid token
- When a guest opens `/p/{token}`
- Then they see the project tabs and MUST NOT see the left sidebar
