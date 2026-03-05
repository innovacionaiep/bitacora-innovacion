# Deploy rápido – Gestor de Proyectos

## Opción recomendada: Vercel (unos minutos)

### 1. Subir código a GitHub

Si aún no está subido:

```bash
git push origin main
```

### 2. Crear proyecto en Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (con GitHub).
2. **Add New** → **Project**.
3. Importa el repo **gestor-proyectos**.
4. **Framework Preset**: Next.js (detectado).
5. **Root Directory**: `gestor-proyectos` (si el repo es el monorepo) o `.` si el repo es solo esta app.
6. **Build Command**: `pnpm run build` (por defecto).
7. **Install Command**: `pnpm install`.

### 3. Variables de entorno en Vercel

En el proyecto → **Settings** → **Environment Variables**, añade al menos:

| Variable           | Descripción |
|--------------------|-------------|
| `DATABASE_URL`     | URL de PostgreSQL. **Supabase:** usa el connection string del pooler en modo **Transaction** (no Session), para evitar `MaxClientsInSessionMode: max clients reached`. En Project Settings → Database → Connection string, elige la pestaña **Transaction** y copia la URI. Opcional: añade `?connection_limit=1` al final para limitar conexiones por función. |
| `NEXTAUTH_SECRET`  | Genera con: `openssl rand -base64 32` |
| `NEXTAUTH_URL`     | Tras el primer deploy será `https://tu-proyecto.vercel.app` (actualízala después si hace falta) |

Opcionales (si usas la función): Cloudinary, SMTP, `CONFIG_UNLOCK_PASSWORD`, `PASSWORD_DISPLAY_SECRET`, Vosk. Ver `.env.example`.

### 4. Migraciones de Prisma

La base debe tener el schema aplicado antes de usar la app:

**Opción A – Desde tu máquina (recomendado la primera vez):**

```bash
# Con DATABASE_URL apuntando a tu Supabase
npx prisma migrate deploy
```

**Opción B – En Vercel:**  
Puedes añadir un script en `package.json` que ejecute migraciones en build y usar ese script como build command (más avanzado; si quieres lo configuramos).

### 5. Deploy

Pulsa **Deploy**. Al terminar, Vercel te dará una URL.  
Actualiza **NEXTAUTH_URL** en Vercel con esa URL y redeploy si es necesario.

---

## Si el build falla

- Si falla con Turbopack, en **Build Command** usa: `pnpm exec next build` (sin `--turbopack`).
- Revisa que **Node.js Version** en Vercel sea 20.x (Settings → General).

---

## Resumen mínimo

1. `git push` → Importar repo en Vercel.
2. Añadir `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
3. Ejecutar `npx prisma migrate deploy` contra esa BD.
4. Deploy y, si hace falta, actualizar `NEXTAUTH_URL` y volver a desplegar.
