export const ASIGNATURAS_PAGE_SIZE = 50;

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  rows: T[];
  currentPage: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = items.slice(start, start + pageSize);
  return {
    rows,
    currentPage,
    totalPages,
    total,
    from: rows.length === 0 ? 0 : start + 1,
    to: start + rows.length,
  };
}
