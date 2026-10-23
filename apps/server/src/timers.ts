import type { SharingTimeouts } from '@combat-planner/domain';
import { SHARING_TIMEOUTS } from '@combat-planner/domain';

export interface SharingTimers {
  sweepIntervalMs: number;
  timeouts: SharingTimeouts;
}

export const TEST_TIMERS_VARIABLE = 'COMBAT_PLANNER_TEST_TIMERS';

export const PRODUCTION_TIMERS: SharingTimers = {
  sweepIntervalMs: 60_000,
  timeouts: SHARING_TIMEOUTS,
};

export const TEST_TIMERS: SharingTimers = {
  sweepIntervalMs: 1_000,
  timeouts: { orphanedLinkMs: 10_000, watchingMs: 8_000, idleStreamMs: 30_000 },
};

export const sharingTimers = (testTimers: string | undefined): SharingTimers =>
  testTimers === '1' ? TEST_TIMERS : PRODUCTION_TIMERS;
