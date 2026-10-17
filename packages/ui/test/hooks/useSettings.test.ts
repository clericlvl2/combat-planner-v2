import type { Locale } from '@combat-planner/api/client';
import { describe, expect, it, vi } from 'vite-plus/test';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
import { settingsActions } from '../../src/hooks/settings.ts';
import { flush, harness } from './helpers.ts';

const setup = () => {
  const context = harness();
  const events: string[] = [];
  let current: Locale = 'en';
  const locale = {
    current: () => current,
    apply: (next: Locale) => {
      current = next;
      events.push(`apply ${next}`);
    },
  };
  const invalidate = vi.spyOn(context.queryClient, 'invalidateQueries');
  return { context, events, invalidate, actions: settingsActions(context.api, context, locale) };
};

describe('settingsActions', () => {
  it('applies the locale before the server answers and invalidates the settings and the session', async () => {
    const { actions, context, events, invalidate } = setup();
    const pending = actions.update({ language: 'ja' });
    expect(events).toEqual(['apply ja']);
    await expect(pending).resolves.toEqual({ language: 'ja' });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([
      queryKeys.settings,
      queryKeys.session,
    ]);
    await expect(context.api.settings.get()).resolves.toEqual({ language: 'ja' });
  });

  it('restores the previous locale on failure and Retry applies it again', async () => {
    const { actions, context, events, invalidate } = setup();
    context.api.failNext('network');
    const updated = actions.update({ language: 'ru' });
    await flush();
    expect(events).toEqual(['apply ru', 'apply en']);
    expect(invalidate).not.toHaveBeenCalled();
    context.toasts[0]?.action?.onAction();
    await expect(updated).resolves.toEqual({ language: 'ru' });
    expect(events).toEqual(['apply ru', 'apply en', 'apply ru']);
    await expect(context.api.settings.get()).resolves.toEqual({ language: 'ru' });
  });
});
