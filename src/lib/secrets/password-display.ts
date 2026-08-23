import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import {
  getConfigUnlockPassword,
  readRequiredEnv,
} from '@/lib/secrets/env-secrets';

/** Default histórico de CONFIG_UNLOCK_PASSWORD (antes del fail-closed). */
const LEGACY_UNLOCK_DEFAULT = 'bitacora';

function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function getPasswordDisplaySecret(): string | null {
  return readRequiredEnv('PASSWORD_DISPLAY_SECRET') ?? getConfigUnlockPassword();
}

function encryptWithSecret(plain: string, secret: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', keyFromSecret(secret), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, enc]).toString('base64');
}

function decryptWithSecret(encrypted: string, secret: string): string | null {
  try {
    const buf = Buffer.from(encrypted, 'base64');
    if (buf.length < 17) return null;
    const iv = buf.subarray(0, 16);
    const data = buf.subarray(16);
    const decipher = createDecipheriv('aes-256-cbc', keyFromSecret(secret), iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      'utf8'
    );
  } catch {
    return null;
  }
}

/** Cifra la contraseña para mostrarla en el panel Admin (AES-256-CBC). */
export function encryptPasswordForDisplay(plain: string): string | null {
  const secret = getPasswordDisplaySecret();
  if (!secret || !plain) return null;
  return encryptWithSecret(plain, secret);
}

function candidateDecryptSecrets(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of [
    readRequiredEnv('PASSWORD_DISPLAY_SECRET'),
    getConfigUnlockPassword(),
    LEGACY_UNLOCK_DEFAULT,
  ]) {
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** Descifra la copia reversible; prueba secretos actuales y el default legado. */
export function decryptPasswordForDisplay(encrypted: string): string | null {
  if (!encrypted?.trim()) return null;
  for (const secret of candidateDecryptSecrets()) {
    const plain = decryptWithSecret(encrypted, secret);
    if (plain) return plain;
  }
  return null;
}
