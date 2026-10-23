import { healthSchema } from '@combat-planner/domain';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import { BODY_LIMIT_BYTES, createApiApp } from './app.ts';
import { openDatabase } from './db/index.ts';
import type { ApiEnv } from './env.ts';

const env: ApiEnv = {
  betterAuthSecret: 'test-secret',
  betterAuthUrl: 'http://localhost:3000',
  linkSecret: 'test-link-secret',
};
const opened = openDatabase(':memory:');
const app = createApiApp({ db: opened.db, env });

afterAll(() => {
  opened.close();
});

describe('api app', () => {
  it('answers /health with an ok status', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);
    expect(healthSchema.parse(await response.json())).toEqual({ status: 'ok' });
  });

  it('answers an unknown route with 404', async () => {
    const response = await app.request('/events');
    expect(response.status).toBe(404);
  });

  it('refuses a body over 64 KB with 413 and the error shape', async () => {
    const response = await app.request('/presets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(BODY_LIMIT_BYTES) }),
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ code: 'limit', message: 'Request body exceeds 64 KB' });
  });
});
