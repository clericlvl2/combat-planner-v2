import { rm } from 'node:fs/promises';

const CREATED_DIR: unique symbol = Symbol.for('combat-planner.e2e.created-dir');

type E2eGlobal = typeof globalThis & { [CREATED_DIR]?: string };

export default async function teardown(): Promise<void> {
  const e2eGlobal: E2eGlobal = globalThis;
  const createdDir = e2eGlobal[CREATED_DIR];
  if (createdDir === undefined) return;
  delete e2eGlobal[CREATED_DIR];
  await rm(createdDir, { recursive: true, force: true });
}
