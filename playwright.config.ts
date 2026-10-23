import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { CREATED_DIR } from './e2e/teardown.ts';

const PORT = Number(process.env.E2E_PORT) || 3000;
const baseURL = `http://localhost:${PORT}`;
const SHARING_PORT = PORT + 1;
const sharingURL = `http://localhost:${SHARING_PORT}`;
const SHARING_SPEC = /sharing\.spec\.ts$/;

const createDataDir = (): string => {
  const dir = path.join(os.tmpdir(), `combat-planner-e2e-${Date.now().toString(36)}`);
  process.env.COMBAT_PLANNER_E2E_DIR = dir;
  const e2eGlobal: typeof globalThis & { [CREATED_DIR]?: string } = globalThis;
  e2eGlobal[CREATED_DIR] = dir;
  return dir;
};

const dataDir = process.env.COMBAT_PLANNER_E2E_DIR || createDataDir();

export default defineConfig({
  testDir: 'e2e',
  globalTeardown: './e2e/teardown.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 320, height: 568 },
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'chromium', testIgnore: SHARING_SPEC },
    { name: 'sharing', testMatch: SHARING_SPEC, use: { baseURL: sharingURL } },
  ],
  webServer: [
    {
      command: 'pnpm build && node apps/server/src/main.ts',
      url: `${baseURL}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      env: {
        PORT: String(PORT),
        DATABASE_PATH: path.join(dataDir, 'e2e.db'),
        STATIC_ROOT: path.resolve('apps/web/dist'),
        BETTER_AUTH_URL: baseURL,
      },
    },
    {
      command: 'node apps/server/src/main.ts',
      url: `${sharingURL}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
      env: {
        PORT: String(SHARING_PORT),
        DATABASE_PATH: path.join(dataDir, 'sharing', 'e2e.db'),
        STATIC_ROOT: path.resolve('apps/web/dist'),
        BETTER_AUTH_URL: sharingURL,
        COMBAT_PLANNER_TEST_TIMERS: '1',
      },
    },
  ],
});
