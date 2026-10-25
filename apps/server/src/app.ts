import { createApiApp, createAuth, openDatabase, runMigrations } from '@combat-planner/api';
import type { ApiEnv } from '@combat-planner/api';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import type { CheckProbes } from './admin/checks.ts';
import { startChecker } from './admin/checks.ts';
import { createAdminApp } from './admin/routes.ts';
import { landingRoute } from './landing.ts';
import type { ServerProbes } from './admin/server-stats.ts';
import { startSweeper } from './sweeper.ts';
import type { SharingTimers } from './timers.ts';
import { PRODUCTION_TIMERS } from './timers.ts';

export interface AdminPageOptions {
  version: string;
  probes?: Partial<CheckProbes>;
  serverProbes?: ServerProbes;
  litestreamMetricsUrl?: string;
}

export interface ServerAppOptions {
  databasePath: string;
  staticRoot: string;
  env: ApiEnv;
  timers?: SharingTimers;
  admin?: AdminPageOptions;
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
  admin,
}: ServerAppOptions) {
  const opened = openDatabase(databasePath);
  runMigrations(opened.db);
  const auth = createAuth({ db: opened.db, env });
  let lastSweepAt: Date | undefined;
  const stopSweeper = startSweeper(opened.db, timers, (at) => {
    lastSweepAt = at;
  });
  const started =
    admin &&
    startChecker({
      db: opened.db,
      env,
      lastSweepAt: () => lastSweepAt,
      probes: admin.probes,
      litestreamMetricsUrl: admin.litestreamMetricsUrl,
    });
  const app = new Hono().use(securityHeaders);
  if (started) {
    const { checker } = started;
    app.get('/api/health/checks', (c) => {
      c.header('Cache-Control', 'no-store');
      return checker.rows().some((row) => row.status === 'problem')
        ? c.json({ status: 'problem' }, 503)
        : c.json({ status: 'ok' }, 200);
    });
  }
  app.route('/api', createApiApp({ db: opened.db, env, instance: auth }));
  if (admin && started) {
    app.route(
      '/admin',
      createAdminApp({
        db: opened.db,
        databasePath,
        checker: started.checker,
        version: admin.version,
        serverProbes: admin.serverProbes,
      }),
    );
  }
  app
    .all('/api/health/checks', (c) => c.notFound())
    .all('/admin', (c) => c.notFound())
    .all('/admin/*', (c) => c.notFound())
    .get('/', landingRoute({ auth, staticRoot }))
    .use('/*', serveStatic({ root: staticRoot }))
    .get('/*', serveStatic({ root: staticRoot, path: 'index.html' }));
  return {
    app,
    checker: started?.checker,
    close: () => {
      started?.stop();
      stopSweeper();
      opened.close();
    },
  };
}
