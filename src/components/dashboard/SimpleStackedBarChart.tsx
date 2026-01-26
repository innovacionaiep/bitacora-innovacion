'use client';

interface StackedBarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleStackedBarChartProps {
  data: StackedBarData[];
  title?: string;
  height?: number;
}

export function SimpleStackedBarChart({ data, title, height = 250 }: SimpleStackedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        No hay datos disponibles
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      )}
      <div className="flex items-end justify-center gap-3" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = item.color || colors[index % colors.length];
          // Calcular altura en píxeles basada en el porcentaje
          const barHeightPx = Math.max((percentage / 100) * height, percentage > 0 ? 4 : 0);

          return (
            <div key={item.label} className="flex flex-col items-center gap-1" style={{ height: `${height}px`, justifyContent: 'flex-end' }}>
              <div className="relative" style={{ height: `${height}px`, width: '60px' }}>
                <div
                  className="rounded-t transition-all duration-500 absolute bottom-0 left-1/2 transform -translate-x-1/2"
                  style={{
                    height: `${barHeightPx}px`,
                    width: '45px',
                    backgroundColor: color,
                    minHeight: barHeightPx > 0 ? '4px' : '0px',
                  }}
                >
                  {percentage > 15 && (
                    <span className="absolute top-1 left-1/2 transform -translate-x-1/2 text-white font-bold text-xs">
                      {item.value}
                    </span>
                  )}
                </div>
                {percentage <= 15 && percentage > 0 && (
                  <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-full text-gray-900 font-bold text-xs whitespace-nowrap mb-1">
                    {item.value}
                  </span>
                )}
              </div>
              <span className="text-gray-700 font-medium text-xs text-center mt-2 break-words px-1" style={{ maxWidth: '60px' }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
