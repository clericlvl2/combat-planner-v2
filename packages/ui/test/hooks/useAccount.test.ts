import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vite-plus/test';
import { accountActions, getProviders } from '../../src/hooks/account.ts';
import { combatKey } from '../../src/hooks/combat.ts';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
import { COMBAT_ID, combat } from '../api/fixtures.ts';
import { harness } from './helpers.ts';

const setup = (session: 'signedIn' | 'signedOut' = 'signedIn') => {
  const context = harness({
    providers: ['google', 'github'],
    ...(session === 'signedOut' ? { session: null } : {}),
  });
  const invalidate = vi.spyOn(context.queryClient, 'invalidateQueries');
  return { context, invalidate, actions: accountActions(context.api, context) };
};

const invalidated = (invalidate: ReturnType<typeof setup>['invalidate']) =>
  invalidate.mock.calls.map(([filters]) => filters?.queryKey);

const seedPreviousAccount = (queryClient: QueryClient) => {
  queryClient.setQueryData(queryKeys.session, { email: 'previous@example.com' });
  queryClient.setQueryData(queryKeys.combats, [{ id: COMBAT_ID }]);
  queryClient.setQueryData(combatKey(COMBAT_ID, { kind: 'dm' }), {
    document: combat(),
    language: null,
  });
};

const cachedKeys = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .getAll()
    .map((query) => query.queryKey);

describe('accountActions', () => {
  it('sign-in drops every cached query of the previous account', async () => {
    const { actions, context } = setup('signedOut');
    seedPreviousAccount(context.queryClient);
    await expect(
      actions.signIn({ email: 'dm@example.com', password: 'correct horse battery' }),
    ).resolves.toMatchObject({ email: 'dm@example.com' });
    expect(cachedKeys(context.queryClient)).toEqual([]);
  });

  it('a wrong password rejects with unauthorized, no toast and no invalidation', async () => {
    const { actions, context, invalidate } = setup('signedOut');
    seedPreviousAccount(context.queryClient);
    await expect(
      actions.signIn({ email: 'dm@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(context.toasts).toEqual([]);
    expect(invalidate).not.toHaveBeenCalled();
    expect(cachedKeys(context.queryClient)).toHaveLength(3);
  });

  it('sign-up and sign-out drop every cached query', async () => {
    const { actions, context } = setup('signedOut');
    seedPreviousAccount(context.queryClient);
    await actions.signUp({
      email: 'новый@example.com',
      password: 'длинный пароль',
      displayName: 'Мастер',
    });
    expect(cachedKeys(context.queryClient)).toEqual([]);
    seedPreviousAccount(context.queryClient);
    await actions.signOut();
    expect(cachedKeys(context.queryClient)).toEqual([]);
  });

  it('update invalidates the session', async () => {
    const { actions, invalidate } = setup();
    await expect(actions.update({ displayName: 'Мастер' })).resolves.toMatchObject({
      displayName: 'Мастер',
    });
    expect(invalidated(invalidate)).toEqual([queryKeys.session]);
  });

  it('remove shows "Your account was deleted" and drops every cached query', async () => {
    const { actions, context } = setup();
    seedPreviousAccount(context.queryClient);
    await actions.remove();
    expect(context.toasts).toEqual([{ message: 'accountDeleted', kind: 'neutral' }]);
    expect(cachedKeys(context.queryClient)).toEqual([]);
    await expect(context.api.auth.session()).resolves.toBeNull();
  });

  it('socialSignIn returns the provider URL and lists only configured providers', async () => {
    const { actions, context, invalidate } = setup('signedOut');
    await expect(getProviders(context.api)).resolves.toEqual(['google', 'github']);
    await expect(actions.socialSignIn('google', '/combats')).resolves.toMatchObject({
      url: expect.stringContaining('google'),
    });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
