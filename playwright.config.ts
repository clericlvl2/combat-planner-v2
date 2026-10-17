import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

process.env.COMBAT_PLANNER_E2E_DIR ??= path.join(
  os.tmpdir(),
  `combat-planner-e2e-${Date.now().toString(36)}`,
);
const dataDir = process.env.COMBAT_PLANNER_E2E_DIR;

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
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [{ name: 'chromium' }],
  webServer: {
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
});
