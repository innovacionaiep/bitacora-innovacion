# Design: links-publicos-proyecto

## Data
`ProyectoLinkPublico`: unique `token` (32-byte hex), `proyectoId`, `createdAt`, `createdById`, `revokedAt`. Partial unique index: one active row per project.

Caducar = UPDATE `revokedAt`. Never DELETE.

## Config
`/configuracion/links-publicos` + nav item. Actions in `configuracion-links-publicos.ts` gated with `requireAdmin`. Display URL with `window.location.origin`.

## Public route
`/p/[token]` is a light route (middleware + RouteAwareShell like vitrina). Layout mounts QueryProvider only (no AuthenticatedShell). Middleware sets httpOnly cookie `gp_public_link`.

First load uses `getProyectoPublicoVista(token)` via AsyncLocalStorage token override so GET loaders work before the browser stores the cookie.

## Read vs write
`requireProjectAccess` stays session-only (mutations often use `view.proyectos`). New `requireProjectReadAccess` for GET only.

## UI
`ProyectoPublicoFicha` reuses project tabs. `PublicProjectViewProvider` (`readOnly`) hides mutation chrome. `HoverEditButton` no-ops in public view.

## Downloads
`/api/cloudinary-download` and `/api/evidencia-download` allow session OR a valid active public-link cookie.
