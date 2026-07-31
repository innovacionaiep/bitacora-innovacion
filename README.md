# Bitácora

Plataforma de gestión y seguimiento de proyectos de **AIEP (Universidad Andrés Bello)**. Centraliza actividades, presupuesto, indicadores, participantes y reportes en un solo lugar.

> *«Seguimiento fácil de actividades, presupuesto y más.»*

---

## Qué permite

| Área | Capacidad |
|------|-----------|
| **Proyectos** | Ficha completa por fondo y línea: general, participantes, actividades, indicadores, presupuesto, convenio, seguimiento e historial |
| **Actividades** | Planificación en Gantt y Kanban, evidencias (JPG/PDF) y comentarios |
| **Indicadores** | Avance ligado a objetivos específicos, con evidencias |
| **Presupuesto** | Adjudicado, cuentas (RRHH / Operación / Inversión), estados de gasto y proyecciones |
| **Convenios** | Plantilla y carga de convenio firmado cuando el fondo lo habilita |
| **Dashboard** | Mirada agregada del portafolio: avances, escuelas, sedes, participantes y convenios |
| **Inicio** | Portal personal: proyectos, alertas, compromisos e historial reciente |
| **Reportes** | Envío de reporte del proyecto por correo |
| **Novedades** | Publicaciones, eventos y convocatorias |
| **Ajustes** | Usuarios, roles y permisos, catálogos, convenios y mantenimiento (Admin) |

---

## Roles

Cada persona puede tener varios roles y elegir uno activo. Los permisos se configuran en Ajustes.

**Admin** · **Coordinador** · **Colaborador** · **Encargado** · **Docente** · **Estudiante** · **Beneficiario**

---

## Stack

| Capa | Tecnología |
|------|------------|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Auth | NextAuth.js |
| Datos | PostgreSQL (Supabase) + Prisma |
| UI | Tailwind CSS, shadcn/ui |
| Archivos | Cloudinary |
| Correo | Nodemailer (reportes) |

Gestor de paquetes: **pnpm**.

---

## Desarrollo local

### Requisitos

- Node.js 18+
- pnpm
- PostgreSQL (p. ej. Supabase)

### Arranque

```bash
git clone https://github.com/innovacionaiep/bitacora-innovacion.git
cd bitacora-innovacion
pnpm install
```

Crea `.env.local` con al menos:

```env
DATABASE_URL=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
```

Variables habituales adicionales: Cloudinary, Supabase (URL/anon key) y SMTP si usas reportes por correo.

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Scripts

| Comando | Uso |
|---------|-----|
| `pnpm dev` | Servidor de desarrollo (Turbopack) |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |

---

## Estructura (resumen)

```
src/
├── app/           # Rutas (inicio, dashboard, proyectos, reportes, configuración, auth…)
├── components/    # UI y módulos de dominio
├── lib/           # Server Actions, auth, permisos, utilidades
├── hooks/
└── types/
prisma/            # Schema y migraciones
```

---

## Licencia y crédito

Software institucional de **AIEP / Universidad Andrés Bello**. Uso y distribución según las políticas de la institución.

Desarrollo: Paul Guitard.
