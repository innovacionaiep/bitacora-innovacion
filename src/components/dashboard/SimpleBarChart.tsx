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
}

export function SimpleBarChart({
  data,
  title,
  height = 200,
}: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  /** Valores son porcentajes 0-100: la barra usa el valor directo, no normalizado al máximo */
  const colors = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ];

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      <div className="space-y-3" style={{ minHeight: `${height}px` }}>
        {data.map((item, index) => {
          const barWidth = Math.min(100, Math.max(0, item.value));
          const color = item.color || colors[index % colors.length];

          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center text-sm mb-1">
                <span className="text-gray-700 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-300 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="text-gray-900 font-bold text-sm min-w-[2.5rem] text-right">
                  {item.value}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
