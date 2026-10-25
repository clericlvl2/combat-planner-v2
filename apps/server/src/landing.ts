import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SessionResolver } from '@combat-planner/api';
import type { Context } from 'hono';

export const GUEST_BOOT_ATTRIBUTE = 'data-boot="guest"';

export const markGuest = (html: string): string =>
  html.replace(/<html\b/i, `<html ${GUEST_BOOT_ATTRIBUTE}`);

export interface LandingRouteOptions {
  auth: SessionResolver;
  staticRoot: string;
}

export function landingRoute({ auth, staticRoot }: LandingRouteOptions) {
  let page: Promise<string> | undefined;
  const guestPage = (): Promise<string> => {
    if (page) return page;
    const reading = readFile(path.resolve(staticRoot, 'index.html'), 'utf8').then(markGuest);
    reading.catch(() => {
      page = undefined;
    });
    page = reading;
    return reading;
  };
  return async (c: Context) => {
    c.header('Cache-Control', 'no-store');
    c.header('Vary', 'Cookie');
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    if (session) return c.redirect('/combats', 302);
    c.header('Content-Type', 'text/html; charset=UTF-8');
    return c.body(await guestPage());
  };
}
