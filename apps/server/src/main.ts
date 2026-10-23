import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { apiEnvSchema } from '@combat-planner/api';
import { serve } from '@hono/node-server';
import { createServerApp } from './app.ts';
import { TEST_TIMERS, TEST_TIMERS_NOTICE, TEST_TIMERS_VARIABLE, sharingTimers } from './timers.ts';

const rootEnvFile = path.join(import.meta.dirname, '../../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const MIN_SECRET_LENGTH = 32;

const PLACEHOLDERS = {
  BETTER_AUTH_SECRET: 'replace-with-a-random-string-of-at-least-32-characters',
  LINK_SECRET: 'replace-with-another-random-string-of-at-least-32-characters',
} as const;

type SecretName = keyof typeof PLACEHOLDERS;
type StoredSecrets = Record<string, unknown>;

const SECRET_NAMES: readonly SecretName[] = ['BETTER_AUTH_SECRET', 'LINK_SECRET'];
const REGENERATION_COST = 'deleting it signs every user out and breaks every player link';

const variable = (name: string): string | undefined => process.env[name] || undefined;
const problems: string[] = [];
const uid = process.getuid?.() ?? 'unknown';

const exitOnProblems = (): void => {
  if (problems.length === 0) return;
  for (const problem of problems) console.error(problem);
  process.exit(1);
};

const errorCode = (error: unknown): string =>
  error instanceof Error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : 'unknown error';

const isRecord = (value: unknown): value is StoredSecrets =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSecret = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= MIN_SECRET_LENGTH;

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const port = Number(variable('PORT') ?? 3000);
const databasePath = path.resolve(variable('DATABASE_PATH') ?? 'data/combat-planner.db');
const dataDirectory = path.dirname(databasePath);
const secretsPath = path.join(dataDirectory, 'secrets.json');

try {
  mkdirSync(dataDirectory, { recursive: true });
} catch (error) {
  problems.push(`${dataDirectory} cannot be created by uid ${uid} (${errorCode(error)})`);
}
exitOnProblems();

const readSecrets = (): StoredSecrets | undefined => {
  let text: string;
  try {
    text = readFileSync(secretsPath, 'utf8');
  } catch (error) {
    const code = errorCode(error);
    if (code === 'ENOENT') return {};
    problems.push(`${secretsPath} cannot be read by uid ${uid} (${code}); ${REGENERATION_COST}`);
    return undefined;
  }
  const parsed = parseJson(text);
  if (
    isRecord(parsed) &&
    SECRET_NAMES.every((name) => parsed[name] === undefined || isSecret(parsed[name]))
  )
    return parsed;
  problems.push(
    `${secretsPath} read by uid ${uid} is not a JSON object of secrets of at least ${MIN_SECRET_LENGTH} characters; repair it, ${REGENERATION_COST}`,
  );
  return undefined;
};

const writeSecrets = (secrets: StoredSecrets): void => {
  const temporary = `${secretsPath}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(secrets, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    renameSync(temporary, secretsPath);
  } catch (error) {
    rmSync(temporary, { force: true });
    problems.push(`${secretsPath} cannot be written by uid ${uid} (${errorCode(error)})`);
  }
};

const stored = SECRET_NAMES.some((name) => variable(name) === undefined) ? readSecrets() : {};
const generated: SecretName[] = [];

const secret = (name: SecretName): string => {
  const value = variable(name);
  if (value !== undefined) {
    if (value.length < MIN_SECRET_LENGTH)
      problems.push(
        `${name} must be at least ${MIN_SECRET_LENGTH} characters; unset it to use a generated one`,
      );
    else if (value === PLACEHOLDERS[name])
      problems.push(
        `${name} still holds the old .env.example placeholder; unset it to use a generated one`,
      );
    return value;
  }
  if (stored === undefined) return '';
  const kept = stored[name];
  if (isSecret(kept)) return kept;
  const created = randomBytes(32).toString('hex');
  stored[name] = created;
  generated.push(name);
  return created;
};

const list = (name: string): string[] | undefined =>
  variable(name)
    ?.split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

const provider = (idName: string, secretName: string) => {
  const clientId = variable(idName);
  const clientSecret = variable(secretName);
  if (clientId === undefined && clientSecret === undefined) return undefined;
  if (clientId === undefined) {
    problems.push(`${idName} is required when ${secretName} is set; set both or neither`);
    return undefined;
  }
  if (clientSecret === undefined) {
    problems.push(`${secretName} is required when ${idName} is set; set both or neither`);
    return undefined;
  }
  return { clientId, clientSecret };
};

const betterAuthSecret = secret('BETTER_AUTH_SECRET');
const linkSecret = secret('LINK_SECRET');
const google = provider('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
const github = provider('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET');
exitOnProblems();

if (stored !== undefined && generated.length > 0) {
  writeSecrets(stored);
  exitOnProblems();
  console.log(`${generated.join(' and ')} generated and stored in ${secretsPath}`);
}

const env = apiEnvSchema.parse({
  betterAuthSecret,
  betterAuthUrl: variable('BETTER_AUTH_URL'),
  linkSecret,
  trustedOrigins: list('BETTER_AUTH_TRUSTED_ORIGINS'),
  google,
  github,
});

const webDist = path.resolve(
  variable('STATIC_ROOT') ?? path.join(import.meta.dirname, '../../web/dist'),
);
const timers = sharingTimers(variable(TEST_TIMERS_VARIABLE), variable('NODE_ENV'));
if (timers === TEST_TIMERS) console.log(TEST_TIMERS_NOTICE);

const { app, close } = createServerApp({
  databasePath,
  staticRoot: path.relative(process.cwd(), webDist),
  env,
  timers,
});

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`server listening on http://localhost:${info.port}, database ${databasePath}`);
});

const shutDown = (): void => {
  server.close();
  close();
  process.exit(0);
};
process.once('SIGTERM', shutDown);
process.once('SIGINT', shutDown);
