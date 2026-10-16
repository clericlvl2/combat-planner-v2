import { describe, expect, it } from 'vite-plus/test';
import { fetchHealth } from './health.ts';

describe('fetchHealth', () => {
  it('parses the health payload', async () => {
    const fetchFn = async () => Response.json({ status: 'ok' });
    await expect(fetchHealth(fetchFn)).resolves.toEqual({ status: 'ok' });
  });

  it('rejects a failed response', async () => {
    const fetchFn = async () => new Response(null, { status: 503 });
    await expect(fetchHealth(fetchFn)).rejects.toThrow('GET /api/health answered 503');
  });
});
