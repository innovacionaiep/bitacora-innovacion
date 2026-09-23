import { describe, expect, it } from 'vitest';
import {
  compareCalendarDays,
  convertDateToISO,
  formatCalendarDisplay,
  formatCalendarPeriod,
  formatCalendarTooltip,
  isCalendarDateDisabled,
  isCalendarDayBefore,
  parseCalendarDate,
  toCalendarYmd,
} from './calendar-date';

describe('parseCalendarDate', () => {
  it('interpreta YYYY-MM-DD como medianoche local, no UTC', () => {
    const parsed = parseCalendarDate('2026-09-24');
    expect(parsed).not.toBeNull();
    expect(parsed!.getTime()).toBe(new Date(2026, 8, 24).getTime());
    expect(parsed!.getDate()).toBe(24);
    expect(parsed!.getMonth()).toBe(8);
    expect(parsed!.getFullYear()).toBe(2026);
  });

  it('acepta Date local sin correr el día', () => {
    expect(parseCalendarDate(new Date(2026, 8, 24))!.getTime()).toBe(
      new Date(2026, 8, 24).getTime()
    );
    expect(formatCalendarDisplay(new Date(2026, 8, 24))).toBe('24-09-2026');
  });

  it('acepta DD-MM-YYYY y DD/MM/YYYY', () => {
    expect(parseCalendarDate('24-09-2026')!.getTime()).toBe(
      new Date(2026, 8, 24).getTime()
    );
    expect(parseCalendarDate('24/09/2026')!.getTime()).toBe(
      new Date(2026, 8, 24).getTime()
    );
  });

  it('rechaza fechas imposibles', () => {
    expect(parseCalendarDate('2026-02-31')).toBeNull();
    expect(parseCalendarDate('')).toBeNull();
  });
});

describe('toCalendarYmd / convertDateToISO', () => {
  it('normaliza formatos de pantalla a YYYY-MM-DD', () => {
    expect(convertDateToISO('24-09-2026')).toBe('2026-09-24');
    expect(convertDateToISO('24/09/2026')).toBe('2026-09-24');
    expect(convertDateToISO('2026-09-24')).toBe('2026-09-24');
  });

  it('emite YYYY-MM-DD desde Date local', () => {
    expect(toCalendarYmd(new Date(2026, 8, 24))).toBe('2026-09-24');
  });
});

describe('formatos de pantalla', () => {
  it('arma DD-MM-YYYY y período desde los números, sin zona horaria', () => {
    expect(formatCalendarDisplay('2026-09-24')).toBe('24-09-2026');
    expect(formatCalendarPeriod('2026-09-24')).toBe('24 SEPTIEMBRE 2026');
    expect(formatCalendarTooltip('2026-09-24')).toBe('24-septiembre-2026');
  });

  it('devuelve string si no puede parsear, también con Date inválida', () => {
    expect(formatCalendarDisplay('no-es-fecha')).toBe('no-es-fecha');
    expect(formatCalendarPeriod(new Date(NaN))).toBe('');
    expect(formatCalendarTooltip(new Date(NaN))).toBe('');
  });
});

describe('comparación por día', () => {
  it('permite el mismo día de inicio y término', () => {
    expect(compareCalendarDays('2026-09-24', '24-09-2026')).toBe(0);
    expect(isCalendarDayBefore('2026-09-24', '2026-09-24')).toBe(false);
    expect(
      isCalendarDateDisabled(new Date(2026, 8, 24), '2026-09-24')
    ).toBe(false);
  });

  it('deshabilita un día anterior al mínimo', () => {
    expect(
      isCalendarDateDisabled(new Date(2026, 8, 23), '2026-09-24')
    ).toBe(true);
  });
});
