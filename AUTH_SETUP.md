# Configuración de Autenticación - BITACORA

## Pasos para completar la configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 2. Configuración en Supabase Dashboard

1. **Habilitar Autenticación por Email/Password:**

   - Ve a Authentication > Settings en tu dashboard de Supabase
   - En "Auth Providers", habilita "Email"
   - Configura las opciones de email según necesites

2. **Configurar Google OAuth:**

   - Ve a Authentication > Providers en tu dashboard de Supabase
   - Habilita "Google"
   - Necesitarás crear un proyecto en Google Cloud Console:
     - Ve a [Google Cloud Console](https://console.cloud.google.com/)
     - Crea un nuevo proyecto o selecciona uno existente
     - Habilita la Google+ API
     - Ve a "Credenciales" > "Crear credenciales" > "ID de cliente OAuth 2.0"
     - Configura las URLs de redirección autorizadas:
       - `https://tu-proyecto.supabase.co/auth/v1/callback`
     - Copia el Client ID y Client Secret a Supabase

3. **Configurar Microsoft OAuth:**
   - Ve a Authentication > Providers en tu dashboard de Supabase
   - Habilita "Azure"
   - Necesitarás registrar una aplicación en Azure Portal:
     - Ve a [Azure Portal](https://portal.azure.com/)
     - Ve a "Azure Active Directory" > "Registros de aplicaciones"
     - Crea un nuevo registro
     - Configura las URLs de redirección:
       - `https://tu-proyecto.supabase.co/auth/v1/callback`
     - Copia el Application (client) ID y Client Secret a Supabase

### 3. Configuración de URLs de Redirección

En tu dashboard de Supabase, ve a Authentication > URL Configuration y configura:

- **Site URL:** `http://localhost:3000` (para desarrollo)
- **Redirect URLs:**
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/` (para OAuth)

### 4. Probar la Aplicación

1. Ejecuta `pnpm dev`
2. Ve a `http://localhost:3000`
3. Deberías ser redirigido automáticamente a `/auth/login`
4. Prueba el login con email/password y los botones OAuth

### 5. Crear Usuarios de Prueba

Puedes crear usuarios de prueba de dos formas:

1. **Desde la página de login:** Usa el formulario de registro (si está habilitado)
2. **Desde Supabase Dashboard:** Ve a Authentication > Users > "Add user"

### 6. Configuración de Avatares Predefinidos

Para que la funcionalidad de perfil funcione correctamente, necesitas agregar avatares predefinidos:

1. **Crear carpeta de avatares:**

   - La carpeta `public/avatars/` ya está creada en el proyecto
   - Debes agregar 20 imágenes de avatar en esta carpeta

2. **Especificaciones de los archivos:**

   - **Formato**: PNG, JPG o JPEG
   - **Tamaño recomendado**: 200x200px o 512x512px
   - **Tamaño máximo**: 1MB por archivo
   - **Nomenclatura**: `avatar-1.png`, `avatar-2.png`, ..., `avatar-20.png`

3. **Fuentes recomendadas para avatares:**

   - [Flaticon](https://www.flaticon.com/packs/avatar) - Avatares ilustrados
   - [Freepik](https://www.freepik.com/search?query=avatar) - Avatares profesionales
   - [UI Faces](https://uifaces.co/) - Fotos reales
   - [Boring Avatars](https://boringavatars.com/) - Avatares geométricos

4. **Estructura final:**
   ```
   public/
   └── avatars/
       ├── avatar-1.png
       ├── avatar-2.png
       ├── avatar-3.png
       └── ... (hasta avatar-20.png)
   ```

### 7. Funcionalidades Implementadas

- ✅ Login con email y contraseña
- ✅ Login con Google OAuth
- ✅ Login con Microsoft OAuth
- ✅ Protección automática de rutas
- ✅ Avatar de usuario en el header
- ✅ Menú desplegable con opciones de perfil
- ✅ **Página de perfil funcional**
- ✅ **Galería de 20 avatares predefinidos**
- ✅ **Edición de nombre completo**
- ✅ **Selección visual de avatar**
- ✅ Logout funcional
- ✅ Redirección automática según estado de autenticación

### 8. Próximos Pasos (Opcional)

- Configurar roles de usuario en la base de datos
- Implementar sistema de permisos
- Agregar validación de formularios
- Implementar recuperación de contraseña
- Agregar notificaciones de éxito/error

## Notas Importantes

- Asegúrate de que las URLs de redirección estén configuradas correctamente
- Los secretos OAuth deben mantenerse seguros
- Para producción, actualiza las URLs de redirección con tu dominio real
- El middleware protege automáticamente todas las rutas excepto `/auth/*`
