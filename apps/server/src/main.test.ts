import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { afterAll, describe, it } from 'vite-plus/test';

interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface Started {
  url: string;
  stop: () => Promise<Run>;
}

type Variables = Record<string, string | undefined>;

const mainPath = path.join(import.meta.dirname, 'main.ts');
const envExample = parseEnv(
  readFileSync(path.join(import.meta.dirname, '../../../.env.example'), 'utf8'),
);
const directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-main-'));
const staticRoot = path.join(directory, 'dist');
const LISTENING = /server listening on (http:\/\/localhost:\d+)/;

mkdirSync(staticRoot);
writeFileSync(path.join(staticRoot, 'index.html'), '<!doctype html><title>Combat Planner</title>');

const generated = () => randomBytes(32).toString('hex');
const SHORT_SECRET = 'short-secret-value-of-31-chars!';

let databases = 0;
const children = new Set<ChildProcess>();

const spawnServer = (variables: Variables) => {
  databases += 1;
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    PORT: '0',
    DATABASE_PATH: path.join(directory, `server-${databases}.db`),
    STATIC_ROOT: staticRoot,
  };
  for (const [name, value] of Object.entries(variables)) {
    if (value === undefined) delete env[name];
    else env[name] = value;
  }
  const child = spawn(process.execPath, [mainPath], { env });
  children.add(child);
  const output = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
    output.stdout += chunk;
  });
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
    output.stderr += chunk;
  });
  const exited = new Promise<Run>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => {
      children.delete(child);
      resolve({ code, ...output });
    });
  });
  return { child, output, exited };
};

const run = (variables: Variables): Promise<Run> => {
  const { child, output, exited } = spawnServer(variables);
  child.stdout.on('data', () => {
    if (LISTENING.test(output.stdout)) child.kill('SIGTERM');
  });
  return exited;
};

const start = (variables: Variables): Promise<Started> => {
  const { child, output, exited } = spawnServer(variables);
  return new Promise<Started>((resolve, reject) => {
    const stop = () => {
      child.kill('SIGTERM');
      return exited;
    };
    child.stdout.on('data', () => {
      const url = LISTENING.exec(output.stdout)?.[1];
      if (url !== undefined) resolve({ url, stop });
    });
    void exited.then(
      (result) => reject(new Error(`server exited with ${result.code}: ${result.stderr}`)),
      reject,
    );
  });
};

const productionSecrets = (): Variables => ({
  NODE_ENV: 'production',
  BETTER_AUTH_SECRET: generated(),
  LINK_SECRET: generated(),
});

afterAll(() => {
  for (const child of children) child.kill('SIGKILL');
  rmSync(directory, { recursive: true, force: true });
});

describe('server start', { concurrent: true, timeout: 30_000 }, () => {
  it.for([
    ['BETTER_AUTH_SECRET', 'missing', undefined, 'is required'],
    ['LINK_SECRET', 'missing', undefined, 'is required'],
    ['BETTER_AUTH_SECRET', 'shorter than 32 characters', SHORT_SECRET, 'must be at least 32'],
    ['LINK_SECRET', 'shorter than 32 characters', SHORT_SECRET, 'must be at least 32'],
  ] as const)(
    'refuses production when %s is %s, naming the variable and not the value',
    async ([name, , value, reason], { expect }) => {
      const result = await run({ ...productionSecrets(), [name]: value });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(`${name} ${reason}`);
      expect(result.stderr).not.toContain(SHORT_SECRET);
      expect(result.stdout).not.toMatch(LISTENING);
    },
  );

  it('refuses production with the .env.example secrets, naming both variables', async ({
    expect,
  }) => {
    const placeholders = [envExample.BETTER_AUTH_SECRET, envExample.LINK_SECRET];
    for (const placeholder of placeholders) expect(placeholder?.length).toBeGreaterThanOrEqual(32);
    const result = await run({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: envExample.BETTER_AUTH_SECRET,
      LINK_SECRET: envExample.LINK_SECRET,
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('BETTER_AUTH_SECRET still holds the .env.example placeholder');
    expect(result.stderr).toContain('LINK_SECRET still holds the .env.example placeholder');
    for (const placeholder of placeholders) expect(result.stderr).not.toContain(placeholder);
    expect(result.stdout).not.toMatch(LISTENING);
  });

  it.for(
    ['production', 'development'].flatMap((mode): [string, string, string][] => [
      [mode, 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      [mode, 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_ID'],
      [mode, 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
      [mode, 'GITHUB_CLIENT_SECRET', 'GITHUB_CLIENT_ID'],
    ]),
  )('refuses %s with only %s set, naming %s', async ([mode, present, missing], { expect }) => {
    const value = `oauth-${generated()}`;
    const result = await run({
      ...productionSecrets(),
      NODE_ENV: mode,
      [present]: value,
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(`${missing} is required when ${present} is set`);
    expect(result.stderr).not.toContain(value);
    expect(result.stdout).not.toMatch(LISTENING);
  });

  it('starts in production with generated secrets and answers /api/health', async ({ expect }) => {
    const server = await start(productionSecrets());
    try {
      const response = await fetch(`${server.url}/api/health`);
      expect(response.status).toBe(200);
    } finally {
      const result = await server.stop();
      expect(result.stderr).toBe('');
    }
  });

  it('starts in development without secrets on random values', async ({ expect }) => {
    const server = await start({ NODE_ENV: 'development' });
    try {
      const response = await fetch(`${server.url}/api/health`);
      expect(response.status).toBe(200);
    } finally {
      const result = await server.stop();
      expect(result.stderr).toContain('BETTER_AUTH_SECRET is not set; a random value is used');
      expect(result.stderr).toContain('LINK_SECRET is not set; a random value is used');
    }
  });
});
