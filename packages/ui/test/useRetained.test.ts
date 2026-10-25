import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useRetained } from '../src/hooks/useRetained.ts';

const slot = vi.hoisted(() => ({ ref: undefined as { current: unknown } | undefined }));

vi.mock('react', () => ({
  useRef: (initial: unknown) => {
    slot.ref ??= { current: initial };
    return slot.ref;
  },
}));

beforeEach(() => {
  slot.ref = undefined;
});

describe('useRetained', () => {
  it('returns null until a value arrives', () => {
    expect(useRetained<string>(null)).toBeNull();
    expect(useRetained<string>(null)).toBeNull();
  });

  it('keeps the last value after it turns null and takes the next one', () => {
    expect(useRetained('orc')).toBe('orc');
    expect(useRetained<string>(null)).toBe('orc');
    expect(useRetained<string>(null)).toBe('orc');
    expect(useRetained('goblin')).toBe('goblin');
    expect(useRetained<string>(null)).toBe('goblin');
  });

  it('follows every change while the value is set', () => {
    const first = { hp: 10 };
    const second = { hp: 4 };
    expect(useRetained(first)).toBe(first);
    expect(useRetained(second)).toBe(second);
    expect(useRetained<typeof first>(null)).toBe(second);
  });
});
