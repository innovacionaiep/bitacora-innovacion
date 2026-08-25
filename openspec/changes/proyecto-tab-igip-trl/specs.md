# Spec: proyecto-tab-igip-trl

## Requirements

### R1 — Tab placement and visibility
The project detail MUST show a tab labeled `IGIP-TRL` with id `IgipTrl` between Indicadores and Presupuesto when the project’s línea has `tabIgipTrlEnabled`. General and Historial remain always visible. New líneas MUST default this flag On.

### R2 — No línea / flag off
Given a project with empty, null, or unknown línea, or with `tabIgipTrlEnabled` false, When the user opens the project, Then the IGIP-TRL tab MUST NOT appear. Server reads and writes MUST reject with an error that the module is not enabled for the línea.

### R3 — Subdimension scores
Each project MAY store six integer scores in range 0–4 inclusive, or null (unset): Originalidad; Estado del Arte; Contribución Social, Ambiental o Productiva; Contribución al Conocimiento; Potencial de Expansión; Transferencia Tecnológica. Invalid values MUST be rejected. Scores MUST be visualized on a 6-axis radar with range 0–4. Null MUST render as 0 on the polygon.

### R4 — Índice IGIP
The tab MUST show a field `Índice IGIP =` with an independent decimal. It MUST NOT affect the radar. Empty/null is allowed. Non-finite numbers MUST be rejected.

### R5 — TRL selection
The tab MUST show TRL 1–7 stacked (1 at top). The selected TRL MUST be highlighted in color; unselected rows MUST be gray with reduced opacity. If none is selected, all rows MUST appear muted. Clicking a row MUST persist that TRL (1–7).

### R6 — Authz
Reads and writes MUST require `requireProjectAccess` with `view.proyectos` plus the línea flag. Tests MUST mock Prisma/NextAuth and MUST NOT write to the real database.

## Scenarios

### S1 Tab order
- Given a línea with all optional tabs On
- When visibleProjectNavTabs is computed
- Then IgipTrl appears immediately after Indicadores and before Presupuesto

### S2 Flag off hides tab and gates server
- Given tabIgipTrlEnabled false
- When the project is opened or IGIP-TRL actions are called
- Then the tab is hidden and actions return an error

### S3 TRL highlight
- Given trl=4
- When the TRL column renders
- Then TRL 4 is selected/color and the rest are muted
