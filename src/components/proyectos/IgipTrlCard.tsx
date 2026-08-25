'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getIgipTrlProyecto,
  upsertIgipTrlProyecto,
} from '@/lib/actions/igip-trl';
import {
  IGIP_SCORE_MAX,
  IGIP_SCORE_MIN,
  IGIP_SUBDIMENSIONS,
  TRL_LEVELS,
  TRL_MAX,
  emptyIgipTrlData,
  radarLabelSlot,
  radarPolygonPoints,
  radarVertex,
  trlRowAppearance,
  nextTrlOnClick,
  trlBadgeWidthPx,
  type IgipSubdimensionKey,
  type IgipTrlData,
  type IgipTrlPatch,
} from '@/lib/igip-trl';
import { igipTrlKey } from '@/lib/query-keys';
import { runOptimisticMutation } from '@/lib/ui/optimistic-mutation';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { cn } from '@/lib/utils';

const CX = 160;
const CY = 160;
const RADIUS = 148;
const VIEW = 320;

const LABEL_ALIGN_CLASS: Record<
  ReturnType<typeof radarLabelSlot>['align'],
  string
> = {
  top: '-translate-x-1/2 -translate-y-[calc(100%+0.2rem-10px)] items-center text-center',
  topRight:
    '-translate-x-1/2 -translate-y-[calc(100%+0.2rem)] items-center text-center',
  bottomRight:
    '-translate-x-[calc(50%-15px)] translate-y-1 items-center text-center',
  bottom: '-translate-x-1/2 translate-y-[calc(2.5rem-35px)] items-center text-center',
  bottomLeft:
    '-translate-x-[calc(50%+15px)] translate-y-[calc(0.25rem+15px)] items-center text-center',
  topLeft:
    '-translate-x-1/2 -translate-y-[calc(100%+0.2rem)] items-center text-center',
};

type IgipTrlCardProps = {
  projectId: string;
  topLoaderEnabled?: boolean;
};

function HoverPencil({
  label,
  onClick,
  className,
  iconClassName,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gray-100 p-1 opacity-0 transition-opacity group-hover/edit:opacity-100 focus-visible:opacity-100 hover:bg-gray-200',
        className
      )}
      title={label}
      aria-label={label}
    >
      <Pencil className={cn('h-3 w-3 text-gray-700', iconClassName)} />
    </button>
  );
}

function ScoreField({
  dimKey,
  label,
  value,
  editing,
  onStartEdit,
  onStopEdit,
  onCommit,
}: {
  dimKey: IgipSubdimensionKey;
  label: string;
  value: number | null;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onCommit: (key: IgipSubdimensionKey, raw: string) => void;
}) {
  if (editing) {
    return (
      <select
        autoFocus
        className="h-7 w-12 shrink-0 rounded-md border border-gray-200 bg-white text-center text-[13px] font-medium"
        defaultValue={value ?? ''}
        onChange={(e) => onCommit(dimKey, e.target.value)}
        onBlur={onStopEdit}
        aria-label={label}
      >
        <option value="">—</option>
        {Array.from(
          { length: IGIP_SCORE_MAX - IGIP_SCORE_MIN + 1 },
          (_, i) => IGIP_SCORE_MIN + i
        ).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="group/edit relative inline-flex min-h-7 min-w-[1.5rem] items-center justify-center">
      <span className="text-[13px] font-medium leading-snug text-gray-800">
        {value == null ? '—' : value}
      </span>
      <HoverPencil
        label={`Editar ${label}`}
        onClick={onStartEdit}
        className="absolute left-full ml-0.5"
      />
    </div>
  );
}

function IgipRadar({
  data,
  onScoreChange,
}: {
  data: IgipTrlData;
  onScoreChange: (key: IgipSubdimensionKey, raw: string) => void;
}) {
  const [editingScore, setEditingScore] = useState<IgipSubdimensionKey | null>(
    null
  );
  const scores = IGIP_SUBDIMENSIONS.map((d) => data[d.key]);
  const polygon = radarPolygonPoints(scores, {
    cx: CX,
    cy: CY,
    radius: RADIUS,
  });
  const rings = [1, 2, 3, 4].map((level) =>
    radarPolygonPoints(
      Array.from({ length: 6 }, () => level),
      { cx: CX, cy: CY, radius: RADIUS }
    )
  );
  const axes = IGIP_SUBDIMENSIONS.map((_, index) =>
    radarVertex(index, IGIP_SCORE_MAX, {
      count: 6,
      cx: CX,
      cy: CY,
      radius: RADIUS,
    })
  );

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[42rem] min-h-[24rem] -mt-6 translate-y-[30px] overflow-visible pb-10"
      data-tour="igip-trl-radar"
    >
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="absolute inset-x-[16%] top-[8%] bottom-[24%]"
        role="img"
        aria-label="Gráfico radial de subdimensiones IGIP"
      >
        {rings.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1.25}
          />
        ))}
        {axes.map((p, i) => (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={p.x}
            y2={p.y}
            stroke="#d1d5db"
            strokeWidth={1.25}
          />
        ))}
        <polygon
          points={polygon}
          fill="rgba(5, 150, 105, 0.22)"
          stroke="#059669"
          strokeWidth={2.5}
        />
      </svg>
      {IGIP_SUBDIMENSIONS.map((dim, index) => {
        const slot = radarLabelSlot(index, { cy: 42 });
        const topPct =
          slot.align === 'bottom' ? slot.yPct + 4 : slot.yPct;
        return (
          <div
            key={dim.key}
            className={cn(
              'absolute z-10 flex w-[10.5rem] max-w-[46%] flex-col gap-1',
              LABEL_ALIGN_CLASS[slot.align]
            )}
            style={{ left: `${slot.xPct}%`, top: `${topPct}%` }}
          >
            <span className="text-[11px] font-medium leading-snug text-gray-800">
              {dim.label}
            </span>
            <div className="-translate-y-[5px]">
              <ScoreField
              dimKey={dim.key}
              label={dim.label}
              value={data[dim.key]}
              editing={editingScore === dim.key}
              onStartEdit={() => setEditingScore(dim.key)}
              onStopEdit={() => setEditingScore(null)}
              onCommit={(key, raw) => {
                onScoreChange(key, raw);
                setEditingScore(null);
              }}
            />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function IgipTrlCard({
  projectId,
  topLoaderEnabled = true,
}: IgipTrlCardProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: igipTrlKey(projectId),
    queryFn: async () => {
      const result = await getIgipTrlProyecto(projectId);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Error al cargar IGIP-TRL');
      }
      return result.data;
    },
    staleTime: 60_000,
  });

  const loading = isLoading && !data;
  usePageTopLoader(loading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  const [optimistic, setOptimistic] = useState<IgipTrlData | null>(null);
  const persistGenRef = useRef(0);
  const current = optimistic ?? data ?? emptyIgipTrlData();
  const [igipDraft, setIgipDraft] = useState<string | null>(null);
  const [editingIgip, setEditingIgip] = useState(false);

  const igipDisplay = useMemo(() => {
    if (igipDraft !== null) return igipDraft;
    if (current.igip == null) return '';
    return String(current.igip);
  }, [igipDraft, current.igip]);

  function persist(patch: IgipTrlPatch) {
    const previous =
      queryClient.getQueryData<IgipTrlData>(igipTrlKey(projectId)) ?? current;
    const next = { ...previous, ...patch };
    const gen = ++persistGenRef.current;
    setOptimistic(next);
    queryClient.setQueryData<IgipTrlData>(igipTrlKey(projectId), next);

    void runOptimisticMutation({
      apply: () => previous,
      mutate: () => upsertIgipTrlProyecto(projectId, patch),
      rollback: (snapshot) => {
        if (gen !== persistGenRef.current) return;
        setOptimistic(null);
        queryClient.setQueryData(igipTrlKey(projectId), snapshot);
      },
      commit: (serverData) => {
        if (gen !== persistGenRef.current) return;
        const committed = serverData ?? next;
        setOptimistic(null);
        queryClient.setQueryData(igipTrlKey(projectId), committed);
        void queryClient.invalidateQueries({
          queryKey: ['historial', projectId],
        });
      },
    });
  }

  function onScoreChange(key: IgipSubdimensionKey, raw: string) {
    const value = raw === '' ? null : Number(raw);
    persist({ [key]: value });
  }

  function commitIgip() {
    const raw = igipDisplay.trim();
    const next = raw === '' ? null : Number(raw.replace(',', '.'));
    if (next !== null && !Number.isFinite(next)) {
      setIgipDraft(current.igip == null ? '' : String(current.igip));
      setEditingIgip(false);
      return;
    }
    if (next !== current.igip) {
      persist({ igip: next });
    }
    setIgipDraft(null);
    setEditingIgip(false);
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        Cargando IGIP-TRL…
      </div>
    );
  }

  if (error) {
    return (
      <p className="px-4 py-8 text-center text-sm text-red-600">
        {error instanceof Error ? error.message : 'Error al cargar IGIP-TRL'}
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto p-4">
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col overflow-visible rounded-xl border border-gray-100 bg-white p-3 pb-0 shadow-sm sm:p-4 sm:pb-0">
          <IgipRadar
            data={current}
            onScoreChange={(key, raw) => onScoreChange(key, raw)}
          />
          <div className="-mx-3 mt-[-10px] flex flex-wrap items-baseline justify-center gap-2 rounded-b-xl border-t border-gray-200 bg-gray-100 px-4 py-4 sm:-mx-4">
            <span className="text-xl font-semibold text-gray-900 sm:text-2xl">
              Índice IGIP =
            </span>
            {editingIgip ? (
              <input
                autoFocus
                className="w-28 border-0 border-b border-emerald-500 bg-transparent p-0 text-center text-xl font-semibold text-gray-900 outline-none sm:text-2xl"
                inputMode="decimal"
                value={igipDisplay}
                onChange={(e) => setIgipDraft(e.target.value)}
                onBlur={() => commitIgip()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                  if (e.key === 'Escape') {
                    setIgipDraft(null);
                    setEditingIgip(false);
                  }
                }}
                placeholder="—"
                aria-label="Índice IGIP"
              />
            ) : (
              <div className="group/edit relative inline-flex items-baseline">
                <span className="text-xl font-semibold text-gray-900 sm:text-2xl">
                  {current.igip == null ? '—' : String(current.igip)}
                </span>
                <HoverPencil
                  label="Editar Índice IGIP"
                  onClick={() => {
                    setIgipDraft(
                      current.igip == null ? '' : String(current.igip)
                    );
                    setEditingIgip(true);
                  }}
                  className="absolute left-full top-1/2 ml-1.5 -translate-y-1/2"
                  iconClassName="h-3.5 w-3.5"
                />
              </div>
            )}
          </div>
        </section>

        <section
          className="flex min-h-0 flex-col justify-center gap-5 rounded-xl border border-gray-100 bg-white p-4 pl-[calc(1rem+65px)] shadow-sm"
          data-tour="igip-trl-stack"
        >
          {[...TRL_LEVELS].reverse().map((row) => {
            const appearance = trlRowAppearance(row.level, current.trl);
            const selected = appearance === 'selected';
            const badgeWidth = trlBadgeWidthPx(row.level);
            return (
              <button
                key={row.level}
                type="button"
                data-testid={`trl-row-${row.level}`}
                data-appearance={appearance}
                onClick={() =>
                  persist({ trl: nextTrlOnClick(row.level, current.trl) })
                }
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg text-left transition-opacity',
                  selected ? 'opacity-100' : 'opacity-45'
                )}
                aria-pressed={selected}
                aria-label={
                  selected
                    ? `TRL ${row.level} seleccionado, clic para quitar: ${row.description}`
                    : `TRL ${row.level}: ${row.description}`
                }
              >
                <span
                  className="flex shrink-0 justify-center"
                  style={{ width: trlBadgeWidthPx(TRL_MAX) }}
                >
                  <span
                    className={cn(
                      'flex h-14 items-center justify-center rounded-md text-sm font-semibold',
                      selected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-300 text-gray-600'
                    )}
                    style={{ width: badgeWidth }}
                  >
                    TRL {row.level}
                  </span>
                </span>
                <span
                  className={cn(
                    'translate-x-[15px] text-sm leading-snug',
                    selected ? 'font-medium text-gray-900' : 'text-gray-500'
                  )}
                >
                  {row.description}
                </span>
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}

export default IgipTrlCard;
