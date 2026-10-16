import { describe, expect, it, vi } from 'vite-plus/test';
import { SESSION_SCOPED_KEYS, accountActions, getProviders } from '../../src/hooks/account.ts';
import { queryKeys } from '../../src/hooks/queryKeys.ts';
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

describe('accountActions', () => {
  it('sign-in invalidates the session and every list of the account', async () => {
    const { actions, invalidate } = setup('signedOut');
    await expect(
      actions.signIn({ email: 'dm@example.com', password: 'correct horse battery' }),
    ).resolves.toMatchObject({ email: 'dm@example.com' });
    expect(invalidated(invalidate)).toEqual([...SESSION_SCOPED_KEYS]);
  });

  it('a wrong password rejects with unauthorized, no toast and no invalidation', async () => {
    const { actions, context, invalidate } = setup('signedOut');
    await expect(
      actions.signIn({ email: 'dm@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(context.toasts).toEqual([]);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('sign-up and sign-out invalidate the session lists', async () => {
    const { actions, invalidate } = setup('signedOut');
    await actions.signUp({
      email: 'новый@example.com',
      password: 'длинный пароль',
      displayName: 'Мастер',
    });
    await actions.signOut();
    expect(invalidated(invalidate)).toEqual([...SESSION_SCOPED_KEYS, ...SESSION_SCOPED_KEYS]);
  });

  it('update invalidates the session', async () => {
    const { actions, invalidate } = setup();
    await expect(actions.update({ displayName: 'Мастер' })).resolves.toMatchObject({
      displayName: 'Мастер',
    });
    expect(invalidated(invalidate)).toEqual([queryKeys.session]);
  });

  it('remove shows "Your account was deleted" and invalidates the session lists', async () => {
    const { actions, context, invalidate } = setup();
    await actions.remove();
    expect(context.toasts).toEqual([{ message: 'accountDeleted' }]);
    expect(invalidated(invalidate)).toEqual([...SESSION_SCOPED_KEYS]);
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
