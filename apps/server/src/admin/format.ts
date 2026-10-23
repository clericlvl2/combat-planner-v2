import { STATS_TIME_ZONE } from '@combat-planner/api';

export type RowStatus = 'ok' | 'problem' | 'unknown' | 'info';

export interface StatusRow {
  name: string;
  value: string;
  status: RowStatus;
  checkedAt: Date;
  detail?: string;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: STATS_TIME_ZONE,
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const dateTimeFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: STATS_TIME_ZONE,
  hourCycle: 'h23',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: STATS_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const clockTime = (at: Date): string => timeFormat.format(at);

export const dateTime = (at: Date): string => dateTimeFormat.format(at);

export const shortDateTime = (at: Date): string => dateTimeFormat.format(at).replace(', ', ' ');

export const calendarDate = (at: Date): string => dateFormat.format(at);

export const megabytes = (bytes: number): string => `${(bytes / MB).toFixed(1)} МБ`;

export const gigabytes = (bytes: number): string => `${(bytes / GB).toFixed(1)} ГБ`;

export const duration = (seconds: number): string => {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return days > 0 ? `${days} д ${hours} ч ${minutes} мин` : `${hours} ч ${minutes} мин`;
};

export const errorText = (error: unknown): string => {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : '';
  return `${error.message}${cause}`;
};
