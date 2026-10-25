import { isStage } from './progress.ts';
import type { TourProgress } from './progress.ts';

export type TourAction = 'click' | 'focus' | 'promote' | 'advance' | 'finish';

export interface TourStepDef {
  stage: number;
  target: string;
  press?: string;
  action: TourAction;
}

export interface TourCounter {
  current: number;
  total: number;
}

export function advanced(progress: TourProgress, stage: number, total: number): TourProgress {
  if (!isStage(progress) || progress.stage !== stage) return progress;
  return stage >= total ? 'done' : { ...progress, stage: stage + 1 };
}

export function skippedStage(progress: TourProgress, stage: number, total: number): TourProgress {
  if (!isStage(progress) || progress.stage !== stage) return progress;
  const next = advanced(progress, stage, total);
  return isStage(next) ? { ...next, skipped: [...progress.skipped, stage] } : next;
}

export function counterOf(
  progress: TourProgress,
  total: number,
  pending: readonly number[] = [],
): TourCounter | null {
  if (!isStage(progress)) return null;
  const { stage, skipped } = progress;
  const before = Array.from({ length: stage - 1 }, (_, index) => index + 1).filter(
    (value) => !skipped.includes(value),
  ).length;
  const ahead = pending.filter((value) => value >= stage && !skipped.includes(value)).length;
  return { current: before + 1, total: total - skipped.length - ahead };
}

export const sameProgress = (a: TourProgress, b: TourProgress): boolean =>
  a === b || JSON.stringify(a) === JSON.stringify(b);
