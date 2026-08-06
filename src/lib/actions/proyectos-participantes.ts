'use server';

import prisma from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createHistorialEntry } from './historial';
import { requireProjectAccess } from '@/lib/authz/guards';
import { ProyectoWithRelations } from '@/types/proyecto';
import {
  isSyncableRole,
  upsertPersonaFromParticipante,
  updatePersonaProfile,
  ensureSyncableUserRole,
} from '@/lib/personas/sync-persona';
import { allowsMultipleParticipationRoles } from '@/lib/authz/pure';

const proyectoIncludeForParticipante = {
  participantes_rel: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
      socioComunitario: {
        select: { id: true, nombre: true, descripcion: true },
      },
      sede: { select: { id: true, nombre: true } },
      escuela: { select: { id: true, nombre: true } },
      carrera: { select: { id: true, nombre: true } },
      asignatura: { select: { id: true, nombre: true } },
    },
  },
  sociosComunitarios: {
    include: {
      socioComunitario: {
        select: { id: true, nombre: true, descripcion: true },
      },
    },
  },
} as const;

type AddParticipanteData = {
  rol: string;
  nombre?: string;
  rut?: string;
  email?: string;
  cargo?: string;
  laborEnProyecto?: string;
  socioComunitarioId?: string;
  sedeId?: string;
  escuelaId?: string;
  carreraId?: string;
  asignaturaId?: string;
};

export async function addParticipanteProyecto(
  proyectoId: string,
  data: AddParticipanteData
) {
  try {
    const gate = await requireProjectAccess(proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };

    if (!data.email?.trim()) {
      return {
        success: false,
        error: 'El correo es obligatorio.',
      };
    }
    if (
      (data.rol === 'Docente' || data.rol === 'Estudiante') &&
      !data.rut?.trim()
    ) {
      return {
        success: false,
        error: 'El RUT es obligatorio para docentes y estudiantes.',
      };
    }
    if (data.rol === 'Estudiante' && !data.carreraId) {
      return {
        success: false,
        error: 'La carrera es obligatoria para estudiantes.',
      };
    }
    if (data.rol === 'Estudiante' && !data.asignaturaId) {
      return {
        success: false,
        error: 'La asignatura es obligatoria para estudiantes.',
      };
    }
    let userId: string | null = null;
    let nombre = data.nombre ?? null;
    let email = data.email.trim();
    let rut = data.rut?.trim() || null;
    let cargo = data.cargo ?? null;
    let sedeId = data.sedeId ?? null;
    let escuelaId = data.escuelaId ?? null;

    if (isSyncableRole(data.rol)) {
      const persona = await upsertPersonaFromParticipante({
        email,
        nombre,
        rut,
        cargo,
        sedeId,
        escuelaId,
        rol: data.rol,
      });
      userId = persona.userId;
      email = persona.email;
      nombre = persona.name ?? nombre;
      // Cascade: perfil centralizado puede haber enriquecido campos
      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: { rut: true, cargo: true, sedeId: true, escuelaId: true, name: true },
      });
      if (userProfile) {
        rut = rut || userProfile.rut;
        cargo = cargo || userProfile.cargo;
        sedeId = sedeId || userProfile.sedeId;
        escuelaId = escuelaId || userProfile.escuelaId;
        nombre = nombre || userProfile.name;
        // Propagar perfil a todos los participantes del user
        await updatePersonaProfile(userId, {
          name: nombre,
          rut,
          cargo,
          sedeId,
          escuelaId,
        });
      }
    } else {
      const user = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
        },
        select: { id: true, name: true, email: true },
      });
      if (user) {
        userId = user.id;
        nombre = user.name ?? nombre;
        email = user.email;
      }
    }

    // Un solo rol de participación por cuenta/email (salvo admin@test.cl)
    if (!allowsMultipleParticipationRoles(email)) {
      const existing = await prisma.proyectoParticipante.findFirst({
        where: {
          proyectoId,
          OR: [
            ...(userId ? [{ userId }] : []),
            { email: { equals: email, mode: 'insensitive' } },
          ],
        },
        select: { id: true, rol: true },
      });
      if (existing) {
        return {
          success: false,
          error: `Esta cuenta ya participa en el proyecto como ${existing.rol}. Solo se permite un rol por cuenta.`,
        };
      }
    }

    await prisma.proyectoParticipante.create({
      data: {
        proyectoId,
        userId,
        rol: data.rol,
        nombre,
        rut,
        email,
        cargo,
        laborEnProyecto: data.laborEnProyecto?.trim() || null,
        socioComunitarioId:
          data.rol === 'Beneficiario'
            ? (data.socioComunitarioId ?? null)
            : null,
        sedeId,
        escuelaId,
        carreraId: data.carreraId ?? null,
        asignaturaId: data.asignaturaId ?? null,
      },
    });
    await createHistorialEntry({
      proyectoId,
      accion: 'Agregar participante',
      tabProyecto: 'Participantes',
      elementoEspecifico: `a un nuevo ${data.rol}`,
      cambioGenerado: data.nombre ?? '',
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidatePath('/configuracion/usuarios');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error adding participante:', error);
    return {
      success: false,
      error: 'Error al agregar participante',
    };
  }
}

type UpdateParticipanteData = {
  rol?: string;
  nombre?: string;
  rut?: string;
  email?: string;
  cargo?: string;
  laborEnProyecto?: string;
  socioComunitarioId?: string;
  sedeId?: string;
  escuelaId?: string;
  carreraId?: string;
  asignaturaId?: string;
};

export async function updateParticipanteProyecto(
  participanteId: string,
  data: UpdateParticipanteData
) {
  try {
    const existing = await prisma.proyectoParticipante.findUnique({
      where: { id: participanteId },
    });
    if (!existing) {
      return { success: false, error: 'Participante no encontrado' };
    }
    const gate = await requireProjectAccess(existing.proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };

    const finalRol = data.rol ?? existing.rol;
    const finalRut =
      data.rut !== undefined ? data.rut.trim() || null : existing.rut;
    const finalCarreraId =
      data.carreraId !== undefined
        ? data.carreraId || null
        : existing.carreraId;
    const finalAsignaturaId =
      data.asignaturaId !== undefined
        ? data.asignaturaId || null
        : existing.asignaturaId;
    const finalEmail =
      data.email !== undefined ? data.email.trim() || null : existing.email;
    if (!finalEmail?.trim()) {
      return {
        success: false,
        error: 'El correo es obligatorio.',
      };
    }
    if (
      (finalRol === 'Docente' || finalRol === 'Estudiante') &&
      !finalRut?.trim()
    ) {
      return {
        success: false,
        error: 'El RUT es obligatorio para docentes y estudiantes.',
      };
    }
    if (finalRol === 'Estudiante' && !finalCarreraId) {
      return {
        success: false,
        error: 'La carrera es obligatoria para estudiantes.',
      };
    }
    if (finalRol === 'Estudiante' && !finalAsignaturaId) {
      return {
        success: false,
        error: 'La asignatura es obligatoria para estudiantes.',
      };
    }
    let resolvedUserId: string | null = existing.userId;
    let resolvedNombre: string | null =
      data.nombre !== undefined ? data.nombre : existing.nombre;
    let resolvedEmail: string | null =
      data.email !== undefined ? data.email.trim() || null : existing.email;
    const finalCargo =
      data.cargo !== undefined ? data.cargo : existing.cargo;
    const finalSedeId =
      data.sedeId !== undefined ? data.sedeId || null : existing.sedeId;
    const finalEscuelaId =
      data.escuelaId !== undefined
        ? data.escuelaId || null
        : existing.escuelaId;

    if (isSyncableRole(finalRol) && resolvedEmail?.trim()) {
      const persona = await upsertPersonaFromParticipante({
        email: resolvedEmail,
        nombre: resolvedNombre,
        rut: finalRut,
        cargo: finalCargo,
        sedeId: finalSedeId,
        escuelaId: finalEscuelaId,
        rol: finalRol,
      });
      resolvedUserId = persona.userId;
      resolvedEmail = persona.email;
      resolvedNombre = persona.name ?? resolvedNombre;
      await updatePersonaProfile(persona.userId, {
        name: resolvedNombre,
        email: persona.email,
        rut: finalRut,
        cargo: finalCargo,
        sedeId: finalSedeId,
        escuelaId: finalEscuelaId,
      });
    } else if (data.email !== undefined) {
      if (data.email.trim()) {
        const user = await prisma.user.findFirst({
          where: {
            email: { equals: data.email.trim(), mode: 'insensitive' },
          },
          select: { id: true, name: true, email: true },
        });
        if (user) {
          resolvedUserId = user.id;
          resolvedNombre = user.name ?? resolvedNombre;
          resolvedEmail = user.email;
        } else {
          resolvedUserId = null;
          resolvedEmail = data.email.trim();
        }
      } else {
        resolvedUserId = null;
        resolvedEmail = null;
      }
    } else if (
      isSyncableRole(finalRol) &&
      resolvedUserId &&
      (data.nombre !== undefined ||
        data.rut !== undefined ||
        data.cargo !== undefined ||
        data.sedeId !== undefined ||
        data.escuelaId !== undefined)
    ) {
      await updatePersonaProfile(resolvedUserId, {
        ...(data.nombre !== undefined && { name: data.nombre }),
        ...(data.rut !== undefined && { rut: finalRut }),
        ...(data.cargo !== undefined && { cargo: finalCargo }),
        ...(data.sedeId !== undefined && { sedeId: finalSedeId }),
        ...(data.escuelaId !== undefined && { escuelaId: finalEscuelaId }),
      });
      await ensureSyncableUserRole(resolvedUserId, finalRol);
    }

    if (
      resolvedEmail &&
      !allowsMultipleParticipationRoles(resolvedEmail)
    ) {
      const duplicate = await prisma.proyectoParticipante.findFirst({
        where: {
          proyectoId: existing.proyectoId,
          id: { not: participanteId },
          OR: [
            ...(resolvedUserId ? [{ userId: resolvedUserId }] : []),
            {
              email: {
                equals: resolvedEmail,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: { id: true, rol: true },
      });
      if (duplicate) {
        return {
          success: false,
          error: `Esta cuenta ya participa en el proyecto como ${duplicate.rol}. Solo se permite un rol por cuenta.`,
        };
      }
    }

    const updateData = {
      ...(data.rol !== undefined && { rol: data.rol }),
      nombre: resolvedNombre,
      email: resolvedEmail,
      userId: resolvedUserId,
      rut: finalRut,
      cargo: finalCargo,
      sedeId: finalSedeId,
      escuelaId: finalEscuelaId,
      ...(data.laborEnProyecto !== undefined && {
        laborEnProyecto: data.laborEnProyecto.trim() || null,
      }),
      ...(data.socioComunitarioId !== undefined && {
        socioComunitarioId:
          finalRol === 'Beneficiario' ? data.socioComunitarioId : null,
      }),
      ...(data.carreraId !== undefined && {
        carreraId: data.carreraId || null,
      }),
      ...(data.asignaturaId !== undefined && {
        asignaturaId: data.asignaturaId || null,
      }),
    };
    await prisma.proyectoParticipante.update({
      where: { id: participanteId },
      data: updateData,
    });
    const nombreParticipante = existing.nombre || existing.rol || 'Participante';
    await createHistorialEntry({
      proyectoId: existing.proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Participantes',
      elementoEspecifico: `los datos del ${existing.rol}`,
      cambioGenerado: nombreParticipante,
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: existing.proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidatePath('/configuracion/usuarios');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error updating participante:', error);
    return {
      success: false,
      error: 'Error al actualizar participante',
    };
  }
}

export async function deleteParticipanteProyecto(participanteId: string) {
  try {
    const existing = await prisma.proyectoParticipante.findUnique({
      where: { id: participanteId },
    });
    if (!existing) {
      return { success: false, error: 'Participante no encontrado' };
    }
    const gate = await requireProjectAccess(existing.proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };

    const nombreParticipante = existing.nombre || existing.rol || 'Participante';
    await prisma.proyectoParticipante.delete({
      where: { id: participanteId },
    });
    await createHistorialEntry({
      proyectoId: existing.proyectoId,
      accion: 'Eliminar participante',
      tabProyecto: 'Participantes',
      elementoEspecifico: `al ${existing.rol}`,
      cambioGenerado: nombreParticipante,
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: existing.proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    revalidateTag('proyectos-dashboard');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error deleting participante:', error);
    return {
      success: false,
      error: 'Error al eliminar participante',
    };
  }
}
