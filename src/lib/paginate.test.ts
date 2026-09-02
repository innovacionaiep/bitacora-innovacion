import { describe, expect, it } from 'vitest';
import { paginateItems } from '@/lib/paginate';

describe('paginateItems', () => {
  const items = Array.from({ length: 120 }, (_, i) => i + 1);

  it('returns the first page of 50', () => {
    const result = paginateItems(items, 1, 50);
    expect(result.rows).toHaveLength(50);
    expect(result.rows[0]).toBe(1);
    expect(result.rows[49]).toBe(50);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(120);
    expect(result.from).toBe(1);
    expect(result.to).toBe(50);
  });

  it('returns the last partial page', () => {
    const result = paginateItems(items, 3, 50);
    expect(result.rows).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120]);
    expect(result.from).toBe(101);
    expect(result.to).toBe(120);
  });

  it('clamps page past the end down to last page', () => {
    const result = paginateItems(items, 99, 50);
    expect(result.currentPage).toBe(3);
    expect(result.rows[0]).toBe(101);
  });

  it('handles an empty list', () => {
    const result = paginateItems([], 1, 50);
    expect(result.rows).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.from).toBe(0);
    expect(result.to).toBe(0);
  });
});
