export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Fixed-window KV guard. Missing KV keeps local development available. */
export async function checkStoreRateLimit(
  kv: KVNamespace | undefined,
  scope: string,
  key: string,
  maxCalls: number,
  windowSeconds = 600,
): Promise<RateLimitResult> {
  if (!kv) return { allowed: true, retryAfterSeconds: 0 };
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSeconds);
  const storageKey = `storefront:${scope}:${key}:${window}`;
  const current = Number(await kv.get(storageKey)) || 0;
  if (current >= maxCalls) {
    return { allowed: false, retryAfterSeconds: windowSeconds - (now % windowSeconds) };
  }
  await kv.put(storageKey, String(current + 1), { expirationTtl: windowSeconds * 2 });
  return { allowed: true, retryAfterSeconds: 0 };
}
