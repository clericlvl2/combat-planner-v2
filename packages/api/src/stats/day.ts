export const STATS_TIME_ZONE = 'Europe/Moscow';

const DAY_MS = 86_400_000;

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STATS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const wallFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: STATS_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

const zoneOffsetMs = (at: Date): number => {
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(wallFormat.formatToParts(at).find((item) => item.type === type)?.value ?? 0);
  const wall = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return wall - Math.floor(at.getTime() / 1000) * 1000;
};

export const dayOf = (at: Date): string => dayFormat.format(at);

export const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export const dayStart = (day: string): Date => {
  const midnight = Date.parse(`${day}T00:00:00Z`);
  return new Date(midnight - zoneOffsetMs(new Date(midnight)));
};
