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
import { storyT } from '../../storybook/storyT.ts';

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
  tags: ['visual'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    await providersLoaded(loaded);
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
    await expect(canvas.getByRole('link', { name: t('signUp') })).toHaveAttribute(
      'href',
      '/auth/sign-up',
    );
    await waitFor(() => expect(canvas.queryByText(t('or'))).toBeNull());
    await expect(
      canvas.queryByRole('button', {
        name: (label: string) => label === t('SignIn:google') || label === t('SignIn:github'),
      }),
    ).toBeNull();
    canvas.getByRole('textbox', { name: t('email') }).focus();
  },
});

export const Filled = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SignIn');
    await userEvent.type(canvas.getByRole('textbox', { name: t('email') }), 'dm@ferry.games');
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
    await userEvent.type(canvas.getByLabelText(t('password')), 'secret');
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeEnabled();
  },
});

export const WrongPassword = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    await userEvent.type(canvas.getByRole('textbox', { name: t('email') }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText(t('password')), 'secret');
    await userEvent.click(canvas.getByRole('button', { name: t('submit') }));
    await expect(await canvas.findByText(t('wrongCredentials'))).toBeVisible();
    await expect(canvas.getByLabelText(t('password'))).toHaveAttribute('aria-invalid', 'true');
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).toContain('auth.signIn');
    await expect(locationOf(canvasElement)).toBe('/auth/sign-in');
  },
});

export const EmptyFields = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    await userEvent.click(canvas.getByRole('textbox', { name: t('email') }));
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByText(t('enterEmail'))).toBeVisible();
    await expect(canvas.getByText(t('enterPassword'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).not.toContain('auth.signIn');
  },
});

export const GoogleAndGitHub = meta.story({
  name: 'Google And GitHub',
  parameters: { scenario: withSocial },
  play: async ({ args, canvas, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    const google = await canvas.findByRole('button', { name: t('google') });
    await expect(canvas.getByRole('button', { name: t('github') })).toBeVisible();
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
  tags: ['!dev'],
  parameters: {
    scenario: scenario({ session: null, accounts: [ferryAccount], providers: ['google'] }),
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SignIn');
    await expect(await canvas.findByRole('button', { name: t('google') })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('github') })).toBeNull();
  },
});

export const AfterAccountDeletion = meta.story({
  render: (args) => (
    <SeedDeletedToast>
      <SignIn {...args} />
      <LocationProbe />
    </SeedDeletedToast>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SignIn');
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:accountDeleted'));
    await expect(canvas.getAllByRole('status')).toHaveLength(1);
  },
});

export const StaleDeletedState = meta.story({
  tags: ['!dev'],
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

export const SocialSignInFailed = meta.story({
  parameters: { scenario: withSocial },
  play: async ({ args, canvas, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    const api = fakeApiOf(loaded);
    let fail: (reason: unknown) => void = () => {};
    const calls: string[] = [];
    api.auth.socialSignIn = (provider) => {
      calls.push(provider);
      return new Promise((_resolve, reject) => {
        fail = reject;
      });
    };
    const google = await canvas.findByRole('button', { name: t('google') });
    await userEvent.dblClick(google);
    await expect(calls).toEqual(['google']);
    await expect(google).toBeDisabled();
    fail(new ApiError({ status: 422, code: 'invalid' }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(t('socialFailed'));
    await expect(args.onRedirect).not.toHaveBeenCalled();
    await expect(google).toBeEnabled();
  },
});

export const CantReachServer = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    await providersLoaded(loaded);
    await userEvent.type(canvas.getByRole('textbox', { name: t('email') }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText(t('password')), 'ferry-crossing');
    fakeApiOf(loaded).failNext('network');
    await userEvent.click(canvas.getByRole('button', { name: t('submit') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:serverUnreachable'));
    await expect(canvas.getByRole('button', { name: t('Toast:retry') })).toBeVisible();
    await expect(locationOf(canvasElement)).toBe('/auth/sign-in');
  },
});

export const TooManyRequests = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'SignIn');
    await providersLoaded(loaded);
    await userEvent.type(canvas.getByRole('textbox', { name: t('email') }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText(t('password')), 'ferry-crossing');
    fakeApiOf(loaded).failNext('rateLimited');
    await userEvent.click(canvas.getByRole('button', { name: t('submit') }));
    await expect(await canvas.findByRole('status')).toHaveTextContent(t('Toast:tooManyRequests'));
    await expect(canvas.queryByText(t('wrongCredentials'))).toBeNull();
    await expect(locationOf(canvasElement)).toBe('/auth/sign-in');
  },
});
