/**
 * In-memory rate limiter by identifier (e.g. IP).
 * Use for self-hosting; for Vercel multi-instance consider Upstash Redis.
 */

const windowMs = 15 * 60 * 1000; // 15 minutes
const maxRequests = 10; // per window per IP

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string): string {
  return `rl:${identifier}`;
}

export function checkRateLimit(identifier: string): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const key = getKey(identifier);
  let entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { ok: false, retryAfterMs: Math.ceil((entry.resetAt - now) / 1000) * 1000 };
  }
  return { ok: true };
}
