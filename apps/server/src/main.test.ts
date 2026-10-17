import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
const directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-main-'));
const staticRoot = path.join(directory, 'dist');
const LISTENING = /server listening on (http:\/\/localhost:\d+)/;
const HEX_SECRET = /^[0-9a-f]{64}$/;
const UID = `uid ${process.getuid?.()}`;

mkdirSync(staticRoot);
writeFileSync(path.join(staticRoot, 'index.html'), '<!doctype html><title>Combat Planner</title>');

const generated = () => randomBytes(32).toString('hex');
const SHORT_SECRET = 'short-secret-value-of-31-chars!';
const PLACEHOLDERS = {
  BETTER_AUTH_SECRET: 'replace-with-a-random-string-of-at-least-32-characters',
  LINK_SECRET: 'replace-with-another-random-string-of-at-least-32-characters',
};

let databases = 0;
const children = new Set<ChildProcess>();

const freshDatabase = (): string => {
  databases += 1;
  return path.join(directory, `server-${databases}`, 'combat-planner.db');
};

const secretsOf = (databasePath: string): string =>
  path.join(path.dirname(databasePath), 'secrets.json');

const spawnServer = (variables: Variables) => {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    PORT: '0',
    DATABASE_PATH: freshDatabase(),
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

const signUp = (url: string, origin: string, email: string): Promise<Response> =>
  fetch(`${url}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ name: 'Dungeon Master', email, password: 'correct horse battery' }),
  });

const cookieOf = (response: Response): string =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

const sessionEmail = async (url: string, cookie: string): Promise<string | undefined> => {
  const response = await fetch(`${url}/api/auth/get-session`, { headers: { cookie } });
  const body = (await response.json()) as { user: { email: string } } | null;
  return body?.user.email;
};

const storedSecrets = (secretsPath: string): Record<string, string> =>
  JSON.parse(readFileSync(secretsPath, 'utf8')) as Record<string, string>;

const outputOf = (result: Run): string => `${result.stdout}${result.stderr}`;

afterAll(() => {
  for (const child of children) child.kill('SIGKILL');
  rmSync(directory, { recursive: true, force: true });
});

describe('server start', { concurrent: true, timeout: 30_000 }, () => {
  it.for(
    ['production', 'development'].flatMap((mode): [string, string][] => [
      [mode, 'BETTER_AUTH_SECRET'],
      [mode, 'LINK_SECRET'],
    ]),
  )(
    'refuses %s when %s is shorter than 32 characters, naming the variable and not the value',
    async ([mode, name], { expect }) => {
      const databasePath = freshDatabase();
      const result = await run({
        NODE_ENV: mode,
        DATABASE_PATH: databasePath,
        [name]: SHORT_SECRET,
      });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(`${name} must be at least 32 characters`);
      expect(result.stderr).not.toContain(SHORT_SECRET);
      expect(result.stdout).not.toMatch(LISTENING);
      expect(existsSync(secretsOf(databasePath))).toBe(false);
    },
  );

  it.for(['production', 'development'])(
    'refuses %s with the old .env.example placeholders, naming both variables',
    async (mode, { expect }) => {
      const result = await run({ NODE_ENV: mode, ...PLACEHOLDERS });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('BETTER_AUTH_SECRET still holds the old .env.example');
      expect(result.stderr).toContain('LINK_SECRET still holds the old .env.example');
      for (const placeholder of Object.values(PLACEHOLDERS))
        expect(result.stderr).not.toContain(placeholder);
      expect(result.stdout).not.toMatch(LISTENING);
    },
  );

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

  const leaked = generated();
  it.for([
    [
      'truncated JSON',
      'not a JSON object',
      (file: string) => writeFileSync(file, `{"LINK_SECRET":"${leaked}"`),
    ],
    [
      'JSON with a secret shorter than 32 characters',
      'not a JSON object',
      (file: string) => writeFileSync(file, JSON.stringify({ BETTER_AUTH_SECRET: SHORT_SECRET })),
    ],
    ['a directory', 'cannot be read', (file: string) => mkdirSync(file)],
  ] as const)(
    'refuses production when secrets.json is %s, naming the path and the uid but no value',
    async ([, reason, prepare], { expect }) => {
      const databasePath = freshDatabase();
      const secretsPath = secretsOf(databasePath);
      mkdirSync(path.dirname(databasePath));
      prepare(secretsPath);
      const before = statSync(secretsPath).mtimeMs;
      const result = await run({ NODE_ENV: 'production', DATABASE_PATH: databasePath });
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(`${secretsPath} `);
      expect(result.stderr).toContain(reason);
      expect(result.stderr).toContain(UID);
      expect(result.stderr).not.toContain(leaked);
      expect(result.stderr).not.toContain(SHORT_SECRET);
      expect(result.stdout).not.toMatch(LISTENING);
      expect(statSync(secretsPath).mtimeMs).toBe(before);
    },
  );

  it('generates both secrets on the first production start and keeps the session after a restart', async ({
    expect,
  }) => {
    const databasePath = freshDatabase();
    const secretsPath = secretsOf(databasePath);
    const email = 'restart@example.com';
    const first = await start({ NODE_ENV: 'production', DATABASE_PATH: databasePath });
    let cookie = '';
    try {
      expect(statSync(secretsPath).mode & 0o777).toBe(0o600);
      expect(storedSecrets(secretsPath)).toEqual({
        BETTER_AUTH_SECRET: expect.stringMatching(HEX_SECRET),
        LINK_SECRET: expect.stringMatching(HEX_SECRET),
      });
      const signedUp = await signUp(first.url, first.url, email);
      expect(signedUp.status).toBe(200);
      cookie = cookieOf(signedUp);
    } finally {
      const result = await first.stop();
      expect(result.stdout).toContain(
        `BETTER_AUTH_SECRET and LINK_SECRET generated and stored in ${secretsPath}\n`,
      );
      for (const value of Object.values(storedSecrets(secretsPath)))
        expect(outputOf(result)).not.toContain(value);
    }
    const kept = readFileSync(secretsPath, 'utf8');
    const second = await start({ NODE_ENV: 'production', DATABASE_PATH: databasePath });
    try {
      expect(await sessionEmail(second.url, cookie)).toBe(email);
    } finally {
      const result = await second.stop();
      expect(result.stdout).not.toContain('generated');
    }
    expect(readFileSync(secretsPath, 'utf8')).toBe(kept);
  });

  it('prefers a secret from the environment over secrets.json and stores only the missing one', async ({
    expect,
  }) => {
    const databasePath = freshDatabase();
    const secretsPath = secretsOf(databasePath);
    const fileSecret = generated();
    const email = 'environment@example.com';
    mkdirSync(path.dirname(databasePath));
    writeFileSync(secretsPath, JSON.stringify({ BETTER_AUTH_SECRET: fileSecret }));
    const fromEnvironment = await start({
      NODE_ENV: 'production',
      DATABASE_PATH: databasePath,
      BETTER_AUTH_SECRET: generated(),
    });
    let cookie = '';
    try {
      const signedUp = await signUp(fromEnvironment.url, fromEnvironment.url, email);
      expect(signedUp.status).toBe(200);
      cookie = cookieOf(signedUp);
      expect(await sessionEmail(fromEnvironment.url, cookie)).toBe(email);
    } finally {
      const result = await fromEnvironment.stop();
      expect(result.stdout).toContain(`LINK_SECRET generated and stored in ${secretsPath}\n`);
      expect(result.stdout).not.toContain('BETTER_AUTH_SECRET generated');
    }
    expect(statSync(secretsPath).mode & 0o777).toBe(0o600);
    expect(storedSecrets(secretsPath)).toEqual({
      BETTER_AUTH_SECRET: fileSecret,
      LINK_SECRET: expect.stringMatching(HEX_SECRET),
    });
    const fromFile = await start({ NODE_ENV: 'production', DATABASE_PATH: databasePath });
    try {
      expect(await sessionEmail(fromFile.url, cookie)).toBeUndefined();
    } finally {
      await fromFile.stop();
    }
  });

  it('starts on secrets from the environment without reading or writing secrets.json', async ({
    expect,
  }) => {
    const databasePath = freshDatabase();
    const secretsPath = secretsOf(databasePath);
    mkdirSync(path.dirname(databasePath));
    writeFileSync(secretsPath, `{"LINK_SECRET":"${leaked}"`);
    const secrets = productionSecrets();
    const server = await start({ ...secrets, DATABASE_PATH: databasePath });
    try {
      const response = await fetch(`${server.url}/api/health`);
      expect(response.status).toBe(200);
    } finally {
      const result = await server.stop();
      expect(result.stdout).not.toContain('generated');
      expect(outputOf(result)).not.toContain(secrets.BETTER_AUTH_SECRET);
      expect(outputOf(result)).not.toContain(secrets.LINK_SECRET);
    }
    expect(readFileSync(secretsPath, 'utf8')).toBe(`{"LINK_SECRET":"${leaked}"`);
  });

  it('admits sign-up from the request origin and rejects another origin without BETTER_AUTH_URL', async ({
    expect,
  }) => {
    const server = await start({ NODE_ENV: 'development' });
    try {
      const foreign = await signUp(server.url, 'http://evil.example', 'foreign@example.com');
      expect(foreign.status).toBe(403);
      const own = await signUp(server.url, server.url, 'own@example.com');
      expect(own.status).toBe(200);
      expect(await sessionEmail(server.url, cookieOf(own))).toBe('own@example.com');
    } finally {
      await server.stop();
    }
  });
});
