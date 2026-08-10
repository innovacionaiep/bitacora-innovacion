import { describe, it, expect, vi } from 'vitest';
import { runOptimisticMutation } from '@/lib/ui/optimistic-mutation';

describe('runOptimisticMutation', () => {
  it('applies optimistically and commits on success', async () => {
    const state = { value: 'old' };
    const apply = vi.fn(() => {
      const prev = state.value;
      state.value = 'new';
      return prev;
    });
    const rollback = vi.fn((prev: string | void) => {
      if (typeof prev === 'string') state.value = prev;
    });
    const commit = vi.fn((data: { value: string }) => {
      state.value = data.value;
    });

    const result = await runOptimisticMutation({
      apply,
      mutate: async () => ({ success: true, data: { value: 'server' } }),
      rollback,
      commit,
    });

    expect(result.ok).toBe(true);
    expect(apply).toHaveBeenCalledOnce();
    expect(rollback).not.toHaveBeenCalled();
    expect(commit).toHaveBeenCalledWith({ value: 'server' });
    expect(state.value).toBe('server');
  });

  it('rolls back when mutate returns success: false', async () => {
    const state = { value: 'old' };
    const result = await runOptimisticMutation({
      apply: () => {
        const prev = state.value;
        state.value = 'new';
        return prev;
      },
      mutate: async () => ({ success: false, error: 'fail' }),
      rollback: (prev) => {
        if (typeof prev === 'string') state.value = prev;
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('fail');
    expect(state.value).toBe('old');
  });

  it('rolls back when mutate throws', async () => {
    const state = { value: 'old' };
    const result = await runOptimisticMutation({
      apply: () => {
        const prev = state.value;
        state.value = 'new';
        return prev;
      },
      mutate: async () => {
        throw new Error('boom');
      },
      rollback: (prev) => {
        if (typeof prev === 'string') state.value = prev;
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('boom');
    expect(state.value).toBe('old');
  });
});
