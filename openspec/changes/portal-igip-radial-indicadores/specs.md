# Spec: portal-igip-radial-indicadores

## Requirements

### R1 — Radial chart type (IGIP only)
The portal Indicadores tab MUST offer a chart type `Radial` next to Dumbbell and Sankey when the family is IGIP. The Radial control MUST NOT appear for TRL or Ambos. Switching to TRL MUST keep the existing reset to Sankey.

### R2 — Layers and colors
The radial MUST use the same 6-axis SVG geometry as the project IGIP-TRL tab (range 0–4). Green MUST be Inicial of the selector set. Red MUST be drawn behind green and MUST be Proyección or Final according to the existing destination pill. Blue Promedio MUST be Inicial of all tab projects (sidebar-filtered), ignoring the selector. Null scores MUST be omitted from averages; an axis with no values MUST render as 0.

### R3 — Project selector
An empty selector MUST mean all tab projects. One or more selected ids MUST average those projects. If the resolved selection is empty, it MUST fall back to all tab projects.

### R4 — Data submenu IGIP / TRL
When Data → Indicadores Técnicos is active, a secondary tablist IGIP | TRL MUST appear to the right. IGIP MUST show only IGIP columns. TRL MUST show only TRL columns. Default family MUST be IGIP.

### R5 — Subdimension columns
For each visible IGIP stadium, the six subdimension columns MUST sit immediately to the left of that stadium’s IGIP index (Inicial, Proyección, Final). Scores MUST be integers 0–4 or null. They MUST NOT overwrite decimal IGIP indexes.

### R6 — Stadium chips and expand
Three independent chips Inicial / Proyección / Final MUST default On. Off MUST hide the entire stadium (six notes + index + comments). Expandir subdimensiones MUST default Off; On MUST reveal the six notes of visible stadiums.

### R7 — Independence
Reads and writes MUST NOT sync with `ProyectoIgip`. Tests MUST NOT write to the real database.

## Scenarios

### S1 Radial only for IGIP
- Given Indicadores with family TRL
- When the chart type tabs render
- Then Radial is absent
- When the user selects IGIP
- Then Radial appears beside Dumbbell and Sankey

### S2 Selector averages and Promedio ignores selector
- Given two projects with distinct Inicial originalidad 2 and 4
- When none are selected
- Then green originalidad is 3
- When only the first is selected and Promedio is on
- Then green originalidad is 2 and blue originalidad is 3

### S3 Data IGIP columns
- Given Indicadores Técnicos and family IGIP with subdimensions expanded
- When Inicial is visible
- Then Originalidad appears to the left of IGIP Inicial
- When the user selects TRL
- Then IGIP columns are hidden and TRL columns remain
