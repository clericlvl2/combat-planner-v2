import { QueryObserver } from '@tanstack/react-query';
import { describe, expect, it } from 'vite-plus/test';
import { combatLinkQuery, settledLinkError } from '../../src/hooks/useCombatLink.ts';
import { COMBAT_ID, combat } from '../api/fixtures.ts';
import { flush, harness } from './helpers.ts';

describe('useCombatLink query', () => {
  it('refetches on the next Share tap after a failed link.get and hides the stale error while it runs', async () => {
    const context = harness({ combats: [combat({ title: 'Ущелье гоблинов' })] });
    const observer = new QueryObserver(
      context.queryClient,
      combatLinkQuery(context.api, COMBAT_ID, false),
    );
    const seen: Array<Error | null> = [];
    const unsubscribe = observer.subscribe((result) => {
      seen.push(settledLinkError(result));
    });
    const share = async (open: boolean) => {
      observer.setOptions(combatLinkQuery(context.api, COMBAT_ID, open));
      if (open) await flush();
    };
    await share(true);
    const token = observer.getCurrentResult().data?.token;
    expect(token).toEqual(expect.any(String));
    await share(false);
    context.api.failNext('network');
    await share(true);
    expect(settledLinkError(observer.getCurrentResult())).toMatchObject({ code: 'network' });
    await share(false);
    seen.length = 0;
    observer.setOptions(combatLinkQuery(context.api, COMBAT_ID, true));
    const refetching = observer.getCurrentResult();
    expect(refetching.isFetching).toBe(true);
    expect(refetching.error).toMatchObject({ code: 'network' });
    expect(settledLinkError(refetching)).toBeNull();
    await flush();
    const settled = observer.getCurrentResult();
    expect(settled.data?.token).toBe(token);
    expect(settledLinkError(settled)).toBeNull();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen).toEqual(seen.map(() => null));
    expect(context.api.calls.filter((call) => call.method === 'link.get')).toHaveLength(3);
    unsubscribe();
  });
});
