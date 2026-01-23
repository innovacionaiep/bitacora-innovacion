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

export function SimpleDonutChart({ data, title, size = 200 }: SimpleDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  let currentOffset = 0;
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const strokeDasharray = (percentage / 100) * circumference;
    const strokeDashoffset = -currentOffset;
    currentOffset += strokeDasharray;
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
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((segment, index) => (
              <circle
                key={segment.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="20"
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
        <div className="w-full space-y-2">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-gray-700">{segment.label}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-900 font-bold">{segment.value}</span>
                <span className="text-gray-500">({segment.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
