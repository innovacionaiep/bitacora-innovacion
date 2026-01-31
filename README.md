# Gestor de Proyectos

Sistema de gestión de proyectos con Next.js, NextAuth, Prisma y Supabase PostgreSQL.

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Autenticación**: NextAuth.js v4
- **Base de datos**: Prisma + Supabase PostgreSQL
- **UI**: Tailwind CSS, Shadcn/ui
- **Gestión de proyectos**: Gantt charts, indicadores, presupuestos

## 📋 Pre-requisitos

- Node.js 18+ y pnpm
- Una cuenta de Supabase (para PostgreSQL)
- Git

## ⚙️ Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd gestor-proyectos
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Database - Connection string de Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[genera-un-secret-aleatorio]"

# Supabase (opcional, para features adicionales)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[tu-anon-key]"
```

**Obtener DATABASE_URL de Supabase:**

1. Ve a tu proyecto en Supabase Dashboard
2. Settings → Database → Connection string → URI
3. Copia y reemplaza `[YOUR-PASSWORD]` con tu contraseña de base de datos

**Generar NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

O visita: https://generate-secret.vercel.app/32

**SMTP (opcional, para la página Reportes):** Si quieres enviar correos desde la app (p. ej. a tu Outlook), añade en `.env.local`:

- `SMTP_HOST`: para Outlook/Office 365 usa `smtp.office365.com`
- `SMTP_PORT`: `587`
- `SMTP_SECURE`: `false`
- `SMTP_USER`: tu correo (ej. `tu@outlook.com`)
- `SMTP_PASS`: contraseña de la cuenta o contraseña de aplicación (recomendado si tienes 2FA)

Puedes copiar la plantilla desde `.env.example`.

### 4. Configurar la base de datos

Ejecuta las migraciones de Prisma:

```bash
npx prisma migrate dev --name init
```

Este comando:

- Crea todas las tablas necesarias en tu base de datos Supabase
- Genera el Prisma Client
- Aplica el schema definido en `prisma/schema.prisma`

### 5. (Opcional) Poblar con datos de prueba

```bash
npx prisma db seed
```

Esto creará:

- 2 usuarios de prueba con diferentes roles
- 3 proyectos de ejemplo
- Actividades y tareas para cada proyecto

**Usuarios de prueba:**

- **Admin**: admin@test.com / password123
- **Evaluador**: evaluador@test.com / password123

### 6. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🗄️ Estructura del Proyecto

```
gestor-proyectos/
├── prisma/
│   ├── schema.prisma          # Schema de base de datos
│   └── seed.ts                # Datos de prueba
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/auth/          # NextAuth API routes
│   │   ├── auth/              # Páginas de login/registro
│   │   ├── gantt/             # Vista Gantt
│   │   ├── proyectos/         # Gestión de proyectos
│   │   └── perfil/            # Perfil de usuario
│   ├── components/            # Componentes React
│   │   └── ui/                # Componentes UI (Shadcn)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/
│   │   ├── actions/           # Server Actions (Prisma)
│   │   ├── auth-actions.ts    # Acciones de autenticación
│   │   ├── auth-utils.ts      # Utilidades de auth
│   │   └── prisma.ts          # Cliente Prisma
│   └── types/
│       └── next-auth.d.ts     # Tipos extendidos NextAuth
└── middleware.ts              # NextAuth middleware
```

## 👥 Sistema de Roles

La aplicación implementa un sistema de roles múltiples donde cada usuario puede tener uno o más roles:

- **Admin**: Acceso total al sistema
- **Evaluador**: Evaluar y revisar proyectos
- **Coordinador**: Coordinar equipos y proyectos
- **Encargado**: Gestionar tareas específicas
- **Participante**: Participar en proyectos

### Características del sistema de roles:

- Un usuario puede tener múltiples roles
- Cambio de rol activo desde el perfil
- El rol activo determina los permisos actuales
- Los roles se asignan durante el registro (excepto Admin)

## 🔒 Autenticación

### Flujo de registro:

1. Usuario completa formulario (nombre, email, password, rol inicial)
2. Se crea cuenta y se asigna rol automáticamente
3. Login automático tras registro exitoso
4. Redirect al dashboard

### Flujo de login:

1. Usuario ingresa email y password
2. NextAuth valida credenciales contra base de datos
3. Se carga perfil con roles disponibles
4. Redirect al dashboard

### Protección de rutas:

- Middleware de NextAuth protege todas las rutas excepto `/auth/*`
- Usuarios no autenticados son redirigidos a login
- Sesiones persisten por 30 días

## 🔧 Comandos Prisma Útiles

```bash
# Ver base de datos en Prisma Studio
npx prisma studio

# Crear una nueva migración
npx prisma migrate dev --name nombre_migracion

# Resetear base de datos (⚠️ elimina todos los datos)
npx prisma migrate reset

# Generar Prisma Client (después de cambios en schema)
npx prisma generate

# Formatear schema.prisma
npx prisma format
```

## 📝 Gestión de Proyectos

### Proyectos

- Crear, editar y eliminar proyectos
- Tracking de presupuesto (usado/total)
- Tracking de reuniones (hechas/totales)
- Número de participantes
- Porcentaje de avance (Gantt y objetivos)

### Vista Gantt

- Crear actividades por proyecto
- Agregar tareas a cada actividad
- Drag & drop para reordenar actividades
- Completar/incompletar tareas con un click
- Cálculo automático de progreso
- Sincronización automática con proyectos

### Indicadores

- Dashboard con métricas clave
- Visualización de progreso por proyecto
- Comparativas y tendencias

## 🎨 UI/UX

- **Design System**: Shadcn/ui components
- **Estilos**: Tailwind CSS
- **Responsive**: Funciona en desktop, tablet y móvil
- **Sidebar colapsable**: Para maximizar espacio de trabajo
- **Dark mode**: (próximamente)

## 🐛 Troubleshooting

### Error: "PrismaClient is unable to run in the browser"

- Asegúrate de usar Server Actions o API routes para queries de Prisma
- No importes `prisma` directamente en Client Components

### Error: "Invalid DATABASE_URL"

- Verifica que la URL sea correcta en `.env.local`
- Asegúrate de reemplazar `[PASSWORD]` con tu contraseña real
- Reinicia el servidor de desarrollo después de cambiar `.env.local`

### Error de autenticación

- Verifica que `NEXTAUTH_SECRET` esté configurado
- Confirma que las tablas de NextAuth existen (ejecuta migraciones)
- Limpia cookies del navegador y vuelve a intentar

### Las migraciones fallan

- Verifica conexión a Supabase
- Confirma que tienes permisos en la base de datos
- Intenta `npx prisma migrate reset` (⚠️ elimina datos)

## 📚 Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)

## 🚢 Deploy

### Vercel (Recomendado)

1. Push tu código a GitHub
2. Importa el proyecto en Vercel
3. Configura las variables de entorno
4. Deploy automático

**Variables de entorno en Vercel:**

- `DATABASE_URL`
- `NEXTAUTH_URL` (usa tu dominio de Vercel)
- `NEXTAUTH_SECRET`

### Otras plataformas

El proyecto es compatible con cualquier plataforma que soporte Next.js:

- Railway
- Render
- AWS Amplify
- DigitalOcean App Platform

## 📄 Licencia

Este proyecto es privado y propietario.

## 👤 Autor

© 2025 Paul Guitard

---

**¿Necesitas ayuda?** Abre un issue en el repositorio.
