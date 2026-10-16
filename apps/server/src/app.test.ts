import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { createServerApp } from './app.ts';

const staticDir = mkdtempSync(path.join(tmpdir(), 'combat-planner-static-'));
writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>Combat Planner</title>');
const app = createServerApp({
  staticRoot: path.relative(process.cwd(), staticDir),
  tickIntervalMs: 5,
});

describe('server app', () => {
  it('mounts the api under /api', async () => {
    const response = await app.request('/api/health');
    expect(response.status).toBe(200);
  });

  it('serves index.html for client routes', async () => {
    const response = await app.request('/combats/01J');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>Combat Planner</title>');
  });
});
