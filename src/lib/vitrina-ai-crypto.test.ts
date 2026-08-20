import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from '@/lib/vitrina-ai-crypto';

describe('encryptSecret / decryptSecret', () => {
  it('recupera el texto con el mismo secret', () => {
    const payload = encryptSecret('sk-or-v1-secret-key', 'nexauth-secret-a');
    expect(payload).not.toContain('sk-or-v1-secret-key');
    expect(decryptSecret(payload, 'nexauth-secret-a')).toBe('sk-or-v1-secret-key');
  });

  it('falla con un secret distinto', () => {
    const payload = encryptSecret('sk-or-v1-secret-key', 'nexauth-secret-a');
    expect(decryptSecret(payload, 'nexauth-secret-b')).toBeNull();
  });

  it('falla con un payload inválido', () => {
    expect(decryptSecret('no-es-base64!!!', 'nexauth-secret-a')).toBeNull();
    expect(decryptSecret('', 'nexauth-secret-a')).toBeNull();
  });
});
