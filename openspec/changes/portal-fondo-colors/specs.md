# Spec: portal-fondo-colors

## Requirements

### R1 — Persist color per fondo
Each catalog `Fondo` MAY store an optional hex color (`#RRGGBB`). Empty/null MUST restore the existing name-based palette (Impulsa, Innovación Docente, Incuba, hashed fallback).

### R2 — Portal settings UI
An admin opening the portal configuration dialog MUST see a “Colores de fondos” section listing every catalog fondo with a color picker and hex field, and MUST be able to save changes.

### R3 — Apply in portal
Project card stripes, Análisis fondo/línea bars (when the bar follows the parent fondo), and Indicadores fondo fills MUST use the stored color when present. Lookup is by fondo name (normalized, accent-insensitive). A multi-fondo card label (`A · B`) MUST use the first fondo’s color when that fondo has a stored color.

### R4 — Authorization
Reading stored colors for public portal rendering MUST not require admin. Getting the editor list and saving colors MUST require admin (`requireAdmin`). Invalid hex MUST be rejected without writing.

## Scenarios

### S1 Default without stored color
- Given Fondo Impulsa with `colorHex` null
- When a card or chart renders that fondo
- Then the stripe/fill MUST remain emerald (`#059669` / `bg-emerald-600`)

### S2 Custom color
- Given Fondo Impulsa with `colorHex` `#123456`
- When a card or chart renders that fondo
- Then the background MUST be `#123456`

### S3 Save from settings
- Given an admin and a fondo id
- When they save `{ id, colorHex: "#aabbcc" }`
- Then the row MUST persist that hex and the portal MUST revalidate
