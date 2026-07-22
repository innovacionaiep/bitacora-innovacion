'use client';

interface BarChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarChartData[];
  title?: string;
  height?: number;
  /** percent: value is 0–100 and shown as %. count: value is absolute; bar normalized to max. */
  valueMode?: 'percent' | 'count';
  /** When valueMode=count and total provided, show "N (x%)" using this denominator. */
  totalForPercent?: number;
}

export function SimpleBarChart({
  data,
  title,
  height = 200,
  valueMode = 'percent',
  totalForPercent,
}: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-gray-400">
        No hay datos disponibles
      </div>
    );
  }

  const colors = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ];

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-[13px] font-medium tracking-wide text-gray-800 mb-4">
          {title}
        </h3>
      )}
      <div className="space-y-3" style={{ minHeight: `${height}px` }}>
        {data.map((item, index) => {
          const barWidth =
            valueMode === 'percent'
              ? Math.min(100, Math.max(0, item.value))
              : Math.min(100, (item.value / maxValue) * 100);
          const color = item.color || colors[index % colors.length];
          const pctOfTotal =
            totalForPercent && totalForPercent > 0
              ? Math.round((item.value / totalForPercent) * 1000) / 10
              : null;

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center text-[13px] mb-1">
                <span className="text-gray-700 truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="text-gray-800 font-medium text-[12px] tabular-nums min-w-[3.5rem] text-right">
                  {valueMode === 'percent'
                    ? `${Math.round(item.value)}%`
                    : pctOfTotal !== null
                      ? `${item.value} (${pctOfTotal}%)`
                      : String(item.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
