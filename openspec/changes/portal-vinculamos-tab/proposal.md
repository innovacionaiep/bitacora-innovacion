# portal-vinculamos-tab

## Intent
Agregar el tab Vinculamos al portal público (a la derecha de Data), visible solo con nivel 3, alimentado por GET de iniciativas de la API Externa v1 de MideImpacto. Solo lectura. El token vive en servidor (`MIDEIMPACTO_API_KEY`).

## Capabilities
- portal-vinculamos-tab

## Rollback
Quitar el tab, el cliente HTTP, la action `getMideimpactoIniciativas` y la tabla caché de sede. No borrar otras tablas ni datos locales.

## Status
In progress
