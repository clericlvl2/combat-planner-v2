import type { Context, MiddlewareHandler } from 'hono';

export const RATE_LIMIT_WINDOW_MS = 60_000;

export const RATE_LIMIT_BUDGETS = {
  actions: 120,
  events: 30,
  general: 300,
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMIT_BUDGETS;

export const TOO_MANY_REQUESTS = { code: 'limit', message: 'Too many requests' } as const;

const ACTIONS_PATH = /^\/combats\/[^/]+\/actions$/;
const WILDCARD = '/*';

export const bucketOf = (path: string): RateLimitBucket | null => {
  if (path === '/health') return null;
  if (path.endsWith('/events')) return 'events';
  if (path.startsWith('/play/') || ACTIONS_PATH.test(path)) return 'actions';
  return 'general';
};

interface SocketBindings {
  incoming?: { socket?: { remoteAddress?: string } };
}

const socketAddressOf = (bindings: unknown): string | undefined =>
  typeof bindings === 'object' && bindings !== null
    ? (bindings as SocketBindings).incoming?.socket?.remoteAddress
    : undefined;

export const clientIpOf = (forwardedFor: string | undefined, socketAddress: string | undefined) => {
  const forwarded = forwardedFor?.trim();
  if (forwarded && !forwarded.includes(',')) return forwarded;
  return socketAddress ?? 'unknown';
};

const relativePath = (c: Context): string => {
  const mounted = c.req.routePath.endsWith(WILDCARD)
    ? c.req.routePath.slice(0, -WILDCARD.length)
    : '';
  return c.req.path.slice(mounted.length) || '/';
};

export interface RateLimiterOptions {
  now?: () => number;
}

export function createRateLimiter({ now = Date.now }: RateLimiterOptions = {}): MiddlewareHandler {
  let windowStart = 0;
  let counters = new Map<string, number>();

  return async (c, next) => {
    const bucket = bucketOf(relativePath(c));
    if (bucket === null) return next();
    const time = now();
    if (time - windowStart >= RATE_LIMIT_WINDOW_MS) {
      windowStart = time - (time % RATE_LIMIT_WINDOW_MS);
      counters = new Map();
    }
    const ip = clientIpOf(c.req.header('x-forwarded-for'), socketAddressOf(c.env));
    const key = `${bucket}|${ip}`;
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    if (count <= RATE_LIMIT_BUDGETS[bucket]) return next();
    const retryAfter = Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - time) / 1000);
    c.header('Retry-After', String(retryAfter));
    return c.json(TOO_MANY_REQUESTS, 429);
  };
}
