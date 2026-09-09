# Design: portal-fondo-colors

## Data
- Add nullable `Fondo.colorHex` (`color_hex`). No seeds and no backfill of invented colors.
- Name-based `vitrinaFondoStripeClass` / `vitrinaFondoFillColor` remain the fallback.

## Resolution
- `buildFondoColorMap` from catalog rows with valid hex.
- `vitrinaFondoFillColor(nombre, map)` and `vitrinaFondoStripePaint` prefer the map, then legacy classes.
- Dynamic hex cannot use Tailwind JIT; custom colors use inline `backgroundColor`.

## UI
- New tab in `VitrinaAiSettingsModal` (same admin gear).
- Actions: `getPortalFondoColors` / `savePortalFondoColors` with `requireAdmin`.
- Portal page already loads catalogs; include `colorHex` and provide a React context for cards and dashboards.
