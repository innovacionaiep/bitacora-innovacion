# Spec: portal-avances-tab

## Requirements

### R1 — Fuente distinta a vitrina
El tab Avances MUST alimentarse de proyectos en curso (`Proyecto`), no de `VitrinaProyecto`. MUST NOT aplicar `aiMatchIds` de la vitrina.

### R2 — Fondos de la botonera
El tab MUST mostrar, en este orden: Innovación Docente; Reto Innovador de Especialidad; Fondo Impulsa; MOVE Incuba; MoveLab; Proyectos Nacionales; Vinculación con el Medio; Fondos Externos. Solo los dos primeros MUST cargar filas internas (match `Proyecto.fondo` exacto). El resto MUST mostrar la misma tabla vacía.

### R3 — Columnas
La tabla MUST mostrar: Nombre proyecto, Sede, Escuelas (nombres M2M, a la derecha de Sede), Presupuesto adjudicado, Gantt, Indicadores, Operativo solicitado, Operativo ejecutado, Honorarios, Delta. MUST NOT mostrar Línea. El nombre MUST ser texto, sin enlace.

### R4 — Autorización
`getPortalAvancesProyectos` MUST exigir `resolvePortalAccess` con `portalCanSeeView(level, 'avances')`. MUST NOT exigir `view.fondos`. Nivel 1 MUST NOT recibir este payload. MUST NOT cargar participantes ni PII.

### R5 — Sidebar en Avances
En Avances, Fondo y Etiqueta MUST estar ocultos. Buscar, Sede y Escuela MUST filtrar las filas del fondo seleccionado. El estado de filtros MUST ser independiente del de vitrina.

### R6 — Tests
Tests MUST mock Prisma/acceso y MUST NOT escribir a la base real.

## Scenarios

### S1 Fuente app vs vacía
- Given filas internas de Innovación Docente y de Fondo Impulsa
- When se selecciona Innovación Docente
- Then se listan las filas internas
- When se selecciona Fondo Impulsa
- Then la tabla está vacía

### S2 Sidebar
- Given el tab Avances
- When se renderiza el sidebar
- Then no aparecen Fondo ni Etiqueta
- And buscar/sede/escuela recortan el fondo activo

### S3 Gate
- Given acceso nivel 1 o none
- When se llama getPortalAvancesProyectos
- Then no se consultan proyectos y se devuelve error o vacío autorizado
