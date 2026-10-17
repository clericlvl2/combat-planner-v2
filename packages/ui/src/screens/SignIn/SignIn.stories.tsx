import preview from '#.storybook/preview';
import { ApiError } from '@combat-planner/api/client';
import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import type { FakeAccount } from '../../api/scenarios.ts';
import { queryKeys } from '../../hooks/queryKeys.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { SignIn } from './SignIn.tsx';

const ferryAccount: FakeAccount = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  password: 'ferry-crossing',
  displayName: 'Ferry DM',
  language: 'en',
};

const signedOut = scenario({ session: null, accounts: [ferryAccount] });

const withSocial = scenario({
  session: null,
  accounts: [ferryAccount],
  providers: ['google', 'github'],
});

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

function SeedDeletedToast({ children }: { children: ReactNode }) {
  const { show, t } = useToasts();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    show({ message: t('accountDeleted'), kind: 'neutral' });
  }, [show, t]);
  return children;
}

const providersLoaded = async (loaded: Record<string, unknown>) => {
  const queryClient = loaded.queryClient as QueryClient;
  await waitFor(() =>
    expect(queryClient.getQueryState(queryKeys.providers)?.status).toBe('success'),
  );
};

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

const meta = preview.meta({
  title: 'Screens/SignIn',
  component: SignIn,
  decorators: [withRouter],
  args: { onRedirect: fn() },
  render: (args) => (
    <>
      <SignIn {...args} />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: true,
    scenario: signedOut,
    reactRouter: reactRouterParameters({
      location: { path: '/auth/sign-in' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const Default = meta.story({
  play: async ({ canvas, loaded }) => {
    await providersLoaded(loaded);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await expect(canvas.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/auth/sign-up',
    );
    await waitFor(() => expect(canvas.queryByText('or')).toBeNull());
    await expect(canvas.queryByRole('button', { name: /Continue with/ })).toBeNull();
    canvas.getByRole('textbox', { name: 'Email' }).focus();
  },
});

export const Filled = meta.story({
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await userEvent.type(canvas.getByLabelText('Password'), 'secret');
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  },
});

export const WrongPassword = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText('Password'), 'secret');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(await canvas.findByText('Wrong email or password')).toBeVisible();
    await expect(canvas.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).toContain('auth.signIn');
    await expect(locationOf(canvasElement)).toBe('/auth/sign-in');
  },
});

export const SignedIn = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText('Password'), 'ferry-crossing');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
    const signIns = fakeApiOf(loaded).calls.filter((call) => call.method === 'auth.signIn');
    await expect(signIns).toHaveLength(1);
    await expect(signIns[0]!.args).toEqual([
      { email: 'dm@ferry.games', password: 'ferry-crossing' },
    ]);
  },
});

export const KeyboardEnter = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText('Password'), 'ferry-crossing{Enter}');
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const EmptyFields = meta.story({
  play: async ({ canvas, loaded }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: 'Email' }));
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByText('Enter your email')).toBeVisible();
    await expect(canvas.getByText('Enter your password')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).not.toContain('auth.signIn');
  },
});

export const Social = meta.story({
  parameters: { scenario: withSocial },
  play: async ({ args, canvas, loaded }) => {
    const google = await canvas.findByRole('button', { name: 'Continue with Google' });
    await expect(canvas.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
    await userEvent.click(google);
    const callbackUrl = `${window.location.origin}/combats`;
    await waitFor(() =>
      expect(args.onRedirect).toHaveBeenCalledWith(
        `https://google.example/authorize?${new URLSearchParams({ callbackURL: callbackUrl }).toString()}`,
      ),
    );
    await expect(args.onRedirect).toHaveBeenCalledOnce();
    const social = fakeApiOf(loaded).calls.filter((call) => call.method === 'auth.socialSignIn');
    await expect(social.map((call) => call.args)).toEqual([['google', callbackUrl]]);
  },
});

export const GoogleOnly = meta.story({
  parameters: {
    scenario: scenario({ session: null, accounts: [ferryAccount], providers: ['google'] }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Continue with GitHub' })).toBeNull();
  },
});

export const AccountDeleted = meta.story({
  render: (args) => (
    <SeedDeletedToast>
      <SignIn {...args} />
      <LocationProbe />
    </SeedDeletedToast>
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveTextContent('Your account was deleted');
    await expect(canvas.getAllByRole('status')).toHaveLength(1);
  },
});

export const German = meta.story({
  globals: { locale: 'de' },
  parameters: { scenario: withSocial },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Anmelden' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Weiter mit GitHub' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Registrieren' })).toBeVisible();
  },
});

export const ExtraStaleDeletedState = meta.story({
  name: 'A stale accountDeleted history state shows no toast',
  parameters: {
    reactRouter: reactRouterParameters({
      location: { path: '/auth/sign-in', state: { accountDeleted: true } },
      routing: { path: '*', useStoryElement: true },
    }),
  },
  play: async ({ canvas, loaded }) => {
    await providersLoaded(loaded);
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const ExtraSocialFails = meta.story({
  name: 'A double tap sends once; a failed social sign-in shows an error',
  parameters: { scenario: withSocial },
  play: async ({ args, canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    let fail: (reason: unknown) => void = () => {};
    const calls: string[] = [];
    api.auth.socialSignIn = (provider) => {
      calls.push(provider);
      return new Promise((_resolve, reject) => {
        fail = reject;
      });
    };
    const google = await canvas.findByRole('button', { name: 'Continue with Google' });
    await userEvent.dblClick(google);
    await expect(calls).toEqual(['google']);
    await expect(google).toBeDisabled();
    fail(new ApiError({ status: 422, code: 'invalid' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'Couldn’t start the sign-in. Try again.',
    );
    await expect(args.onRedirect).not.toHaveBeenCalled();
    await expect(google).toBeEnabled();
  },
});
