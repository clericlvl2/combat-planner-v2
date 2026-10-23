import { Hono } from 'hono';
import { describe, expect, it } from 'vite-plus/test';
import {
  RATE_LIMIT_BUDGETS,
  RATE_LIMIT_WINDOW_MS,
  bucketOf,
  clientIpOf,
  createRateLimiter,
  rateLimitKeyOf,
} from '../src/rate-limit.ts';

const START = 1_800_000_000_000;

const limitedServer = () => {
  const clock = { now: START };
  const api = new Hono()
    .use(createRateLimiter({ now: () => clock.now }))
    .all('/*', (c) => c.text('ok'));
  const server = new Hono().route('/api', api);
  const hit = (path: string, ip = '198.51.100.1') =>
    server.request(`/api${path}`, { headers: { 'x-forwarded-for': ip } });
  const burst = async (path: string, count: number, ip?: string) => {
    for (let index = 0; index < count; index += 1) {
      expect((await hit(path, ip)).status).toBe(200);
    }
  };
  return { clock, hit, burst };
};

describe('bucketOf', () => {
  it.each([
    ['/health', null],
    ['/combats/01J/events', 'events'],
    ['/play/token/events', 'events'],
    ['/play/token', 'actions'],
    ['/play/token/claim', 'actions'],
    ['/combats/01J/actions', 'actions'],
    ['/combats/01J', 'general'],
    ['/auth/sign-in/email', 'general'],
    ['/presets', 'general'],
  ] as const)('puts %s into %s', (path, bucket) => {
    expect(bucketOf(path)).toBe(bucket);
  });
});

describe('rateLimitKeyOf', () => {
  it.each([
    ['events', '/combats/01J/events', 'events|10.0.0.1|01J'],
    ['events', '/play/01K/events', 'events|10.0.0.1|01K'],
    ['actions', '/combats/01J/actions', 'actions|10.0.0.1|01J'],
    ['actions', '/play/01K', 'actions|10.0.0.1|01K'],
    ['general', '/combats/01J', 'general|10.0.0.1'],
    ['events', '/other/events', 'events|10.0.0.1'],
  ] as const)('keys %s %s as %s', (bucket, path, key) => {
    expect(rateLimitKeyOf(bucket, path, '10.0.0.1')).toBe(key);
  });
});

describe('clientIpOf', () => {
  it('reads the single X-Forwarded-For address before the socket address', () => {
    expect(clientIpOf(' 203.0.113.5 ', '10.0.0.2')).toBe('203.0.113.5');
  });

  it('falls back to the socket address without a single forwarded address', () => {
    expect(clientIpOf(undefined, '10.0.0.2')).toBe('10.0.0.2');
    expect(clientIpOf('203.0.113.5, 10.0.0.1', '10.0.0.2')).toBe('10.0.0.2');
  });
});

describe('rate limiter', () => {
  it('refuses the request over the general budget with 429, Retry-After and the error shape', async () => {
    const { clock, hit, burst } = limitedServer();
    clock.now = START + 15_000;
    await burst('/presets', RATE_LIMIT_BUDGETS.general);
    const refused = await hit('/presets');
    expect(refused.status).toBe(429);
    expect(refused.headers.get('retry-after')).toBe(
      String((RATE_LIMIT_WINDOW_MS - ((START + 15_000) % RATE_LIMIT_WINDOW_MS)) / 1000),
    );
    expect(await refused.json()).toEqual({ code: 'rateLimited', message: 'Too many requests' });
  });

  it('counts each client IP separately', async () => {
    const { hit, burst } = limitedServer();
    await burst('/presets', RATE_LIMIT_BUDGETS.general);
    expect((await hit('/presets')).status).toBe(429);
    expect((await hit('/presets', '198.51.100.2')).status).toBe(200);
  });

  it('gives play and combat actions of one combat a shared budget of 120', async () => {
    const { hit, burst } = limitedServer();
    await burst('/play/01J', 60);
    await burst('/combats/01J/actions', RATE_LIMIT_BUDGETS.actions - 60);
    expect((await hit('/combats/01J/actions')).status).toBe(429);
    expect((await hit('/play/01J')).status).toBe(429);
    expect((await hit('/presets')).status).toBe(200);
  });

  it('gives two combats from one IP separate action budgets', async () => {
    const { hit, burst } = limitedServer();
    await burst('/play/01J/actions', RATE_LIMIT_BUDGETS.actions);
    expect((await hit('/play/01J/actions')).status).toBe(429);
    expect((await hit('/play/01K/actions')).status).toBe(200);
  });

  it('limits SSE connects to 60 per combat outside the general budget and never limits health', async () => {
    const { hit, burst } = limitedServer();
    await burst('/presets', RATE_LIMIT_BUDGETS.general);
    await burst('/combats/01J/events', 20);
    await burst('/play/01J/events', RATE_LIMIT_BUDGETS.events - 20);
    expect((await hit('/combats/01J/events')).status).toBe(429);
    expect((await hit('/play/01K/events')).status).toBe(200);
    await burst('/health', RATE_LIMIT_BUDGETS.general + 10);
  });

  it('opens a fresh budget in the next minute', async () => {
    const { clock, hit, burst } = limitedServer();
    await burst('/presets', RATE_LIMIT_BUDGETS.general);
    expect((await hit('/presets')).status).toBe(429);
    clock.now = START + RATE_LIMIT_WINDOW_MS;
    expect((await hit('/presets')).status).toBe(200);
  });
});
