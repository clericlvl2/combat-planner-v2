import { createApiApp, openDatabase, runMigrations } from '@combat-planner/api';
import type { ApiEnv } from '@combat-planner/api';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { startSweeper } from './sweeper.ts';
import type { SharingTimers } from './timers.ts';
import { PRODUCTION_TIMERS } from './timers.ts';

export interface ServerAppOptions {
  databasePath: string;
  staticRoot: string;
  env: ApiEnv;
  timers?: SharingTimers;
}

const SELF = "'self'";

const securityHeaders = secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'no-referrer',
  xFrameOptions: 'DENY',
  contentSecurityPolicy: {
    defaultSrc: [SELF],
    scriptSrc: [SELF],
    styleSrc: [SELF, "'unsafe-inline'"],
    fontSrc: [SELF, 'data:'],
    imgSrc: [SELF, 'data:'],
    connectSrc: [SELF],
    frameAncestors: ["'none'"],
    baseUri: [SELF],
    formAction: [SELF],
    objectSrc: ["'none'"],
  },
});

export function createServerApp({
  databasePath,
  staticRoot,
  env,
  timers = PRODUCTION_TIMERS,
}: ServerAppOptions) {
  const opened = openDatabase(databasePath);
  runMigrations(opened.db);
  const stopSweeper = startSweeper(opened.db, timers);
  const app = new Hono()
    .use(securityHeaders)
    .route('/api', createApiApp({ db: opened.db, env }))
    .use('/*', serveStatic({ root: staticRoot }))
    .get('/*', serveStatic({ root: staticRoot, path: 'index.html' }));
  return {
    app,
    close: () => {
      stopSweeper();
      opened.close();
    },
  };
}
