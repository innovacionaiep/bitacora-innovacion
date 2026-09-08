# portal-avances-vcm-excel

## Intent
Alimentar el subtab Avances «Vinculación con el Medio» con un snapshot Excel local (mismo archivo OneDrive que Fondo Impulsa, hoja `Fondo VcM`). El invitado Causalab (nivel 0) MUST seguir viendo solo Fondo Impulsa.

## Capabilities
- portal-avances-vcm-excel

## Rollback
Quitar el tab de configuración VcM, la key `portal_avances_vcm` del merge de Avances y volver `source: 'external'` en ese fondo. No borrar otras keys ni datos de proyectos. No ejecutar seeds ni DML destructivo.

## Status
In progress
