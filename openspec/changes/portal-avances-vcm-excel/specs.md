# Spec: portal-avances-vcm-excel

## Requirements

### R1 — Fuente Excel
Vinculación con el Medio MUST usar `source: 'excel'`. MUST leer la misma planilla local que Impulsa y la hoja `Fondo VcM` (configurable). MUST persistir un snapshot JSON en `system_settings` con key `portal_avances_vcm`. MUST NOT leer el archivo en runtime cloud (`VERCEL=1`). MUST reutilizar el parser de columnas de Impulsa.

### R2 — Causalab
Nivel 0 MUST ver solo Fondo Impulsa en la botonera de Avances. `getPortalAvancesProyectos` MUST NOT incluir filas VcM en el payload de nivel 0.

### R3 — Configuración
El modal Configuración del portal MUST tener una sección «Vinculación con el Medio» independiente de Impulsa (ruta, hoja, Guardar ruta, Probar archivo, Probar hoja, Actualizar). Solo admin.

### R4 — Tabla
En Avances, Vinculación con el Medio MUST usar las mismas columnas Excel que Impulsa (incluye Encargado/a). IDs de fila MUST ser `vcm:{rowNumber}`.

### R5 — Tests
Tests MUST mock Prisma/acceso/fs. MUST NOT escribir a la base real ni insertar datos ficticios persistidos.

## Scenarios

### S1 Nivel 2
- Given snapshot VcM con filas
- When un invitado nivel 2 abre Avances / Vinculación con el Medio
- Then se listan esas filas

### S2 Causalab
- Given snapshot VcM e Impulsa con filas
- When un invitado nivel 0 abre Avances
- Then solo aparece Fondo Impulsa y el payload no incluye filas `vcm:`

### S3 Cloud
- Given `VERCEL=1`
- When un admin pulsa Actualizar en VcM
- Then falla con mensaje de solo local
