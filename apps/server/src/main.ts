import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { apiEnvSchema } from '@combat-planner/api';
import { serve } from '@hono/node-server';
import { createServerApp } from './app.ts';

const MIN_SECRET_LENGTH = 32;

const production = process.env.NODE_ENV === 'production';
const variable = (name: string): string | undefined => process.env[name] || undefined;
const problems: string[] = [];

const productionSecretProblem = (
  name: string,
  value: string | undefined,
  placeholder: string,
): string | undefined => {
  if (value === undefined) return `${name} is required when NODE_ENV=production`;
  if (value.length < MIN_SECRET_LENGTH)
    return `${name} must be at least ${MIN_SECRET_LENGTH} characters when NODE_ENV=production`;
  if (value === placeholder)
    return `${name} still holds the .env.example placeholder, which NODE_ENV=production rejects`;
  return undefined;
};

const secret = (name: string, placeholder: string): string => {
  const value = variable(name);
  if (production) {
    const problem = productionSecretProblem(name, value, placeholder);
    if (problem !== undefined) problems.push(`${problem}; generate one with openssl rand -hex 32`);
    return value ?? '';
  }
  if (value !== undefined) return value;
  console.warn(`${name} is not set; a random value is used for this run`);
  return randomBytes(32).toString('hex');
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

const port = Number(variable('PORT') ?? 3000);
const databasePath = path.resolve(variable('DATABASE_PATH') ?? 'data/combat-planner.db');
const betterAuthSecret = secret(
  'BETTER_AUTH_SECRET',
  'replace-with-a-random-string-of-at-least-32-characters',
);
const linkSecret = secret(
  'LINK_SECRET',
  'replace-with-another-random-string-of-at-least-32-characters',
);
const google = provider('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
const github = provider('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET');

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

const env = apiEnvSchema.parse({
  betterAuthSecret,
  betterAuthUrl: variable('BETTER_AUTH_URL') ?? `http://localhost:${port}`,
  linkSecret,
  trustedOrigins: list('BETTER_AUTH_TRUSTED_ORIGINS'),
  google,
  github,
});

mkdirSync(path.dirname(databasePath), { recursive: true });
const webDist = path.resolve(
  variable('STATIC_ROOT') ?? path.join(import.meta.dirname, '../../web/dist'),
);
const { app } = createServerApp({
  databasePath,
  staticRoot: path.relative(process.cwd(), webDist),
  env,
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`server listening on http://localhost:${info.port}, database ${databasePath}`);
});
