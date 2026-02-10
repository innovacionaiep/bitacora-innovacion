'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarProps {
  value?: string | undefined;
  onChange?: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  /** Modo compacto para espacios reducidos (ej. dentro de modales) */
  compact?: boolean;
}

// Configuración para Chile
const CHILE_LOCALE = {
  months: [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ],
  weekDays: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
};

export function Calendar({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  className,
  disabled = false,
  minDate,
  maxDate,
  compact = false,
}: CalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Formatear fecha
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Parsear fecha desde string
  const parseDate = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Sincronizar con el valor prop - MEJORADO
  useEffect(() => {
    if (value) {
      const parsedDate = parseDate(value);
      if (parsedDate) {
        setSelectedDate(parsedDate);
        console.log('Sincronizando fecha desde prop:', parsedDate);
      }
    } else {
      // Solo limpiar si el valor prop es explícitamente vacío
      setSelectedDate(null);
      console.log('Limpiando fecha desde prop');
    }
  }, [value]);

  // Cerrar calendario al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Generar días del mes
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Días del mes anterior
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
      });
    }

    // Días del mes actual
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate
        ? date.toDateString() === selectedDate.toDateString()
        : false;

      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected,
      });
    }

    // Días del mes siguiente
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Manejar selección de fecha - CORREGIDO
  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    console.log('Click detectado en:', date, 'isCurrentMonth:', isCurrentMonth);

    // Solo permitir selección de días del mes actual
    if (!isCurrentMonth) {
      console.log('Día de otro mes, ignorando');
      return;
    }

    // Verificar restricciones básicas
    if (minDate) {
      const minDateObj = new Date(minDate);
      if (date < minDateObj) {
        console.log('Fecha antes de minDate, ignorando');
        return;
      }
    }
    if (maxDate) {
      const maxDateObj = new Date(maxDate);
      if (date > maxDateObj) {
        console.log('Fecha después de maxDate, ignorando');
        return;
      }
    }

    console.log('Seleccionando fecha:', date);

    // Formatear la fecha ANTES de actualizar el estado
    const formattedDate = formatDate(date);
    console.log('Fecha formateada:', formattedDate);

    // Notificar cambio PRIMERO
    if (onChange) {
      onChange(formattedDate);
    }

    // Luego actualizar el estado local
    setSelectedDate(date);

    // Cerrar calendario después de un pequeño delay para asegurar que el estado se actualice
    setTimeout(() => {
      setIsOpen(false);
    }, 50);
  };

  // Navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="relative" ref={calendarRef}>
      {/* Input trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full justify-start text-left font-normal h-10 px-2 py-2 inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
          !selectedDate && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate text-sm">
          {selectedDate ? formatDate(selectedDate) : placeholder}
        </span>
      </button>

      {/* Calendar dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 rounded-lg border bg-white shadow-lg',
            compact ? 'w-56 left-0 top-full mt-1' : 'w-80'
          )}
          style={
            compact
              ? {}
              : {
                  left: 'calc(100% + 20px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                }
          }
        >
          {/* Header */}
          <div
            className={cn(
              'flex items-center justify-between border-b',
              compact ? 'p-2' : 'p-4'
            )}
          >
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className={cn(
                'p-0 inline-flex items-center justify-center rounded-md font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                compact ? 'h-6 w-6' : 'h-8 w-8'
              )}
            >
              <ChevronLeft className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </button>

            <div className="text-center">
              <h3
                className={cn(
                  'font-semibold text-gray-900',
                  compact ? 'text-xs' : 'text-lg'
                )}
              >
                {CHILE_LOCALE.months[currentMonth.getMonth()]}
              </h3>
              <div
                className={
                  compact ? 'text-xs text-gray-500' : 'text-sm text-gray-500'
                }
              >
                {currentMonth.getFullYear()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className={cn(
                'p-0 inline-flex items-center justify-center rounded-md font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                compact ? 'h-6 w-6' : 'h-8 w-8'
              )}
            >
              <ChevronRight className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            </button>
          </div>

          {/* Week days header */}
          <div
            className={cn(
              'grid grid-cols-7',
              compact ? 'gap-0.5 px-1 pt-1' : 'gap-1 p-2'
            )}
          >
            {CHILE_LOCALE.weekDays.map((day) => (
              <div
                key={day}
                className={cn(
                  'text-center font-medium text-gray-500',
                  compact ? 'text-[10px] py-0.5' : 'text-sm py-2'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            className={cn(
              'grid grid-cols-7',
              compact ? 'gap-0.5 p-1 pb-2' : 'gap-1 p-2'
            )}
          >
            {days.map((day, index) => {
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                handleDateClick(day.date, day.isCurrentMonth);
              };

              return (
                <div
                  key={`${day.date.getFullYear()}-${day.date.getMonth()}-${day.date.getDate()}-${index}`}
                  onClick={handleClick}
                  onMouseDown={(e) => e.preventDefault()}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md font-medium transition-colors select-none',
                    compact ? 'h-6 w-6 text-[11px]' : 'h-8 w-8 text-sm',
                    !day.isCurrentMonth && 'text-gray-300 cursor-not-allowed',
                    day.isCurrentMonth &&
                      'hover:bg-gray-100 cursor-default active:bg-gray-200',
                    day.isToday &&
                      day.isCurrentMonth &&
                      'bg-blue-100 text-blue-600 font-semibold',
                    day.isSelected && 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {day.date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
