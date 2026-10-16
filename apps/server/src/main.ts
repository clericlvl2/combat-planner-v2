import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { apiEnvSchema } from '@combat-planner/api';
import { serve } from '@hono/node-server';
import { createServerApp } from './app.ts';

const production = process.env.NODE_ENV === 'production';
const variable = (name: string): string | undefined => process.env[name] || undefined;

const secret = (name: string): string => {
  const value = variable(name);
  if (value !== undefined) return value;
  if (production) throw new Error(`${name} is required when NODE_ENV=production`);
  console.warn(`${name} is not set; a random value is used for this run`);
  return randomBytes(32).toString('hex');
};

const provider = (idName: string, secretName: string) => {
  const clientId = variable(idName);
  const clientSecret = variable(secretName);
  if (clientId === undefined && clientSecret === undefined) return undefined;
  return { clientId, clientSecret };
};

const port = Number(variable('PORT') ?? 3000);
const databasePath = path.resolve(variable('DATABASE_PATH') ?? 'data/combat-planner.db');
const env = apiEnvSchema.parse({
  betterAuthSecret: secret('BETTER_AUTH_SECRET'),
  betterAuthUrl: variable('BETTER_AUTH_URL') ?? `http://localhost:${port}`,
  linkSecret: secret('LINK_SECRET'),
  google: provider('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'),
  github: provider('GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'),
});

mkdirSync(path.dirname(databasePath), { recursive: true });
const webDist = path.resolve(import.meta.dirname, '../../web/dist');
const { app } = createServerApp({
  databasePath,
  staticRoot: path.relative(process.cwd(), webDist),
  env,
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`server listening on http://localhost:${info.port}, database ${databasePath}`);
});
