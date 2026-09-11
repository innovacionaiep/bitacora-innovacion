# links-publicos-proyecto

## Intent
Allow Admin to generate one indefinite public link per project so anyone with the URL can view the internal project ficha (all línea tabs) read-only, without login or sidebar, and revoke that link from Configuración.

## Capabilities
- links-publicos-proyecto

## Rollback
Revert schema/code. Keep the additive table `proyecto_links_publicos` (do not drop rows). Caducar is `revokedAt` UPDATE, never DELETE.

## Status
In progress
