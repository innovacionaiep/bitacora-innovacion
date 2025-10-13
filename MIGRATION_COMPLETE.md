# ✅ Migración Completada: NextAuth + Prisma + Supabase PostgreSQL

La migración de Supabase Auth a NextAuth + Prisma ha sido completada exitosamente.

## 📋 Checklist de Migración

### ✅ Completado

- [x] Instalación de dependencias (NextAuth, Prisma, bcrypt)
- [x] Schema de Prisma configurado con todos los modelos
- [x] Cliente Prisma singleton creado
- [x] Tipos de NextAuth extendidos para incluir roles
- [x] Configuración de NextAuth con credentials provider
- [x] Server actions para autenticación (signUp, updateProfile, etc.)
- [x] Server actions para proyectos (CRUD completo)
- [x] Server actions para Gantt (activities y tasks CRUD)
- [x] Páginas de autenticación actualizadas (login, register, perfil)
- [x] Hooks actualizados (useProyectos, useGantt)
- [x] Componentes actualizados (UserAvatar, ConditionalLayout)
- [x] Middleware de NextAuth configurado
- [x] Layout raíz con SessionProvider
- [x] Archivos obsoletos de Supabase eliminados
- [x] README actualizado con nueva documentación
- [x] Script de seed con datos de prueba

### ⏳ Pendiente (Requiere tu acción)

- [ ] **Configurar variables de entorno** (`.env.local`)
- [ ] **Ejecutar migraciones de Prisma**
- [ ] **Probar la aplicación**

---

## 🔧 Pasos Siguientes (Debes ejecutar)

### 1. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Database - Tu connection string de Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@[TU-PROJECT].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[GENERA-UN-SECRET-AQUI]"

# Supabase (opcional, para features adicionales)
NEXT_PUBLIC_SUPABASE_URL="https://[TU-PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[TU-ANON-KEY]"
```

**Obtener DATABASE_URL:**

1. Ve a Supabase Dashboard
2. Settings → Database → Connection string → URI
3. Copia y reemplaza `[YOUR-PASSWORD]` con tu contraseña

**Generar NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

O visita: https://generate-secret.vercel.app/32

### 2. Ejecutar Migraciones de Prisma

Una vez configurado `.env.local`, ejecuta:

```bash
# Crear todas las tablas en la base de datos
npx prisma migrate dev --name init

# Esto creará:
# - Tablas de NextAuth (users, accounts, sessions, verification_tokens)
# - Tabla de roles (user_roles)
# - Tablas de la aplicación (proyectos, activities, tasks)
```

### 3. (Opcional) Poblar con Datos de Prueba

```bash
npx prisma db seed
```

Esto creará:

- 3 usuarios de prueba
- 3 proyectos de ejemplo
- 7 actividades con tareas

**Credenciales de prueba:**

- `admin@test.com` / `password123` (Admin + Coordinador)
- `evaluador@test.com` / `password123` (Evaluador + Participante)
- `coordinador@test.com` / `password123` (Coordinador + Encargado)

### 4. Iniciar la Aplicación

```bash
pnpm dev
```

Abre http://localhost:3000

---

## 🧪 Testing

### Flujo de Registro

1. Ve a `/auth/register`
2. Completa el formulario (nombre, email, password, rol)
3. Deberías ser redirigido al dashboard automáticamente

### Flujo de Login

1. Ve a `/auth/login`
2. Ingresa credenciales
3. Login exitoso → redirect al dashboard

### Gestión de Perfil

1. Click en el avatar (esquina superior derecha)
2. "Perfil"
3. Prueba cambiar:
   - Nombre
   - Avatar
   - Rol activo

### Proyectos

1. Ve a `/proyectos`
2. Prueba:
   - Crear proyecto
   - Editar proyecto
   - Eliminar proyecto

### Gantt

1. Ve a `/gantt`
2. Selecciona un proyecto
3. Prueba:
   - Crear actividad
   - Agregar tareas
   - Completar/incompletar tareas
   - Reordenar actividades (drag & drop)
   - Ver cálculo automático de progreso

### Protección de Rutas

1. Cierra sesión
2. Intenta acceder a `/proyectos` o `/gantt`
3. Deberías ser redirigido a `/auth/login`

---

## 🔍 Utilidades de Prisma

```bash
# Ver base de datos en interfaz gráfica
npx prisma studio

# Crear nueva migración (después de cambios en schema)
npx prisma migrate dev --name nombre_descriptivo

# Regenerar Prisma Client
npx prisma generate

# Resetear base de datos (⚠️ ELIMINA TODOS LOS DATOS)
npx prisma migrate reset
```

---

## 🚨 Troubleshooting Común

### Error: "PrismaClient is unable to run in the browser"

- Estás importando `prisma` en un Client Component
- Usa Server Actions en su lugar

### Error: "DATABASE_URL is required"

- Verifica que `.env.local` existe
- Asegúrate de que el archivo está en la raíz del proyecto
- Reinicia el servidor de desarrollo

### Error de autenticación / Session null

- Verifica que ejecutaste las migraciones (`prisma migrate dev`)
- Confirma que `NEXTAUTH_SECRET` está configurado
- Limpia cookies del navegador

### Las migraciones fallan

- Verifica conexión a Supabase
- Confirma que la DATABASE_URL es correcta
- Intenta conectarte a la base de datos desde un cliente SQL

---

## 📝 Cambios Importantes

### Autenticación

- **Antes**: Supabase Auth con triggers SQL
- **Ahora**: NextAuth con Prisma (más simple y predecible)

### Gestión de Usuarios

- **Antes**: Tabla `profiles` separada, triggers para sincronización
- **Ahora**: Tabla `users` única, relaciones directas con Prisma

### Roles

- **Antes**: Tabla `user_account_types` con RLS policies
- **Ahora**: Tabla `user_roles` con relaciones Prisma

### Data Access

- **Antes**: Cliente Supabase directo en hooks
- **Ahora**: Server Actions con Prisma

### Sesiones

- **Antes**: JWT de Supabase, cookies manuales
- **Ahora**: NextAuth session management automático

---

## 🎉 Beneficios de la Nueva Arquitectura

1. **Más Simple**: No más triggers SQL complejos
2. **Type-safe**: Prisma genera tipos automáticamente
3. **Mejor DX**: Prisma Studio para ver/editar datos
4. **Más Robusto**: Menos puntos de fallo
5. **Mejor Performance**: Queries optimizadas con Prisma
6. **Migraciones**: Control de versiones de schema
7. **Testing**: Más fácil de testear con Server Actions

---

## 📚 Documentación de Referencia

- [NextAuth.js Docs](https://next-auth.js.org)
- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/concepts/components/prisma-client)
- [NextAuth + Prisma Adapter](https://authjs.dev/reference/adapter/prisma)

---

**¿Problemas?**

- Revisa los logs de la consola
- Verifica las configuraciones
- Consulta el README.md actualizado

**¡Éxito con tu nueva arquitectura!** 🚀
