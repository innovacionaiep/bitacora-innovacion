'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  emptyIgipTrlData,
  radarPolygonPoints,
  radarVertex,
  trlRowAppearance,
  nextTrlOnClick,
  type IgipSubdimensionKey,
  type IgipTrlData,
  type IgipTrlPatch,
} from '@/lib/igip-trl';
import { igipTrlKey } from '@/lib/query-keys';
import { runOptimisticMutation } from '@/lib/ui/optimistic-mutation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const CX = 160;
const CY = 158;
const RADIUS = 92;
const VIEW = 320;

type IgipTrlCardProps = {
  projectId: string;
};

function IgipRadar({ data }: { data: IgipTrlData }) {
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
  const labels = IGIP_SUBDIMENSIONS.map((dim, index) => {
    const p = radarVertex(index, IGIP_SCORE_MAX, {
      count: 6,
      cx: CX,
      cy: CY,
      radius: RADIUS + 36,
    });
    return { ...dim, ...p };
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className="mx-auto h-auto w-full max-w-[22rem]"
      role="img"
      aria-label="Gráfico radial de subdimensiones IGIP"
      data-tour="igip-trl-radar"
    >
      {rings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
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
          strokeWidth={1}
        />
      ))}
      <polygon
        points={polygon}
        fill="rgba(5, 150, 105, 0.22)"
        stroke="#059669"
        strokeWidth={2}
      />
      {labels.map((label) => {
        const anchor =
          label.x < CX - 8 ? 'end' : label.x > CX + 8 ? 'start' : 'middle';
        const lines = wrapRadarLabel(label.label);
        return (
          <text
            key={label.key}
            x={label.x}
            y={label.y}
            textAnchor={anchor}
            className="fill-gray-700"
            fontSize={10}
          >
            {lines.map((line, i) => (
              <tspan key={i} x={label.x} dy={i === 0 ? 0 : 12}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

function wrapRadarLabel(label: string): string[] {
  if (label.length <= 22) return [label];
  const comma = label.indexOf(',');
  if (comma > 0) {
    return [label.slice(0, comma).trim(), label.slice(comma + 1).trim()];
  }
  const mid = label.lastIndexOf(' ', 20);
  if (mid > 0) return [label.slice(0, mid), label.slice(mid + 1)];
  return [label];
}

export function IgipTrlCard({ projectId }: IgipTrlCardProps) {
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

  const current = data ?? emptyIgipTrlData();
  const [igipDraft, setIgipDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const igipDisplay = useMemo(() => {
    if (igipDraft !== null) return igipDraft;
    if (current.igip == null) return '';
    return String(current.igip);
  }, [igipDraft, current.igip]);

  async function persist(patch: IgipTrlPatch) {
    const previous =
      queryClient.getQueryData<IgipTrlData>(igipTrlKey(projectId)) ?? current;
    setSaving(true);
    const result = await runOptimisticMutation({
      apply: () => {
        queryClient.setQueryData<IgipTrlData>(igipTrlKey(projectId), {
          ...previous,
          ...patch,
        });
        return previous;
      },
      mutate: () => upsertIgipTrlProyecto(projectId, patch),
      rollback: (snapshot) => {
        queryClient.setQueryData(igipTrlKey(projectId), snapshot);
      },
      commit: (serverData) => {
        if (serverData) {
          queryClient.setQueryData(igipTrlKey(projectId), serverData);
        }
      },
    });
    setSaving(false);
    return result;
  }

  async function onScoreChange(key: IgipSubdimensionKey, raw: string) {
    const value = raw === '' ? null : Number(raw);
    await persist({ [key]: value });
  }

  async function commitIgip() {
    const raw = igipDisplay.trim();
    const next = raw === '' ? null : Number(raw.replace(',', '.'));
    if (next !== null && !Number.isFinite(next)) {
      setIgipDraft(current.igip == null ? '' : String(current.igip));
      return;
    }
    if (next === current.igip) {
      setIgipDraft(null);
      return;
    }
    await persist({ igip: next });
    setIgipDraft(null);
  }

  if (isLoading) {
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
        <section className="flex min-h-0 flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <IgipRadar data={current} />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {IGIP_SUBDIMENSIONS.map((dim) => (
              <label
                key={dim.key}
                className="flex items-center justify-between gap-2 text-xs text-gray-700"
              >
                <span className="min-w-0 leading-tight">{dim.label}</span>
                <select
                  className="h-8 shrink-0 rounded-md border border-gray-200 bg-white px-2 text-sm"
                  value={current[dim.key] ?? ''}
                  onChange={(e) => void onScoreChange(dim.key, e.target.value)}
                  disabled={saving}
                  aria-label={dim.label}
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
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-baseline justify-center gap-2 border-t border-gray-100 pt-5">
            <span className="text-xl font-semibold text-gray-900 sm:text-2xl">
              Índice IGIP =
            </span>
            <Input
              className="h-11 w-32 text-center text-xl font-semibold sm:text-2xl"
              inputMode="decimal"
              value={igipDisplay}
              onChange={(e) => setIgipDraft(e.target.value)}
              onBlur={() => void commitIgip()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="—"
              aria-label="Índice IGIP"
              disabled={saving}
            />
          </div>
        </section>

        <section
          className="flex min-h-0 flex-col justify-center gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          data-tour="igip-trl-stack"
        >
          {TRL_LEVELS.map((row) => {
            const appearance = trlRowAppearance(row.level, current.trl);
            const selected = appearance === 'selected';
            return (
              <button
                key={row.level}
                type="button"
                data-testid={`trl-row-${row.level}`}
                data-appearance={appearance}
                disabled={saving}
                onClick={() =>
                  void persist({ trl: nextTrlOnClick(row.level, current.trl) })
                }
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg text-left transition-opacity',
                  selected ? 'opacity-100' : 'opacity-45',
                  saving && 'cursor-wait'
                )}
                aria-pressed={selected}
                aria-label={
                  selected
                    ? `TRL ${row.level} seleccionado, clic para quitar: ${row.description}`
                    : `TRL ${row.level}: ${row.description}`
                }
              >
                <span
                  className={cn(
                    'flex h-12 w-24 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
                    selected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-300 text-gray-600'
                  )}
                >
                  TRL {row.level}
                </span>
                <span
                  className={cn(
                    'text-sm leading-snug',
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
