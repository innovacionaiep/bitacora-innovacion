/** Utilidades de fechas compartidas del Gantt */

export function convertDateToISO(dateString: string): string {
  if (!dateString) return '';

  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (isoPattern.test(dateString)) return dateString;

  const slashParts = dateString.split('/');
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const dashParts = dateString.split('-');
  if (dashParts.length === 3) {
    const [day, month, year] = dashParts;
    if (day.length <= 2 && month.length <= 2 && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return dateString;
}

export function formatDateForTooltip(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date
    .toLocaleDateString('es-ES', { month: 'long' })
    .toLowerCase();
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
