import tls from 'node:tls';
import { countErrorsSince, lastSessionCreatedAt } from '@combat-planner/api';
import type { ApiEnv, AppDatabase } from '@combat-planner/api';
import type { StatusRow } from './format.ts';
import { calendarDate, clockTime, dateTime, errorText } from './format.ts';

export const CHECK_INTERVAL_MS = 60_000;
export const QUICK_CHECK_INTERVAL_MS = 10 * 60_000;
export const LITESTREAM_METRICS_URL = 'http://litestream:9090/metrics';
const REQUEST_TIMEOUT_MS = 5_000;
const MIN_CERTIFICATE_DAYS = 14;
const MAX_SYNC_AGE_MS = 5 * 60_000;
const MAX_SWEEP_AGE_MS = 3 * 60_000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
export const SERVER_ERRORS_ALERT = 1;
export const CLIENT_ERRORS_ALERT = 10;
const NO_HOST = 'BETTER_AUTH_URL не задан';

export interface CheckProbes {
  fetch(url: string, init: RequestInit): Promise<Response>;
  certificateExpiry(host: string): Promise<Date>;
}

export interface CheckerOptions {
  db: AppDatabase;
  env: ApiEnv;
  lastSweepAt: () => Date | undefined;
  probes?: Partial<CheckProbes>;
  now?: () => Date;
  litestreamMetricsUrl?: string;
}

export interface Checker {
  rows(): StatusRow[];
  run(): Promise<void>;
}

export const certificateExpiry = (host: string): Promise<Date> =>
  new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, timeout: REQUEST_TIMEOUT_MS },
      () => {
        const validTo = socket.getPeerCertificate().valid_to;
        socket.end();
        if (validTo) resolve(new Date(validTo));
        else reject(new Error('сервер не прислал сертификат'));
      },
    );
    socket.once('timeout', () => socket.destroy(new Error('нет ответа за 5 с')));
    socket.once('error', reject);
  });

const NODE_PROBES: CheckProbes = {
  fetch: (url, init) => fetch(url, init),
  certificateExpiry,
};

const metricSum = (text: string, name: string): number | undefined => {
  let sum: number | undefined;
  for (const line of text.split('\n')) {
    if (!line.startsWith(`${name}{`) && !line.startsWith(`${name} `)) continue;
    const value = Number(line.trim().split(/\s+/).at(-1));
    if (Number.isFinite(value)) sum = (sum ?? 0) + value;
  }
  return sum;
};

interface LitestreamState {
  synced?: number;
  errors?: number;
  lastSyncAt?: Date;
}

const hostOf = (env: ApiEnv): string | undefined =>
  env.betterAuthUrl === undefined ? undefined : new URL(env.betterAuthUrl).hostname;

export function createChecker({
  db,
  env,
  lastSweepAt,
  probes: given = {},
  now = () => new Date(),
  litestreamMetricsUrl = LITESTREAM_METRICS_URL,
}: CheckerOptions): Checker {
  const probes: CheckProbes = { ...NODE_PROBES, ...given };
  const host = hostOf(env);
  const results = new Map<string, StatusRow>();
  const litestream: LitestreamState = {};
  let quickCheckAt: Date | undefined;
  let running: Promise<void> | undefined;

  const row = (
    name: string,
    status: StatusRow['status'],
    value: string,
    detail?: string,
  ): StatusRow => ({
    name,
    value,
    status,
    checkedAt: now(),
    ...(detail === undefined ? {} : { detail }),
  });

  const settle = async (key: string, name: string, check: () => Promise<StatusRow>) => {
    try {
      results.set(key, await check());
    } catch (error) {
      results.set(key, row(name, 'problem', '—', errorText(error)));
    }
  };

  const external = (key: string, name: string, check: (host: string) => Promise<StatusRow>) =>
    host === undefined
      ? Promise.resolve(void results.set(key, row(name, 'unknown', '—', NO_HOST)))
      : settle(key, name, () => check(host));

  const health = (name: string) => async (domain: string) => {
    const started = Date.now();
    const response = await probes.fetch(`https://${domain}/api/health`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const value = `HTTP ${response.status} за ${Date.now() - started} мс`;
    return response.status === 200
      ? row(name, 'ok', value)
      : row(name, 'problem', value, 'ожидался ответ 200');
  };

  const www = (name: string) => async (domain: string) => {
    const target = `https://${domain}/`;
    const response = await probes.fetch(`https://www.${domain}/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const location = response.headers.get('location') ?? '';
    const value = `HTTP ${response.status} → ${location || '—'}`;
    return [301, 308].includes(response.status) && location === target
      ? row(name, 'ok', value)
      : row(name, 'problem', value, `ожидалось перенаправление 301/308 на ${target}`);
  };

  const certificate = (name: string) => async (domain: string) => {
    const expiry = await probes.certificateExpiry(domain);
    const days = Math.floor((expiry.getTime() - now().getTime()) / DAY_MS);
    const value = `осталось ${days} дн., до ${calendarDate(expiry)}`;
    return days < MIN_CERTIFICATE_DAYS
      ? row(name, 'problem', value, `меньше ${MIN_CERTIFICATE_DAYS} дней`)
      : row(name, 'ok', value);
  };

  const selectOne = async () => {
    db.$client.prepare('select 1').get();
    return row('База данных: SELECT 1', 'ok', 'ответ получен');
  };

  const quickCheck = async () => {
    const at = now();
    if (
      quickCheckAt !== undefined &&
      at.getTime() - quickCheckAt.getTime() < QUICK_CHECK_INTERVAL_MS
    )
      return;
    quickCheckAt = at;
    await settle('quickCheck', 'База данных: quick_check', async () => {
      const lines = (db.$client.pragma('quick_check') as { quick_check: string }[]).map(
        (line) => line.quick_check,
      );
      return lines.length === 1 && lines[0] === 'ok'
        ? row('База данных: quick_check', 'ok', 'ok')
        : row('База данных: quick_check', 'problem', 'ошибки', lines.slice(0, 3).join('; '));
    });
  };

  const syncAge = (): number | undefined =>
    litestream.lastSyncAt && now().getTime() - litestream.lastSyncAt.getTime();

  const litestreamRow = async (): Promise<StatusRow> => {
    const name = 'Litestream';
    let text: string;
    try {
      const response = await probes.fetch(litestreamMetricsUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      text = await response.text();
    } catch (error) {
      const age = syncAge();
      const value = litestream.lastSyncAt
        ? `последняя синхронизация ${clockTime(litestream.lastSyncAt)}`
        : '—';
      return age !== undefined && age > MAX_SYNC_AGE_MS
        ? row(name, 'problem', value, `метрики недоступны и нет синхронизации больше 5 мин`)
        : row(name, 'unknown', value, `метрики недоступны: ${errorText(error)}`);
    }
    const count = metricSum(text, 'litestream_sync_count');
    const syncErrors = metricSum(text, 'litestream_sync_error_count') ?? 0;
    const uploadErrors = metricSum(text, 'litestream_replica_operation_errors_total') ?? 0;
    if (count === undefined) return row(name, 'unknown', '—', 'нет метрики litestream_sync_count');
    const synced = count - syncErrors;
    const errors = syncErrors + uploadErrors;
    const previous = { ...litestream };
    if (synced > 0 && (previous.synced === undefined || synced > previous.synced))
      litestream.lastSyncAt = now();
    litestream.synced = synced;
    litestream.errors = errors;
    const value = `последняя синхронизация ${litestream.lastSyncAt ? clockTime(litestream.lastSyncAt) : '—'}, ошибок ${errors}`;
    const grown = previous.errors === undefined ? 0 : errors - previous.errors;
    if (grown > 0) return row(name, 'problem', value, `ошибок с прошлой проверки: +${grown}`);
    const age = syncAge();
    if (age === undefined || age > MAX_SYNC_AGE_MS)
      return row(name, 'problem', value, 'нет синхронизации больше 5 мин');
    return row(name, 'ok', value);
  };

  const signIn = async () => {
    results.set(
      'github',
      env.github
        ? row('Вход через GitHub', 'ok', 'настроен')
        : row(
            'Вход через GitHub',
            'problem',
            'не настроен',
            'GITHUB_CLIENT_ID и GITHUB_CLIENT_SECRET не заданы',
          ),
    );
    results.set('google', row('Вход через Google', 'ok', env.google ? 'настроен' : 'выключен'));
    await settle('lastSignIn', 'Последний вход', async () => {
      const at = lastSessionCreatedAt(db);
      return row('Последний вход', 'info', at ? dateTime(at) : 'ещё не было');
    });
  };

  const sweeper = async () => {
    const name = 'Очистка ссылок игроков';
    const at = lastSweepAt();
    if (at === undefined) return row(name, 'unknown', 'ещё не было', 'первая очистка через минуту');
    const value = `последняя ${clockTime(at)}`;
    return now().getTime() - at.getTime() > MAX_SWEEP_AGE_MS
      ? row(name, 'problem', value, 'больше 3 мин назад')
      : row(name, 'ok', value);
  };

  const errorsLastHour = async () => {
    const name = 'Ошибки за час';
    const counts = countErrorsSince(db, new Date(now().getTime() - HOUR_MS));
    const value = `браузер ${counts.client}, сервер ${counts.server}`;
    return counts.server >= SERVER_ERRORS_ALERT || counts.client >= CLIENT_ERRORS_ALERT
      ? row(
          name,
          'problem',
          value,
          `сервер от ${SERVER_ERRORS_ALERT} или браузер от ${CLIENT_ERRORS_ALERT} за час`,
        )
      : row(name, 'ok', value);
  };

  const runAll = async () => {
    await Promise.all([
      external('health', 'Сайт отвечает (/api/health)', health('Сайт отвечает (/api/health)')),
      external('www', 'Перенаправление с www', www('Перенаправление с www')),
      external('tls', 'Сертификат TLS', certificate('Сертификат TLS')),
      settle('selectOne', 'База данных: SELECT 1', selectOne),
      quickCheck(),
      settle('litestream', 'Litestream', litestreamRow),
      signIn(),
      settle('sweeper', 'Очистка ссылок игроков', sweeper),
      settle('errors', 'Ошибки за час', errorsLastHour),
    ]);
  };

  const ORDER = [
    'health',
    'www',
    'tls',
    'selectOne',
    'quickCheck',
    'litestream',
    'github',
    'google',
    'lastSignIn',
    'sweeper',
    'errors',
  ];

  return {
    rows: () => ORDER.flatMap((key) => results.get(key) ?? []),
    run: () => {
      running ??= runAll().finally(() => {
        running = undefined;
      });
      return running;
    },
  };
}

export function startChecker(
  options: CheckerOptions,
  intervalMs = CHECK_INTERVAL_MS,
): { checker: Checker; stop: () => void } {
  const checker = createChecker(options);
  void checker.run();
  const timer = setInterval(() => void checker.run(), intervalMs);
  timer.unref();
  return { checker, stop: () => clearInterval(timer) };
}
