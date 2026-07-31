import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth-utils';
import {
  roleHasPermission,
  userCanOnProject,
} from '@/lib/permissions/check';
import {
  buildImportTemplate,
  packXlsxAsXlsmWithMacros,
  type ImportTemplateTipo,
  type TemplateCatalogData,
} from '@/lib/excel-import';

const VALID: ImportTemplateTipo[] = [
  'proyectos',
  'participantes',
  'actividades',
  'indicadores',
  'presupuesto',
];

const FILENAMES: Record<ImportTemplateTipo, string> = {
  proyectos: 'plantilla-proyectos.xlsm',
  participantes: 'plantilla-participantes.xlsx',
  actividades: 'plantilla-actividades.xlsx',
  indicadores: 'plantilla-indicadores.xlsx',
  presupuesto: 'plantilla-presupuesto.xlsx',
};

async function loadCatalogs(): Promise<TemplateCatalogData> {
  const [
    sedes,
    escuelas,
    carreras,
    asignaturas,
    comunas,
    gruposInteres,
    sociosComunitarios,
    fondos,
    lineas,
    categorias,
  ] = await Promise.all([
    prisma.sede.findMany({ orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    prisma.escuela.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.carrera.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.asignatura.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.comuna.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.grupoInteres.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.socioComunitario.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.fondo.findMany({ orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    prisma.linea.findMany({ orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] }),
    prisma.desarrolloTecnicoCategoria.findMany({
      include: { subcategorias: { orderBy: { orden: 'asc' } } },
      orderBy: { orden: 'asc' },
    }),
  ]);

  const dtColumns: TemplateCatalogData['dtColumns'] = [];
  // Mismo orden que Configuración → Desarrollo técnico y el tab General:
  // categorías por `orden`, y dentro de cada una las subcategorías por `orden`.
  const catsSorted = [...categorias].sort((a, b) => a.orden - b.orden);
  for (const cat of catsSorted) {
    const subsSorted = [...cat.subcategorias].sort((a, b) => a.orden - b.orden);
    for (const sub of subsSorted) {
      dtColumns.push({
        id: sub.id,
        nombre: sub.nombre,
        campoKey: sub.campoKey ?? null,
      });
    }
  }

  return {
    sedes: sedes.map((s) => s.nombre),
    escuelas: escuelas.map((e) => e.nombre),
    carreras: carreras.map((c) => c.nombre),
    asignaturas: asignaturas.map((a) => a.nombre),
    comunas: comunas.map((c) => c.nombre),
    gruposInteres: gruposInteres.map((g) => g.nombre),
    sociosComunitarios: sociosComunitarios.map((s) => s.nombre),
    fondos: fondos.map((f) => f.nombre),
    lineas: lineas.map((l) => l.nombre),
    dtColumns,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tipo: string }> }
) {
  const { tipo: tipoRaw } = await context.params;
  const tipo = tipoRaw as ImportTemplateTipo;
  if (!VALID.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  const session = await getSession();
  const user = session?.user as {
    id?: string;
    email?: string;
    activeRole?: string;
  } | null;
  if (!user?.activeRole) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  if (tipo === 'proyectos') {
    const ok = await roleHasPermission(user.activeRole, 'projects.bulk_create');
    if (!ok) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
  } else {
    const proyectoId = request.nextUrl.searchParams.get('proyectoId');
    if (!proyectoId) {
      return NextResponse.json(
        { error: 'proyectoId requerido' },
        { status: 400 }
      );
    }
    const permKey =
      tipo === 'participantes'
        ? 'projects.import_participantes'
        : tipo === 'actividades'
          ? 'projects.import_actividades'
          : tipo === 'indicadores'
            ? 'projects.import_indicadores'
            : 'projects.import_presupuesto';
    const ok = await userCanOnProject({
      activeRole: user.activeRole,
      email: user.email,
      userId: user.id,
      proyectoId,
      key: permKey,
    });
    if (!ok) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
  }

  const catalogs = await loadCatalogs();
  let buffer = await buildImportTemplate(tipo, catalogs);
  let contentType =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (tipo === 'proyectos') {
    buffer = await packXlsxAsXlsmWithMacros(buffer);
    contentType =
      'application/vnd.ms-excel.sheet.macroEnabled.12';
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${FILENAMES[tipo]}"`,
    },
  });
}
