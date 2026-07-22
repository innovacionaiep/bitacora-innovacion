'use client';

interface DonutChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleDonutChartProps {
  data: DonutChartData[];
  title?: string;
  size?: number;
}

export function SimpleDonutChart({
  data,
  title,
  size = 160,
}: SimpleDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[13px] text-gray-400">
        No hay datos disponibles
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const colors = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#9ca3af',
  ];

  let currentOffset = 0;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const segmentLength = (percentage / 100) * circumference;
    const gap = circumference - segmentLength;
    const strokeDasharray = `${segmentLength} ${gap}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += segmentLength;
    const color = item.color || colors[index % colors.length];

    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      color,
    };
  });

  return (
    <div className="w-full h-full">
      {title && (
        <h3 className="text-[13px] font-medium tracking-wide text-gray-800 mb-4">
          {title}
        </h3>
      )}
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <div
          className="relative flex-shrink-0"
          style={{ width: size, height: size }}
        >
          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((segment) => (
              <circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-500"
              />
            ))}
          </svg>
        </div>
        <div className="w-full px-1">
          <div className="space-y-2">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className="flex items-center justify-between text-[12px] gap-2 pb-1.5 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-gray-600 truncate">{segment.label}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 tabular-nums">
                  <span className="text-gray-800 font-medium">
                    {segment.value}
                  </span>
                  <span className="text-gray-400">
                    ({segment.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
