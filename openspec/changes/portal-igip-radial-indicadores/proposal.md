# portal-igip-radial-indicadores

## Intent
Añadir el gráfico radial IGIP de 6 subdimensiones (0–4) al tab Indicadores del portal, solo para la familia IGIP, con capas Inicial (verde), Proyección/Final (rojo) y Promedio (azul). Alimentar las notas desde Data → Indicadores Técnicos (subvistas IGIP/TRL y grupos de estadio colapsables). Las 18 notas viven en `VitrinaProyecto` y no sincronizan con `ProyectoIgip` ni con los índices decimales IGIP.

## Capabilities
- portal-igip-radial-indicadores

## Rollback
Revertir UI, helpers y el change OpenSpec. La migración es aditiva (18 columnas nullable); no borrar filas ni seeds. No tocar `proyecto_igip`.

## Status
In progress
