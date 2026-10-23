import type { Combat } from '@combat-planner/domain';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { saveCombatFile } from '../../src/screens/shared/combatFile.ts';

const MINUTE_MS = 60_000;

const now = '2026-10-16T12:00:00.000Z';

const combat: Combat = {
  id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  title: 'Goblin ambush',
  description: '',
  color: 7,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 1,
  players: {},
  createdAt: now,
  updatedAt: now,
  units: [],
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('saveCombatFile', () => {
  it('keeps the download URL alive long enough for the browser to fetch it', async () => {
    vi.useFakeTimers();
    const click = vi.fn();
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', {
      createElement: () => ({ click, remove: () => {} }),
      body: { append: () => {} },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:combat');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    await saveCombatFile(combat);
    expect(click).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(MINUTE_MS - 1);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith('blob:combat');
  });
});
