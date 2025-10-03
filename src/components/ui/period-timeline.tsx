import React from 'react';

interface PeriodTimelineProps {
  startDate?: string;
  endDate?: string;
  className?: string;
}

export const PeriodTimeline: React.FC<PeriodTimelineProps> = ({
  startDate,
  endDate,
  className = '',
}) => {
  // Función para formatear fecha en formato chileno
  const formatDateChilean = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('es-ES', { month: 'long' });
    const year = date.getFullYear();

    // Capitalizar la primera letra del mes
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${day} ${capitalizedMonth.toUpperCase()} ${year}`;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex space-x-4">
        {/* Fecha de inicio */}
        <div className="flex flex-col items-center space-y-1">
          <span className="text-xs font-medium text-gray-600">Inicio:</span>
          <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
            <span className="text-sm text-gray-900">
              {startDate ? formatDateChilean(startDate) : '--'}
            </span>
          </div>
        </div>

        {/* Línea conectora con flecha - posicionada exactamente en el centro de las tarjetas */}
        <div className="flex-1 relative" style={{ paddingTop: '42px' }}>
          <div className="w-full h-px bg-gray-300 relative">
            <div
              className="absolute right-0 w-0 h-0 border-l-[6px] border-l-gray-300 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent"
              style={{ top: '-4px' }}
            ></div>
          </div>
        </div>

        {/* Fecha de término */}
        <div className="flex flex-col items-center space-y-1">
          <span className="text-xs font-medium text-gray-600">Término:</span>
          <div className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm">
            <span className="text-sm text-gray-900">
              {endDate ? formatDateChilean(endDate) : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
