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
    const segmentLength = (percentage / 100) * circumference;
    // strokeDasharray: [longitud del segmento visible, espacio en blanco]
    // El espacio en blanco es el resto de la circunferencia para que el siguiente segmento comience después
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
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      <div className="flex items-center justify-center gap-12">
        {/* Gráfico donut a la izquierda */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
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
                strokeLinecap="butt"
                className="transition-all duration-500"
              />
            ))}
          </svg>
        </div>
        {/* Leyendas a la derecha */}
        <div className="flex-shrink-0">
          <div className="space-y-3">
            {segments.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between text-sm" style={{ minWidth: '200px' }}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="text-gray-700">{segment.label}</span>
                </div>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <span className="text-gray-900 font-bold">{segment.value}</span>
                  <span className="text-gray-500">({segment.percentage.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
