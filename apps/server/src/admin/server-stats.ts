import { statSync, statfsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { StatusRow } from './format.ts';
import { gigabytes, megabytes } from './format.ts';

export const APP_MEMORY_LIMIT_BYTES = 512 * 1024 * 1024;
export const MIN_FREE_DISK_BYTES = 1024 * 1024 * 1024;
const LOAD_PER_CORE_LIMIT = 1.5;
const RSS_SHARE_LIMIT = 0.8;

export interface ServerProbes {
  loadavg(): number[];
  cores(): number;
  totalMemory(): number;
  freeMemory(): number;
  rss(): number;
  freeDisk(directory: string): number;
  fileSize(file: string): number | undefined;
}

export const NODE_SERVER_PROBES: ServerProbes = {
  loadavg: () => os.loadavg(),
  cores: () => os.availableParallelism(),
  totalMemory: () => os.totalmem(),
  freeMemory: () => os.freemem(),
  rss: () => process.memoryUsage.rss(),
  freeDisk: (directory) => {
    const stats = statfsSync(directory);
    return stats.bavail * stats.bsize;
  },
  fileSize: (file) => statSync(file, { throwIfNoEntry: false })?.size,
};

const attempt = (name: string, now: Date, read: () => StatusRow): StatusRow => {
  try {
    return read();
  } catch (error) {
    return {
      name,
      value: '—',
      status: 'unknown',
      checkedAt: now,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
};

export function readServerRows(
  databasePath: string,
  now: Date,
  probes: ServerProbes = NODE_SERVER_PROBES,
): StatusRow[] {
  const directory = path.dirname(databasePath);
  return [
    attempt('Нагрузка 1 / 5 / 15 мин', now, () => {
      const [one = 0, five = 0, fifteen = 0] = probes.loadavg();
      const cores = probes.cores();
      const high = five > cores * LOAD_PER_CORE_LIMIT;
      return {
        name: 'Нагрузка 1 / 5 / 15 мин',
        value: `${[one, five, fifteen].map((load) => load.toFixed(2)).join(' / ')}, ядер ${cores}`,
        status: high ? 'problem' : 'ok',
        checkedAt: now,
        ...(high ? { detail: `за 5 мин выше ${LOAD_PER_CORE_LIMIT} × ядер` } : {}),
      };
    }),
    attempt('Память сервера', now, () => {
      const total = probes.totalMemory();
      return {
        name: 'Память сервера',
        value: `занято ${megabytes(total - probes.freeMemory())} из ${megabytes(total)}`,
        status: 'info',
        checkedAt: now,
      };
    }),
    attempt('Память приложения', now, () => {
      const rss = probes.rss();
      const share = rss / APP_MEMORY_LIMIT_BYTES;
      const high = share > RSS_SHARE_LIMIT;
      return {
        name: 'Память приложения',
        value: `${megabytes(rss)} из ${megabytes(APP_MEMORY_LIMIT_BYTES)} (${Math.round(share * 100)}%)`,
        status: high ? 'problem' : 'ok',
        checkedAt: now,
        ...(high ? { detail: `выше ${RSS_SHARE_LIMIT * 100}% лимита` } : {}),
      };
    }),
    attempt(`Свободно на ${directory}`, now, () => {
      const free = probes.freeDisk(directory);
      const low = free < MIN_FREE_DISK_BYTES;
      return {
        name: `Свободно на ${directory}`,
        value: gigabytes(free),
        status: low ? 'problem' : 'ok',
        checkedAt: now,
        ...(low ? { detail: `меньше ${gigabytes(MIN_FREE_DISK_BYTES)}` } : {}),
      };
    }),
    attempt('Файл базы данных', now, () => ({
      name: 'Файл базы данных',
      value: `${megabytes(probes.fileSize(databasePath) ?? 0)}, WAL ${megabytes(probes.fileSize(`${databasePath}-wal`) ?? 0)}`,
      status: 'info',
      checkedAt: now,
    })),
  ];
}
