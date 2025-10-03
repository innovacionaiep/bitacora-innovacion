'use client';

import React, { useState } from 'react';
import { Calendar } from './calendar';
import { Label } from './label';
import { Button } from './button';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  onRangeChange?: (startDate: string, endDate: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showLabels?: boolean;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
  className,
  disabled = false,
  placeholder = 'Seleccionar rango de fechas',
  showLabels = true,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStartDateChange = (date: string) => {
    onStartDateChange?.(date);
    onRangeChange?.(date, endDate || '');
  };

  const handleEndDateChange = (date: string) => {
    onEndDateChange?.(date);
    onRangeChange?.(startDate || '', date);
  };

  const clearRange = () => {
    onStartDateChange?.('');
    onEndDateChange?.('');
    onRangeChange?.('', '');
  };

  const formatRange = () => {
    if (!startDate && !endDate) return placeholder;

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    } else if (startDate) {
      return `Desde ${formatDate(startDate)}`;
    } else if (endDate) {
      return `Hasta ${formatDate(endDate)}`;
    }

    return placeholder;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Trigger button */}
      <Button
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full justify-start text-left font-normal',
          !startDate && !endDate && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {formatRange()}
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              clearRange();
            }}
            className="ml-auto h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </Button>

      {/* Date picker dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {showLabels && (
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha de inicio
                </Label>
              )}
              <Calendar
                value={startDate}
                onChange={handleStartDateChange}
                placeholder="Seleccionar inicio"
                className="w-full"
                maxDate={endDate || undefined}
              />
            </div>
            <div>
              {showLabels && (
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha de fin
                </Label>
              )}
              <Calendar
                value={endDate}
                onChange={handleEndDateChange}
                placeholder="Seleccionar fin"
                className="w-full"
                minDate={startDate || undefined}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRange}
              className="text-gray-500 hover:text-gray-700"
            >
              Limpiar
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={!startDate || !endDate}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
