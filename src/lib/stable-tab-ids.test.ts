import { describe, expect, it } from 'vitest';
import { stableTabA11yIds } from '@/lib/stable-tab-ids';

describe('stableTabA11yIds', () => {
  it('arma ids deterministas para trigger y panel', () => {
    expect(stableTabA11yIds('validacion-catalogos', 'sede')).toEqual({
      triggerId: 'validacion-catalogos-trigger-sede',
      contentId: 'validacion-catalogos-content-sede',
    });
  });
});
