'use client';

import { useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import {
  ImagePlus,
  BarChart3,
  Wallet,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { type AlertasPortal } from '@/lib/actions/portal-inicio';
import {
  ROLES_ALERTAS_PORTAL,
  canEditPortalProject,
} from '@/lib/portal-constants';
import { ActividadDetalleModal } from './ActividadDetalleModal';
import { IndicadorDetalleModal } from './IndicadorDetalleModal';
import { GastoPresupuestoDetalleModal } from './GastoPresupuestoDetalleModal';

export interface PortalAlertasPendientesProps {
  alertas: AlertasPortal | null;
  /** @deprecated Ignored; use alertas.miRolPorProyecto */
  activeRole?: string | null;
  loading?: boolean;
  onSuccess?: () => void | Promise<void>;
  /** Columna extra (p. ej. compromisos) en el mismo grid. */
  extraColumn?: ReactNode;
}

const ALERT_ROW =
  'w-full flex items-start gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50/80 transition-colors group cursor-pointer text-left shadow-none';

const SECTION_TITLE =
  'text-[13px] font-medium tracking-wide text-gray-800 flex items-center gap-2 mb-2';

/** Mismo gris claro que los títulos de Mis proyectos / Últimas actualizaciones. */
const SECTION_SHELL =
  'min-w-0 h-full flex flex-col rounded-lg border border-gray-200 bg-gray-50/90 p-3 overflow-hidden';

function isRolPortal(role: string | null | undefined): boolean {
  return (
    role != null && (ROLES_ALERTAS_PORTAL as readonly string[]).includes(role)
  );
}

function SectionColumn({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={SECTION_SHELL}>
      <h3 className={SECTION_TITLE}>
        <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{title}</span>
      </h3>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto">{children}</div>
    </section>
  );
}

function EmptyLabel({ text }: { text: string }) {
  return <p className="text-[13px] text-gray-400 py-1">{text}</p>;
}

function ProyectoLine({ nombre }: { nombre: string }) {
  return (
    <p className="text-[11px] text-gray-500 break-words [overflow-wrap:anywhere]">
      Proyecto: &quot;{nombre}&quot;
    </p>
  );
}

/** Columna extra (compromisos) con separador vertical sutil en xl. */
function ExtraColumnSlot({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0 min-h-0 h-full flex flex-col xl:before:content-[''] xl:before:absolute xl:before:-left-3 xl:before:top-0 xl:before:bottom-0 xl:before:w-px xl:before:bg-gray-200">
      {children}
    </div>
  );
}

export function PortalAlertasPendientes({
  alertas,
  loading = false,
  onSuccess,
  extraColumn,
}: PortalAlertasPendientesProps) {
  const { data: session } = useSession();
  const availableRoles = session?.user?.availableRoles ?? [];
  const rolesByProyecto = alertas?.miRolPorProyecto ?? {};
  const hasAnyPortalRole = Object.values(rolesByProyecto).some(isRolPortal);
  const canEditFor = (proyectoId: string | null | undefined) =>
    canEditPortalProject(
      availableRoles,
      proyectoId ? rolesByProyecto[proyectoId] : null
    );
  // Misma regla que Gantt/createEvidenciaActividad: participante del proyecto
  // (no solo Encargado). Si ve la alerta, puede adjuntar evidencia.
  const canAddEvidenciaFor = (proyectoId: string | null | undefined) =>
    Boolean(proyectoId && isRolPortal(rolesByProyecto[proyectoId]));
  const gridClass = extraColumn
    ? 'h-full min-h-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 px-1 items-stretch'
    : 'h-full min-h-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 px-1 items-stretch';

  const [actividadModal, setActividadModal] = useState<{
    actividadId: string;
    proyectoId: string;
  } | null>(null);
  const [indicadorModal, setIndicadorModal] = useState<{
    indicadorId: string;
    proyectoId: string;
  } | null>(null);
  const [presupuestoModal, setPresupuestoModal] = useState<{
    itemId: string;
    proyectoId: string;
  } | null>(null);

  if (loading) {
    return (
      <div className={gridClass}>
        {(
          [
            ['Actividades atrasadas', Clock],
            ['Actividades por evidenciar', ImagePlus],
            ['Indicadores por evidenciar', BarChart3],
            ['Presupuesto por solicitar', Wallet],
          ] as const
        ).map(([title, Icon]) => (
          <SectionColumn key={title} icon={Icon} title={title}>
            <div className="min-h-[48px]" />
          </SectionColumn>
        ))}
        {extraColumn ? <ExtraColumnSlot>{extraColumn}</ExtraColumnSlot> : null}
      </div>
    );
  }

  if (!hasAnyPortalRole) {
    if (extraColumn) {
      return <div className={gridClass}>{extraColumn}</div>;
    }
    return (
      <p className="text-[13px] text-gray-400 px-1 py-2">
        Las alertas están disponibles cuando participas como Coordinador,
        Encargado, Colaborador, Docente o Estudiante.
      </p>
    );
  }

  const presupuestoItems = alertas?.presupuestoPorSolicitar ?? [];
  const actividades = alertas?.actividadesPorEvidenciar ?? [];
  const indicadores = alertas?.indicadoresPorEvidenciar ?? [];
  const atrasadas = alertas?.actividadesAtrasadas ?? [];

  return (
    <>
      <div className={gridClass}>
        <SectionColumn icon={Clock} title="Actividades atrasadas">
          {atrasadas.length === 0 ? (
            <EmptyLabel text="Ninguna" />
          ) : (
            atrasadas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setActividadModal({
                    actividadId: a.id,
                    proyectoId: a.proyectoId,
                  })
                }
                className={ALERT_ROW}
              >
                <Clock
                  className="h-4 w-4 shrink-0 text-red-600 mt-0.5"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[13px] text-gray-800 break-words [overflow-wrap:anywhere]">
                    {a.name}
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-red-700">
                    {Math.round(a.porcentaje)}% actividad completada
                  </p>
                  <p className="text-[12px] text-red-600">
                    {a.tareasAtrasadas === 1
                      ? '1 tarea vencida'
                      : `${a.tareasAtrasadas} tareas vencidas`}
                  </p>
                  <ProyectoLine nombre={a.proyectoNombre} />
                </div>
              </button>
            ))
          )}
        </SectionColumn>

        <SectionColumn icon={ImagePlus} title="Actividades por evidenciar">
          {actividades.length === 0 ? (
            <EmptyLabel text="Ninguna" />
          ) : (
            actividades.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  setActividadModal({
                    actividadId: a.id,
                    proyectoId: a.proyectoId,
                  })
                }
                className={ALERT_ROW}
              >
                <ImagePlus
                  className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[13px] text-gray-800 break-words [overflow-wrap:anywhere]">
                    {a.name}
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-emerald-700">
                    {Math.round(a.porcentaje)}% actividad completada
                  </p>
                  <p className="text-[12px] text-red-600">
                    Evidencias pendientes
                  </p>
                  <ProyectoLine nombre={a.proyectoNombre} />
                </div>
              </button>
            ))
          )}
        </SectionColumn>

        <SectionColumn icon={BarChart3} title="Indicadores por evidenciar">
          {indicadores.length === 0 ? (
            <EmptyLabel text="Ninguno" />
          ) : (
            indicadores.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() =>
                  setIndicadorModal({
                    indicadorId: i.id,
                    proyectoId: i.proyectoId,
                  })
                }
                className={ALERT_ROW}
              >
                <BarChart3
                  className="h-4 w-4 shrink-0 text-blue-600 mt-0.5"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[13px] text-gray-800 break-words [overflow-wrap:anywhere]">
                    {i.nombre}
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-blue-700">
                    {Math.round(i.porcentaje)}% del indicador completado
                  </p>
                  <p className="text-[12px] text-red-600">
                    Evidencias pendientes
                  </p>
                  <ProyectoLine nombre={i.proyectoNombre} />
                </div>
              </button>
            ))
          )}
        </SectionColumn>

        <SectionColumn icon={Wallet} title="Presupuesto por solicitar">
          {presupuestoItems.length === 0 ? (
            <EmptyLabel text="Ninguno" />
          ) : (
            presupuestoItems.map((p) => {
              const content = (
                <>
                  <Wallet
                    className="h-4 w-4 shrink-0 text-amber-600 mt-0.5"
                    strokeWidth={1.75}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-[13px] text-gray-800 break-words [overflow-wrap:anywhere]">
                      {p.item}
                    </p>
                    {p.isDelta ? (
                      <p className="text-[13px] font-semibold tabular-nums text-amber-700">
                        {[p.detalle, p.montoLabel].filter(Boolean).join(' · ')}
                      </p>
                    ) : (
                      <>
                        {p.montoLabel ? (
                          <p className="text-[13px] font-semibold tabular-nums text-amber-700">
                            {p.montoLabel}
                          </p>
                        ) : null}
                        {p.detalle ? (
                          <p className="text-[12px] text-gray-600 break-words [overflow-wrap:anywhere]">
                            {p.detalle}
                          </p>
                        ) : null}
                      </>
                    )}
                    <p className="text-[12px] text-red-600">
                      Solicitud pendiente
                    </p>
                    <ProyectoLine nombre={p.proyectoNombre} />
                  </div>
                </>
              );

              if (p.isDelta) {
                return (
                  <div
                    key={p.id}
                    className={`${ALERT_ROW} cursor-default hover:bg-white`}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setPresupuestoModal({
                      itemId: p.id,
                      proyectoId: p.proyectoId,
                    })
                  }
                  className={ALERT_ROW}
                >
                  {content}
                </button>
              );
            })
          )}
        </SectionColumn>

        {extraColumn ? <ExtraColumnSlot>{extraColumn}</ExtraColumnSlot> : null}
      </div>

      <ActividadDetalleModal
        actividadId={actividadModal?.actividadId ?? null}
        proyectoId={actividadModal?.proyectoId ?? null}
        open={!!actividadModal}
        onOpenChange={(open) => !open && setActividadModal(null)}
        canEdit={canEditFor(actividadModal?.proyectoId)}
        canAddEvidencia={canAddEvidenciaFor(actividadModal?.proyectoId)}
        onSuccess={onSuccess}
      />
      <IndicadorDetalleModal
        indicadorId={indicadorModal?.indicadorId ?? null}
        proyectoId={indicadorModal?.proyectoId ?? null}
        open={!!indicadorModal}
        onOpenChange={(open) => !open && setIndicadorModal(null)}
        canEdit={canEditFor(indicadorModal?.proyectoId)}
        onSuccess={onSuccess}
      />
      <GastoPresupuestoDetalleModal
        itemId={presupuestoModal?.itemId ?? null}
        open={!!presupuestoModal}
        onOpenChange={(open) => !open && setPresupuestoModal(null)}
        onSuccess={onSuccess}
        canEdit={canEditFor(presupuestoModal?.proyectoId)}
      />
    </>
  );
}
