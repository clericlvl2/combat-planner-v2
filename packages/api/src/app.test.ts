import { healthSchema } from '@combat-planner/domain';
import { afterAll, describe, expect, it } from 'vite-plus/test';
import { createApiApp } from './app.ts';
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
});
