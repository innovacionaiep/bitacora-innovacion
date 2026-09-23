/** Fechas de calendario (día civil) sin shift UTC. */

export type CalendarYmd = { year: number; month: number; day: number };

const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function validateParts(
  year: number,
  month: number,
  day: number
): CalendarYmd | null {
  if (
    year < 1000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Extrae año/mes/día de YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY o Date local. */
export function parseCalendarParts(
  dateString: string | Date | undefined | null
): CalendarYmd | null {
  if (!dateString) return null;
  if (dateString instanceof Date) {
    if (Number.isNaN(dateString.getTime())) return null;
    return validateParts(
      dateString.getFullYear(),
      dateString.getMonth() + 1,
      dateString.getDate()
    );
  }
  if (typeof dateString !== 'string') return null;
  const s = dateString.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    return validateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (slash) {
    return validateParts(Number(slash[3]), Number(slash[2]), Number(slash[1]));
  }

  const dash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
  if (dash) {
    return validateParts(Number(dash[3]), Number(dash[2]), Number(dash[1]));
  }

  return null;
}

/** Medianoche local del día civil. Nunca usar `new Date("YYYY-MM-DD")`. */
export function parseCalendarDate(
  dateString: string | Date | undefined | null
): Date | null {
  const parts = parseCalendarParts(dateString);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
}

function formatYmd(parts: CalendarYmd): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

/** Normaliza a YYYY-MM-DD desde string o Date local. */
export function toCalendarYmd(input: Date | string): string {
  if (typeof input === 'string') {
    const parts = parseCalendarParts(input);
    return parts ? formatYmd(parts) : '';
  }
  return formatYmd({
    year: input.getFullYear(),
    month: input.getMonth() + 1,
    day: input.getDate(),
  });
}

export function convertDateToISO(dateString: string): string {
  if (!dateString) return '';
  return toCalendarYmd(dateString) || dateString;
}

function fallbackCalendarText(dateString: string | Date): string {
  return typeof dateString === 'string' ? dateString : '';
}

export function formatCalendarDisplay(dateString: string | Date): string {
  const parts = parseCalendarParts(dateString);
  if (!parts) return fallbackCalendarText(dateString);
  return `${pad2(parts.day)}-${pad2(parts.month)}-${parts.year}`;
}

export function formatCalendarPeriod(dateString: string | Date): string {
  const parts = parseCalendarParts(dateString);
  if (!parts) return fallbackCalendarText(dateString);
  const month = MONTHS_ES[parts.month - 1].toUpperCase();
  return `${pad2(parts.day)} ${month} ${parts.year}`;
}

export function formatCalendarTooltip(dateString: string | Date): string {
  const parts = parseCalendarParts(dateString);
  if (!parts) return fallbackCalendarText(dateString);
  return `${pad2(parts.day)}-${MONTHS_ES[parts.month - 1]}-${parts.year}`;
}

export function compareCalendarDays(
  a: string | Date,
  b: string | Date
): number {
  const pa = parseCalendarParts(a);
  const pb = parseCalendarParts(b);
  if (!pa || !pb) return 0;
  return (
    pa.year * 10000 +
    pa.month * 100 +
    pa.day -
    (pb.year * 10000 + pb.month * 100 + pb.day)
  );
}

export function isCalendarDayBefore(
  date: string | Date,
  minDate: string | Date
): boolean {
  return compareCalendarDays(date, minDate) < 0;
}

export function isCalendarDayAfter(
  date: string | Date,
  maxDate: string | Date
): boolean {
  return compareCalendarDays(date, maxDate) > 0;
}

export function isCalendarDateDisabled(
  date: Date,
  minDate?: string,
  maxDate?: string
): boolean {
  const ymd = toCalendarYmd(date);
  if (minDate && isCalendarDayBefore(ymd, minDate)) return true;
  if (maxDate && isCalendarDayAfter(ymd, maxDate)) return true;
  return false;
}
