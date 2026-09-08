# Spec: portal-vinculamos-tab

## Requirements

### R1 — Tab y visibilidad
El portal MUST mostrar el tab Vinculamos a la derecha de Data. MUST ser visible solo con nivel 3. Niveles 0–2 MUST NOT ver el tab ni recibir el payload.

### R2 — Fuente
El tab MUST alimentarse de GET `https://api.mideimpacto.com/api/external/v1/iniciativas?page={page}` con `Authorization: Bearer` desde `MIDEIMPACTO_API_KEY`. MUST NOT usar `include=adjuntos`. MUST NOT persistir el payload completo de iniciativas. MAY persistir solo un lookup de sede (`inic_codigo`, nombres de sede, `fetched_at`) copiado de GET `/iniciativas/{id}`. MUST NOT enviar el token al cliente ni loguearlo.

### R3 — Tabla
La tabla MUST ser de solo lectura. MUST mostrar una fila por iniciativa con este subconjunto aplanado: ID, código legado, nombre, estado, brecha, diagnóstico, fechas de inicio y término, mecanismo, tipo de actividad, sede, Sede*, Escuela, Estudiantes, Estudiantes final, Docentes, Docentes final, Región, Provincia, Comuna, Socio Comunitario, Grupo, Subgrupo, Beneficiarios, Beneficiarios Final, Grupos de Interés y Temáticas. MUST NOT mostrar Visible, Año, Año hasta, Creado, INDI, contribuciones, ODS, EDR, Pacto educativo, recursos, productos, responsables, adjuntos, Participantes (indicadores), Pregunta ni Respuesta. Sede* / Escuela / Estudiantes / Estudiantes final / Docentes / Docentes final, Región / Provincia / Comuna, Socio Comunitario / Grupo / Subgrupo / Beneficiarios / Beneficiarios Final, Grupos de Interés y Temáticas MUST ser columnas del header principal (Sede* distinta de Sede). Varias escuelas, territorios o participantes externos de la misma iniciativa MUST apilarse en esas celdas sin repetir encabezados ni explotar la fila. Grupos de Interés MUST mapear la pregunta «¿La iniciativa se desarrolla con alguno de los siguientes grupos?» y Temáticas «¿La iniciativa aborda alguna de las siguientes temáticas?». Cada respuesta MUST mostrarse como chip/tag, partiendo `opciones_seleccionadas[].respuesta` por `|`. Participantes externos MUST leer el array anidado `participantes` (`soco_nombre`, `grupo_nombre`, `subgrupo_nombre`, `total_participantes`, `total_participantes_final`). Celdas vacías MUST mostrar `—`. El header MUST permanecer fijo al scrollear verticalmente y MUST permitir redimensionar el ancho de cada columna arrastrando el borde derecho (72–960 px). El listado MUST NOT bloquearse esperando GET de detalle por fila.

### R4 — Autorización
`getMideimpactoIniciativas` MUST exigir `resolvePortalAccess` y `portalCanSeeView(level, 'vinculamos')`. Si el gate falla, MUST NOT llamar a la API. Si falta la API key, MUST devolver error sin fetch.

### R5 — Paginación y errores
La action MUST pedir una sola página con `?page=`. La UI MUST concatenar las páginas 2…N en serie sobre la misma tabla (sin Anterior/Siguiente) y mostrar el progreso. 401/403/429/5xx del **listado** MUST mostrarse con mensaje claro (token inválido, sin permiso `iniciativas:read`, límite de solicitudes) sin filtrar el token. Un 429 al concatenar MUST reintentar y MUST NOT borrar las filas ya cargadas. La action MUST NOT unir caché de sede ni agendar drip de detalle.

### R6 — Tests
Tests MUST mock fetch, acceso y Prisma. MUST NOT escribir a la base real.

### R7 — Filtros del sidebar
El sidebar MUST incluir un filtro Columnas (primero) para mostrar u ocultar columnas del listado, sin dejar la tabla sin ninguna columna. MUST filtrar filas por Sede* (`sedeNombre`), Escuela, Región, Comuna, Socio Comunitario, Grupos de Interés y Temáticas, además de ID, Nombre, Estado, Fecha y Mecanismo. Nombre y Socio Comunitario MUST aceptar texto libre: al pulsar Enter se filtran las iniciativas cuyo valor contenga ese texto (sin distinguir mayúsculas). Varias líneas anidadas de una iniciativa MUST hacer match si alguna coincide.

## Scenarios

### S1 Nivel 3
- Given acceso nivel 3 y API key configurada
- When se abre Vinculamos
- Then se listan las iniciativas de la página 1 y la UI pide las páginas siguientes en serie

### S2 Gate
- Given acceso nivel 1 o 2
- When se llama getMideimpactoIniciativas
- Then no se hace fetch y se devuelve error de acceso

### S3 Error API
- Given 401 o 403
- When se carga la tabla
- Then se muestra el mensaje de token o de permiso, sin el token

### S4 Listado sin drip
- Given nivel 3 y API key configurada
- When se pide la página
- Then la action hace un GET de listado y lo devuelve
- And MUST NOT unir caché de sede ni agendar drip
