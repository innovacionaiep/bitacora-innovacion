# portal-fondo-colors

## Intent
Allow an admin to set the stripe/fill color of each catalog fondo from the portal configuration dialog, so project cards and charts use those colors instead of only name-based defaults.

## Capabilities
- portal-fondo-colors

## Rollback
Drop usage of `Fondo.colorHex` in UI and actions. Do not drop the column in a later rollback unless explicitly requested (no destructive DML).

## Status
Applied (implementation in tree).
