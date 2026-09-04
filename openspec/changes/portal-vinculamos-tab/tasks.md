# Tasks: portal-vinculamos-tab

1. OpenSpec (este change)
2. Cliente HTTP + mapper iniciativas + secreto env (Vitest, fetch mock)
3. Server action `getMideimpactoIniciativas` (gate nivel 3)
4. Vista `vinculamos` en tipos, guest access, toggle y `VitrinaLanding`
5. `VitrinaVinculamosView` (tabla, paginación, vacío, error)
6. Cablear SSR en `(portal)/page.tsx` y `pnpm test` en archivos tocados
7. Caché Prisma de sede (`inic_codigo` + nombres) + drip servidor 1 GET detalle; no N+1 en el listado
