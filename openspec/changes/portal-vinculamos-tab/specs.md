# Spec: portal-vinculamos-tab

## Requirements

### R1 — Tab y visibilidad
El portal MUST mostrar el tab Vinculamos a la derecha de Data. MUST ser visible solo con nivel 3. Niveles 0–2 MUST NOT ver el tab ni recibir el payload.

### R2 — Fuente
El tab MUST alimentarse de GET `https://api.mideimpacto.com/api/external/v1/iniciativas?page={page}&include=adjuntos` con `Authorization: Bearer` desde `MIDEIMPACTO_API_KEY`. MUST NOT persistir el payload completo de iniciativas. MAY persistir solo un lookup de sede (`inic_codigo`, nombres de sede, `fetched_at`) copiado de GET `/iniciativas/{id}`. MUST NOT enviar el token al cliente ni loguearlo.

### R3 — Tabla
La tabla MUST ser de solo lectura. Columnas fijas, siempre visibles (vacío → `—`): ID (`inic_codigo`), Nombre proyecto (`inic_nombre`), Estado (`estado_texto`), Fecha inicio (`fecha_inicio`), Fecha término (`fecha_cierre`), Mecanismo (`meca_nombre`), Adjuntos (`adjuntos[].download_url` vía `include=adjuntos`). El header MUST permitir redimensionar el ancho de cada columna arrastrando el borde derecho (72–640 px). Campos nested MUST aplanarse a texto. Los adjuntos MUST descargarse por un proxy autenticado de nivel 3, sin exponer el Bearer. El listado MUST NOT bloquearse esperando GET de detalle por fila ni MUST mostrar Brecha, Descripción, Objetivo, Código, Programa, Territorio o Sede.

### R4 — Autorización
`getMideimpactoIniciativas` MUST exigir `resolvePortalAccess` y `portalCanSeeView(level, 'vinculamos')`. Si el gate falla, MUST NOT llamar a la API. Si falta la API key, MUST devolver error sin fetch.

### R5 — Paginación y errores
La UI MUST pedir páginas con `?page=`. 401/403/429/5xx del **listado** MUST mostrarse con mensaje claro (token inválido, sin permiso `iniciativas:read`, límite de solicitudes) sin filtrar el token. La action MUST NOT unir caché de sede ni agendar drip de detalle.

### R6 — Tests
Tests MUST mock fetch, acceso y Prisma. MUST NOT escribir a la base real.

## Scenarios

### S1 Nivel 3
- Given acceso nivel 3 y API key configurada
- When se abre Vinculamos
- Then se listan iniciativas de la página 1

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
