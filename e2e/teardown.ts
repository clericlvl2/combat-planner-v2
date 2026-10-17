import { rm } from 'node:fs/promises';

export default async function teardown(): Promise<void> {
  const dataDir = process.env.COMBAT_PLANNER_E2E_DIR;
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
}
