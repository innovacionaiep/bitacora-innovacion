'use client';

import { useState, type ReactNode } from 'react';
import {
  ImagePlus,
  BarChart3,
  Wallet,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { type AlertasPortal } from '@/lib/actions/portal-inicio';
import { ROLES_ALERTAS_PORTAL } from '@/lib/portal-constants';
import { ActividadDetalleModal } from './ActividadDetalleModal';
import { IndicadorDetalleModal } from './IndicadorDetalleModal';
import { GastoPresupuestoDetalleModal } from './GastoPresupuestoDetalleModal';

export interface PortalAlertasPendientesProps {
  alertas: AlertasPortal | null;
  activeRole: string | null;
  loading?: boolean;
  onSuccess?: () => void | Promise<void>;
  /** Columna extra (p. ej. compromisos) en el mismo grid. */
  extraColumn?: ReactNode;
}

const ALERT_ROW =
  'w-full flex items-start gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50/80 transition-colors group cursor-pointer text-left shadow-none';

const SECTION_TITLE =
  'text-[13px] font-medium tracking-wide text-gray-800 flex items-center gap-2 mb-2';

function isRolPortal(role: string | null): boolean {
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
    <section className="min-w-0 flex flex-col">
      <h3 className={SECTION_TITLE}>
        <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{title}</span>
      </h3>
      <div className="min-h-0 flex-1 space-y-1.5">{children}</div>
    </section>
  );
}

function EmptyLabel({ text }: { text: string }) {
  return <p className="text-[13px] text-gray-400 py-1">{text}</p>;
}

export function PortalAlertasPendientes({
  alertas,
  activeRole,
  loading = false,
  onSuccess,
  extraColumn,
}: PortalAlertasPendientesProps) {
  const rolPermitido = isRolPortal(activeRole);
  /** Solo Encargado puede agregar evidencias desde el portal (atribución operativa). */
  const canAddEvidencia = activeRole === 'Encargado';
  const gridClass = extraColumn
    ? 'h-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 px-1 content-start'
    : 'h-full grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 px-1 content-start';

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
  } | null>(null);

  if (loading) {
    return (
      <div className={gridClass}>
        {(
          [
            ['Actividades por evidenciar', ImagePlus],
            ['Indicadores por evidenciar', BarChart3],
            ['Presupuesto por solicitar', Wallet],
            ['Actividades atrasadas', Clock],
          ] as const
        ).map(([title, Icon]) => (
          <SectionColumn key={title} icon={Icon} title={title}>
            <div className="min-h-[48px]" />
          </SectionColumn>
        ))}
        {extraColumn}
      </div>
    );
  }

  if (!rolPermitido) {
    if (extraColumn) {
      return <div className={gridClass}>{extraColumn}</div>;
    }
    return (
      <p className="text-[13px] text-gray-400 px-1 py-2">
        Las alertas están disponibles para los roles Coordinador, Encargado,
        Colaborador, Docente y Estudiante.
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
                  <p className="text-[13px] text-gray-800 truncate">{a.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold tabular-nums text-emerald-700">
                      {a.porcentaje}%
                    </span>
                    <span className="text-[12px] text-red-600">
                      Evidencias pendientes
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {a.proyectoNombre}
                  </p>
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
                  <p className="text-[13px] text-gray-800 truncate">{i.nombre}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold tabular-nums text-blue-700">
                      {i.porcentaje}%
                    </span>
                    <span className="text-[12px] text-red-600">
                      Evidencias pendientes
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {i.proyectoNombre}
                  </p>
                </div>
              </button>
            ))
          )}
        </SectionColumn>

        <SectionColumn icon={Wallet} title="Presupuesto por solicitar">
          {presupuestoItems.length === 0 ? (
            <EmptyLabel text="Ninguno" />
          ) : (
            presupuestoItems.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresupuestoModal({ itemId: p.id })}
                className={ALERT_ROW}
              >
                <Wallet
                  className="h-4 w-4 shrink-0 text-amber-600 mt-0.5"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-[13px] text-gray-800 truncate">{p.item}</p>
                  <span className="text-[12px] text-red-600">
                    Solicitud pendiente
                  </span>
                  <p className="text-[11px] text-gray-500 truncate">
                    {p.proyectoNombre}
                  </p>
                </div>
              </button>
            ))
          )}
        </SectionColumn>

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
                  <p className="text-[13px] text-gray-800 truncate">{a.name}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold tabular-nums text-red-700">
                      {a.porcentaje}%
                    </span>
                    <span className="text-[12px] text-red-600">
                      {a.tareasAtrasadas === 1
                        ? '1 tarea vencida'
                        : `${a.tareasAtrasadas} tareas vencidas`}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {a.proyectoNombre}
                  </p>
                </div>
              </button>
            ))
          )}
        </SectionColumn>

        {extraColumn}
      </div>

      <ActividadDetalleModal
        actividadId={actividadModal?.actividadId ?? null}
        proyectoId={actividadModal?.proyectoId ?? null}
        open={!!actividadModal}
        onOpenChange={(open) => !open && setActividadModal(null)}
        canAddEvidencia={canAddEvidencia}
        onSuccess={onSuccess}
      />
      <IndicadorDetalleModal
        indicadorId={indicadorModal?.indicadorId ?? null}
        proyectoId={indicadorModal?.proyectoId ?? null}
        open={!!indicadorModal}
        onOpenChange={(open) => !open && setIndicadorModal(null)}
        onSuccess={onSuccess}
      />
      <GastoPresupuestoDetalleModal
        itemId={presupuestoModal?.itemId ?? null}
        open={!!presupuestoModal}
        onOpenChange={(open) => !open && setPresupuestoModal(null)}
        onSuccess={onSuccess}
      />
    </>
  );
}
