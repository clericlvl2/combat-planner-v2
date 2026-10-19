import preview from '#.storybook/preview';
import type { FakeAccount } from '../../api/scenarios.ts';
import { scenario } from '../../api/scenarios.ts';
import type { QueryClient } from '@tanstack/react-query';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { queryKeys } from '../../hooks/queryKeys.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { About } from '../About/About.tsx';
import { Account } from '../Account/Account.tsx';
import { CombatNotFound } from '../CombatNotFound/CombatNotFound.tsx';
import { NotFound } from '../NotFound/NotFound.tsx';
import { Settings } from '../Settings/Settings.tsx';
import { SignIn } from '../SignIn/SignIn.tsx';
import { SignUp } from '../SignUp/SignUp.tsx';
import { UnexpectedError } from '../UnexpectedError/UnexpectedError.tsx';

const ferryAccount: FakeAccount = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  password: 'ferry-crossing',
  displayName: 'Ferry DM',
  language: 'en',
};

const session = {
  userId: ferryAccount.userId,
  email: ferryAccount.email,
  displayName: ferryAccount.displayName,
  language: 'en' as const,
};

const signedOut = scenario({
  session: null,
  accounts: [ferryAccount],
  providers: ['google', 'github'],
});

const oauthOff = scenario({ session: null, accounts: [ferryAccount], providers: [] });

const signedIn = scenario({
  session,
  accounts: [ferryAccount],
  providers: ['google', 'github'],
});

const onRedirect = fn();
const onReload = fn();

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

function AccountFlow() {
  return (
    <Routes>
      <Route path="/account" element={<Account />} />
      <Route path="/auth/sign-in" element={<SignIn onRedirect={onRedirect} />} />
    </Routes>
  );
}

function NotFoundPage() {
  const navigate = useNavigate();
  return <NotFound onGoToCombats={() => navigate('/combats')} />;
}

function CombatNotFoundPage() {
  const navigate = useNavigate();
  return <CombatNotFound onGoToCombats={() => navigate('/combats')} />;
}

const at = (path: string) =>
  reactRouterParameters({
    location: { path },
    routing: { path: '*', useStoryElement: true },
  });

const authPage = (path: string) => ({
  phoneFrame: true,
  scenario: signedOut,
  reactRouter: at(path),
});

const dmPage = (path: string) => ({
  phoneFrame: { overlay: true },
  scenario: signedIn,
  reactRouter: at(path),
});

const meta = preview.meta({
  title: 'Screens/AppPages',
  decorators: [withRouter],
  beforeEach: () => {
    onRedirect.mockClear();
    onReload.mockClear();
  },
});

export const APF11 = meta.story({
  name: 'AP-F1.1 Sign in: empty',
  parameters: authPage('/auth/sign-in'),
  render: () => <SignIn onRedirect={onRedirect} />,
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Continue with GitHub' });
    const email = canvas.getByRole('textbox', { name: 'Email' });
    email.focus();
    await expect(email).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  },
});

export const APF12 = meta.story({
  name: 'AP-F1.2 Sign in: filled',
  parameters: authPage('/auth/sign-in'),
  render: () => <SignIn onRedirect={onRedirect} />,
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Continue with GitHub' });
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText('Password'), 'secret');
    await expect(canvas.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  },
});

export const APF13 = meta.story({
  name: 'AP-F1.3 Wrong password',
  parameters: authPage('/auth/sign-in'),
  render: () => (
    <>
      <SignIn onRedirect={onRedirect} />
      <LocationProbe />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', { name: 'Continue with GitHub' });
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    await userEvent.type(canvas.getByLabelText('Password'), 'secret');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(await canvas.findByText('Wrong email or password')).toBeVisible();
    await expect(locationOf(canvasElement)).toBe('/auth/sign-in');
  },
});

export const APF14 = meta.story({
  name: 'AP-F1.4 Sign up',
  parameters: authPage('/auth/sign-up'),
  render: () => <SignUp onRedirect={onRedirect} />,
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Continue with GitHub' });
    const name = canvas.getByRole('textbox', { name: 'Display name' });
    name.focus();
    await expect(name).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeDisabled();
  },
});

export const APF15 = meta.story({
  name: 'AP-F1.5 Sign-up errors',
  parameters: authPage('/auth/sign-up'),
  render: () => <SignUp onRedirect={onRedirect} />,
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Continue with GitHub' });
    await userEvent.type(canvas.getByRole('textbox', { name: 'Display name' }), 'Ferry DM');
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'dm@ferry.games');
    const password = canvas.getByLabelText('Password');
    await userEvent.type(password, 'longer-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await expect(await canvas.findByText('This email already has an account')).toBeVisible();
    await userEvent.clear(password);
    await userEvent.type(password, '12345');
    password.blur();
    await expect(await canvas.findByText('At least 8 characters')).toBeVisible();
  },
});

export const APF16 = meta.story({
  name: 'AP-F1.6 Sign in with Google',
  parameters: authPage('/auth/sign-in'),
  render: () => <SignIn onRedirect={onRedirect} />,
  play: async ({ canvas, loaded }) => {
    const google = await canvas.findByRole('button', { name: 'Continue with Google' });
    google.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(onRedirect).toHaveBeenCalledOnce());
    await expect(String(onRedirect.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/google\.example\/authorize\?callbackURL=/,
    );
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'auth.socialSignIn'),
    ).toHaveLength(1);
  },
});

export const APF17 = meta.story({
  name: 'AP-F1.7 OAuth not configured',
  parameters: { ...authPage('/auth/sign-in'), scenario: oauthOff },
  render: () => <SignIn onRedirect={onRedirect} />,
  play: async ({ canvas, loaded }) => {
    const queryClient = loaded.queryClient as QueryClient;
    await waitFor(() =>
      expect(queryClient.getQueryState(queryKeys.providers)?.status).toBe('success'),
    );
    await expect(canvas.queryByRole('button', { name: /Continue with/ })).toBeNull();
    await expect(canvas.queryByText('or')).toBeNull();
  },
});

export const APF21 = meta.story({
  name: 'AP-F2.1 Drawer: Settings',
  parameters: dmPage('/settings'),
  render: () => <Settings />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open navigation' }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await expect(within(drawer).getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(await within(drawer).findByText('dm@ferry.games')).toBeVisible();
  },
});

export const APF22 = meta.story({
  name: 'AP-F2.2 Language: English',
  parameters: dmPage('/settings'),
  render: () => <Settings />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'English' })).toBeChecked();
    const russian = canvas.getByRole('radio', { name: 'Русский' });
    russian.focus();
    await expect(russian).toHaveFocus();
    await expect(russian).not.toBeChecked();
  },
});

export const APF23 = meta.story({
  name: 'AP-F2.3 Interface in Russian',
  parameters: dmPage('/settings'),
  render: () => <Settings />,
  play: async ({ canvas, loaded }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Русский' }));
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'settings.update'),
    ).toHaveLength(1);
  },
});

export const APF31 = meta.story({
  name: 'AP-F3.1 Account',
  parameters: dmPage('/account'),
  render: () => <Account />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('dm@ferry.games')).toBeVisible();
    const signOut = canvas.getByRole('button', { name: 'Sign out' });
    signOut.focus();
    await expect(signOut).toHaveFocus();
  },
});

export const APF32 = meta.story({
  name: 'AP-F3.2 Signed out: sign-in screen',
  parameters: { ...authPage('/account'), scenario: signedIn },
  render: () => (
    <>
      <AccountFlow />
      <LocationProbe />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/auth/sign-in'));
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
  },
});

export const APF33 = meta.story({
  name: 'AP-F3.3 Tap Delete account',
  parameters: dmPage('/account'),
  render: () => <Account />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('dm@ferry.games')).toBeVisible();
    const remove = canvas.getByRole('button', { name: 'Delete account' });
    remove.focus();
    await expect(remove).toHaveFocus();
  },
});

export const APF34 = meta.story({
  name: 'AP-F3.4 Confirmation',
  parameters: dmPage('/account'),
  render: () => <Account />,
  play: async ({ canvas, loaded }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete your account?' });
    await expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(fakeApiOf(loaded).calls.map((call) => call.method)).not.toContain(
      'account.remove',
    );
  },
});

export const APF35 = meta.story({
  name: 'AP-F3.5 Account deleted',
  parameters: { ...authPage('/account'), scenario: signedIn },
  render: () => (
    <>
      <AccountFlow />
      <LocationProbe />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete your account?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/auth/sign-in'));
    await expect(await canvas.findByRole('status')).toHaveTextContent('Your account was deleted');
    await expect(canvas.getAllByRole('status')).toHaveLength(1);
  },
});

export const APF41 = meta.story({
  name: 'AP-F4.1 About',
  parameters: dmPage('/about'),
  render: () => (
    <About version="2.0.0" sourceUrl="https://github.com/clericlvl2/combat-planner-v2" />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('2.0.0')).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Source GitHub' })).toBeVisible();
  },
});

export const APF51 = meta.story({
  name: 'AP-F5.1 404',
  parameters: { phoneFrame: true, scenario: signedIn, reactRouter: at('/nowhere') },
  render: () => (
    <>
      <NotFoundPage />
      <LocationProbe />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Go to combats' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const APF52 = meta.story({
  name: 'AP-F5.2 Combat not found',
  parameters: {
    phoneFrame: true,
    scenario: signedIn,
    reactRouter: at('/combats/01JCOMBATNOTFOUND000000000'),
  },
  render: () => (
    <>
      <CombatNotFoundPage />
      <LocationProbe />
    </>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Combat not found' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Go to combats' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
  },
});

export const APF53 = meta.story({
  name: 'AP-F5.3 Unexpected error',
  parameters: { phoneFrame: true, scenario: signedIn, reactRouter: at('/combats') },
  render: () => <UnexpectedError onReload={onReload} />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reload' }));
    await expect(onReload).toHaveBeenCalledOnce();
  },
});
