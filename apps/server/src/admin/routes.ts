import { readUsage, recentErrors, subscriptions } from '@combat-planner/api';
import type { AppDatabase } from '@combat-planner/api';
import { Hono } from 'hono';
import type { Checker } from './checks.ts';
import type { ServerProbes } from './server-stats.ts';
import { NODE_SERVER_PROBES, readServerRows } from './server-stats.ts';
import type { LiveCounts } from './page.ts';
import { renderAdminPage } from './page.ts';

export interface AdminAppOptions {
  db: AppDatabase;
  databasePath: string;
  checker: Checker;
  version: string;
  serverProbes?: ServerProbes;
  now?: () => Date;
  uptimeSeconds?: () => number;
}

const liveCounts = (): LiveCounts => {
  const viewers = subscriptions().map(({ subscriber }) => subscriber.viewer.kind);
  return {
    players: viewers.filter((kind) => kind === 'player').length,
    dmStreams: viewers.filter((kind) => kind === 'dm').length,
  };
};

export const createAdminApp = ({
  db,
  databasePath,
  checker,
  version,
  serverProbes = NODE_SERVER_PROBES,
  now = () => new Date(),
  uptimeSeconds = () => process.uptime(),
}: AdminAppOptions) =>
  new Hono().get('/', (c) => {
    const renderedAt = now();
    c.header('Cache-Control', 'no-store');
    c.header('X-Robots-Tag', 'noindex');
    return c.html(
      renderAdminPage({
        version,
        uptimeSeconds: uptimeSeconds(),
        renderedAt,
        server: readServerRows(databasePath, renderedAt, serverProbes),
        usage: readUsage(db, renderedAt),
        live: liveCounts(),
        checks: checker.rows(),
        errors: recentErrors(db),
      }),
    );
  });
