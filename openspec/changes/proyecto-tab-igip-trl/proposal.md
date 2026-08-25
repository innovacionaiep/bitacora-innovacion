# proyecto-tab-igip-trl

## Intent
Añadir el tab **IGIP-TRL** en el detalle de proyecto (entre Indicadores y Presupuesto) con radar de 6 subdimensiones (0–4), índice IGIP decimal independiente y selector TRL 1–7, persistidos por proyecto. El tab es opcional por línea (default On).

## Capabilities
- proyecto-tab-igip-trl

## Rollback
Revertir el tab, las server actions y la columna `Linea.tabIgipTrlEnabled`. No borrar filas de `proyecto_igip` ni otros datos de negocio. No sincroniza con vitrina.

## Status
In progress
