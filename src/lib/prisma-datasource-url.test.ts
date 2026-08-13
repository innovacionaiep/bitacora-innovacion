import { describe, it, expect } from 'vitest';
import {
  getDatasourceUrl,
  PROD_PRISMA_CONNECTION_LIMIT,
} from '@/lib/prisma-datasource-url';

describe('getDatasourceUrl', () => {
  it('returns undefined when DATABASE_URL is missing', () => {
    expect(getDatasourceUrl(undefined, 'production')).toBeUndefined();
  });

  it('adds pgbouncer and connection_limit=3 in production when unset', () => {
    const url = getDatasourceUrl(
      'postgresql://user:pass@host:5432/db',
      'production'
    );
    expect(url).toContain('pgbouncer=true');
    expect(url).toContain(`connection_limit=${PROD_PRISMA_CONNECTION_LIMIT}`);
    expect(PROD_PRISMA_CONNECTION_LIMIT).toBe('3');
  });

  it('does not override an existing connection_limit', () => {
    const url = getDatasourceUrl(
      'postgresql://user:pass@host:5432/db?connection_limit=1',
      'production'
    );
    expect(url).toContain('connection_limit=1');
    expect(url).not.toContain('connection_limit=3');
  });

  it('does not set connection_limit outside production', () => {
    const url = getDatasourceUrl(
      'postgresql://user:pass@host:5432/db',
      'development'
    );
    expect(url).toContain('pgbouncer=true');
    expect(url).not.toContain('connection_limit');
  });
});
