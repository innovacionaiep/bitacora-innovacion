# Sistema de Roles para Usuarios

Este documento describe el sistema de roles implementado en la aplicación para usuarios registrados y miembros de equipos de proyectos.

## Tipos de Personas en la App

### 1. Usuarios Registrados
Son personas que tienen cuenta creada en la aplicación y a la vez tienen roles de usuario en proyectos.

### 2. Miembros de Equipos No Registrados
Son miembros de equipos de proyecto que no necesariamente tienen una cuenta registrada, pero que sí tienen un rol asignado dentro del proyecto.

---

## Sistema de Roles Activos

Los usuarios registrados en la app pueden tener **distintos roles habilitados**, pero solo pueden tener **un rol activo** a la vez.

El rol activo se define al abrir el sidebar derecho de "Mi Cuenta", donde existe un botón que permite cambiar entre los roles habilitados.

### Ejemplo de Uso
Un usuario puede tener diferentes roles en distintos proyectos:
- Coordinador en un proyecto
- Colaborador en otro proyecto
- Encargado en otro proyecto
- Docente en otro proyecto

Esto se define en el momento en que se registran los miembros de los equipos de los proyectos.

---

## Roles de Usuario

### Administrador
- **Color:** Amarillo
- **Permisos:**
  - Acceso completo en la app
  - Ver toda la información
  - Generar todos los cambios habilitados
- **Restricciones:**
  - No puede ser miembro oficial de ningún proyecto

---

### Coordinador
- **Color:** Azul
- **Permisos:**
  - Ver toda la información de todos los proyectos
  - Hacer cambios solo en proyectos donde son "Miembros coordinadores"
  - Hacer comentarios donde esté habilitada esta opción
  - Acceso al Dashboard

---

### Colaborador
- **Color:** Violeta
- **Permisos:**
  - Ver (solo lectura) la información de proyectos donde son "Miembros colaboradores"
  - Hacer comentarios donde esté habilitada esta opción
- **Restricciones:**
  - Se oculta el menú "Dashboard" del sidebar
  - No puede editar información de proyectos

---

### Encargado
- **Color:** Naranjo
- **Permisos:**
  - Ver y editar la información de proyectos donde son "Miembros encargados"
  - Hacer comentarios donde esté habilitada esta opción
- **Restricciones:**
  - Se oculta el menú "Dashboard" del sidebar

---

### Docente
- **Color:** Verde
- **Permisos:**
  - Ver (solo lectura) la información de proyectos donde son "Miembros docentes"
  - Hacer comentarios donde esté habilitada esta opción
- **Restricciones:**
  - Se oculta el menú "Dashboard" del sidebar
  - No puede editar información de proyectos

---

### Estudiante
- **Color:** Rojo
- **Permisos:**
  - Ver (solo lectura) la información de proyectos donde son "Miembros estudiantes"
  - Hacer comentarios donde esté habilitada esta opción
- **Restricciones:**
  - Se oculta el menú "Dashboard" del sidebar
  - No puede editar información de proyectos

---

### Beneficiario
- **Color:** Calipso (Cyan)
- **Permisos:**
  - Ver la información de proyectos donde son "Miembros beneficiarios"
  - Hacer comentarios donde esté habilitada esta opción
- **Restricciones:**
  - No puede editar información de proyectos

---

## Caso Especial: Página "Novedades"

La página de Novedades funciona como un **muro/feed público** de los proyectos. El feed es público para todos los usuarios de la app.

### Permisos de Publicación por Rol

| Rol | Puede publicar sobre |
|-----|---------------------|
| **Administrador** | Cualquier proyecto |
| **Coordinador** | Cualquier proyecto |
| **Colaborador** | Cualquier proyecto |
| **Encargado** | Cualquier proyecto |
| **Docente** | Solo proyectos donde son miembros docentes |
| **Estudiante** | Solo proyectos donde son miembros estudiantes |
| **Beneficiario** | Solo proyectos donde son miembros beneficiarios |

---

## Resumen de Permisos

| Rol | Dashboard | Ver Todo | Ver Propio | Editar | Comentar | Novedades |
|-----|-----------|----------|------------|--------|----------|-----------|
| Administrador | ✅ | ✅ | ✅ | ✅ | ✅ | Todos |
| Coordinador | ✅ | ✅ | ✅ | ✅* | ✅ | Todos |
| Colaborador | ❌ | ❌ | ✅ | ❌ | ✅ | Todos |
| Encargado | ❌ | ❌ | ✅ | ✅ | ✅ | Todos |
| Docente | ❌ | ❌ | ✅ | ❌ | ✅ | Propios |
| Estudiante | ❌ | ❌ | ✅ | ❌ | ✅ | Propios |
| Beneficiario | ❌ | ❌ | ✅ | ❌ | ✅ | Propios |

*Solo en proyectos donde son miembros coordinadores

---

## Colores de Roles (Referencia Técnica)

```
Administrador: yellow (bg-yellow-500)
Coordinador:   blue   (bg-blue-500)
Colaborador:   violet (bg-violet-500)
Encargado:     orange (bg-orange-500)
Docente:       green  (bg-green-500)
Estudiante:    red    (bg-red-500)
Beneficiario:  cyan   (bg-cyan-500)
```
