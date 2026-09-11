import { AsyncLocalStorage } from 'node:async_hooks';

const publicTokenAls = new AsyncLocalStorage<string>();

export function runWithPublicLinkToken<T>(
  token: string,
  fn: () => Promise<T>
): Promise<T> {
  return publicTokenAls.run(token, fn);
}

export function getPublicLinkTokenOverride(): string | undefined {
  return publicTokenAls.getStore();
}
