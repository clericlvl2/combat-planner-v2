import preview from '#.storybook/preview';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import type { FakeAccount } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { Account } from './Account.tsx';

const ferryAccount: FakeAccount = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  password: 'ferry-crossing',
  displayName: 'Ferry DM',
  language: 'en',
};

const signedIn = scenario({
  session: {
    userId: ferryAccount.userId,
    email: ferryAccount.email,
    displayName: ferryAccount.displayName,
    language: 'en',
  },
  accounts: [ferryAccount],
});

function LocationProbe() {
  const { pathname, state } = useLocation();
  return <span hidden data-location={pathname} data-state={JSON.stringify(state ?? null)} />;
}

const probeOf = (canvasElement: HTMLElement) => {
  const probe = canvasElement.querySelector('[data-location]');
  return {
    location: probe?.getAttribute('data-location'),
    state: JSON.parse(probe?.getAttribute('data-state') ?? 'null') as unknown,
  };
};

const methodsOf = (loaded: Record<string, unknown>) =>
  fakeApiOf(loaded).calls.map((call) => call.method);

const meta = preview.meta({
  title: 'Screens/Account',
  component: Account,
  decorators: [withRouter],
  render: () => (
    <>
      <Account />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: { overlay: true },
    scenario: signedIn,
    reactRouter: reactRouterParameters({
      location: { path: '/account' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Account' })).toBeVisible();
    await expect(await canvas.findByText('dm@ferry.games')).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Display name' })).toHaveValue('Ferry DM');
    await expect(canvas.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Delete account' })).toBeEnabled();
  },
});

export const SignOut = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(probeOf(canvasElement).location).toBe('/auth/sign-in'));
    await expect(methodsOf(loaded)).toContain('auth.signOut');
  },
});

export const ConfirmDelete = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete your account?' });
    await expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(methodsOf(loaded)).not.toContain('account.remove');
    await expect(probeOf(canvasElement).location).toBe('/account');
  },
});

export const AccountDeleted = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete your account?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(probeOf(canvasElement).location).toBe('/auth/sign-in'));
    await expect(probeOf(canvasElement).state).toEqual({ accountDeleted: true });
    await expect(methodsOf(loaded).filter((method) => method === 'account.remove')).toHaveLength(1);
  },
});

export const CancelDelete = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    const dialog = await canvas.findByRole('alertdialog', { name: 'Delete your account?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(canvas.queryByRole('alertdialog')).toBeNull());
    await expect(methodsOf(loaded)).not.toContain('account.remove');
    await expect(probeOf(canvasElement).location).toBe('/account');
  },
});

export const Rename = meta.story({
  play: async ({ canvas, loaded }) => {
    const name = canvas.getByRole('textbox', { name: 'Display name' });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.clear(name);
    await userEvent.type(name, 'Мастер переправы{Enter}');
    const updates = () =>
      fakeApiOf(loaded).calls.filter((call) => call.method === 'account.update');
    await waitFor(() => expect(updates()).toHaveLength(1));
    await expect(updates()[0]!.args).toEqual([{ displayName: 'Мастер переправы' }]);
    await waitFor(() => expect(name).toHaveValue('Мастер переправы'));
  },
});

export const EmptyName = meta.story({
  play: async ({ canvas, loaded }) => {
    const name = canvas.getByRole('textbox', { name: 'Display name' });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.clear(name);
    name.blur();
    await expect(await canvas.findByText('Enter a display name')).toBeVisible();
    await expect(methodsOf(loaded)).not.toContain('account.update');
  },
});

export const Japanese = meta.story({
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'アカウント' })).toBeVisible();
    await expect(await canvas.findByText('dm@ferry.games')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'アカウントを削除' })).toBeVisible();
  },
});
