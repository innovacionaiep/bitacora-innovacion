'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Briefcase, Crown, Users, Calendar } from 'lucide-react';
import { ProyectoParticipante } from '@prisma/client';
import { User as UserType } from '@prisma/client';

interface ParticipanteWithUser extends ProyectoParticipante {
  user?: UserType | null;
  /** Prioridad: cuenta registrada (por userId o email), luego participante.nombre */
  displayName?: string | null;
  /** Prioridad: cuenta registrada (por userId o email) */
  displayImage?: string | null;
}

interface ModalParticipanteProps {
  participante: ParticipanteWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Colores por rol según docs/SISTEMA-ROLES.md (igual que Mi Cuenta y Configuración)
const getRolBadgeColor = (rol: string) => {
  switch (rol) {
    case 'Encargado':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Coordinador':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Colaborador':
      return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'Docente':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Estudiante':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Beneficiario':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getRolIcon = (rol: string) => {
  switch (rol) {
    case 'Encargado':
      return <Crown className="h-5 w-5" />;
    default:
      return <Users className="h-5 w-5" />;
  }
};

export function ModalParticipante({
  participante,
  open,
  onOpenChange,
}: ModalParticipanteProps) {
  if (!participante) return null;

  const nombre =
    participante.displayName ??
    participante.user?.name ??
    participante.nombre ??
    'Sin nombre';
  const email =
    participante.user?.email ?? participante.email ?? 'No disponible';
  const cargo = participante.cargo || 'No especificado';
  const imagen =
    participante.displayImage ?? participante.user?.image ?? null;
  const rol = participante.rol;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Información del Miembro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar y Nombre */}
          <div className="flex flex-col items-center space-y-4">
            {imagen ? (
              <img
                src={imagen}
                alt={nombre}
                className="h-24 w-24 rounded-full ring-4 ring-gray-200 object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ring-4 ring-gray-200">
                <User className="h-12 w-12 text-gray-600" />
              </div>
            )}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{nombre}</h3>
              <Badge
                className={`mt-2 ${getRolBadgeColor(rol)} border flex items-center gap-1.5 w-fit mx-auto`}
              >
                {getRolIcon(rol)}
                <span>{rol}</span>
              </Badge>
            </div>
          </div>

          {/* Información Detallada */}
          <div className="space-y-4 border-t pt-4">
            {/* Cargo */}
            <div className="flex items-start space-x-3">
              <Briefcase className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">Cargo</p>
                <p className="text-base text-gray-900 break-words">{cargo}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">
                  Correo Electrónico
                </p>
                <a
                  href={`mailto:${email}`}
                  className="text-base text-blue-600 hover:text-blue-800 break-words hover:underline"
                >
                  {email}
                </a>
              </div>
            </div>

            {/* Fecha de incorporación */}
            {participante.createdAt && (
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-500">
                    Fecha de Incorporación
                  </p>
                  <p className="text-base text-gray-900">
                    {new Date(participante.createdAt).toLocaleDateString(
                      'es-ES',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ID del Participante */}
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500">
                  ID de Participante
                </p>
                <p className="text-xs text-gray-600 font-mono break-all">
                  {participante.id}
                </p>
              </div>
            </div>

            {/* Información adicional si tiene cuenta de usuario */}
            {participante.user && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Información de Usuario
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">ID de Usuario:</span>{' '}
                    <span className="font-mono text-xs">
                      {participante.user.id}
                    </span>
                  </p>
                  {participante.user.createdAt && (
                    <p>
                      <span className="font-medium">Cuenta creada:</span>{' '}
                      {new Date(participante.user.createdAt).toLocaleDateString(
                        'es-ES',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
