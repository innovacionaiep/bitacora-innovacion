# portal-avances-tab

## Intent
Reemplazar el placeholder del tab Avances del portal público con una tabla tipo Fondos, alimentada por proyectos en curso (`Proyecto`) solo para Innovación Docente y Reto Innovador de Especialidad. El resto de fondos de una botonera fija queda vacío. Los filtros del sidebar en este tab usan esa fuente y ocultan Fondo y Etiqueta.

## Capabilities
- portal-avances-tab

## Rollback
Revertir el tab a placeholder, la action `getPortalAvancesProyectos` y el estado de filtros de Avances. No borrar datos de `proyectos` ni de vitrina. No integrar Excel/OneDrive.

## Status
In progress
