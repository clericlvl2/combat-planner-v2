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
    await expect(canvas.getByText('Signed in with email')).toBeVisible();
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
    await expect(probeOf(canvasElement).state).toBeNull();
    await expect(await canvas.findByRole('status')).toHaveTextContent('Your account was deleted');
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

export const ExtraSignedInWithGitHub = meta.story({
  name: 'The sign-in method comes from the session',
  parameters: {
    scenario: scenario({
      session: {
        userId: ferryAccount.userId,
        email: ferryAccount.email,
        displayName: ferryAccount.displayName,
        language: 'en',
        method: 'github',
      },
      accounts: [ferryAccount],
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Signed in with GitHub')).toBeVisible();
    await expect(canvas.queryByText('Signed in with email')).toBeNull();
  },
});

export const ExtraEnterThenBlurSavesOnce = meta.story({
  name: 'Enter then blur saves the name once',
  play: async ({ canvas, loaded }) => {
    const api = fakeApiOf(loaded);
    let finish: () => void = () => {};
    const update = api.account.update.bind(api.account);
    const updates: unknown[] = [];
    api.account.update = (patch) => {
      updates.push(patch);
      return new Promise((resolve) => {
        finish = () => resolve(update(patch));
      });
    };
    const name = canvas.getByRole('textbox', { name: 'Display name' });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.clear(name);
    await userEvent.type(name, 'Мастер переправы{Enter}');
    name.blur();
    await expect(updates).toEqual([{ displayName: 'Мастер переправы' }]);
    finish();
    await waitFor(() => expect(name).toHaveValue('Мастер переправы'));
    await expect(updates).toHaveLength(1);
  },
});

export const ExtraEmptyNameWhileTyping = meta.story({
  name: 'An emptied name shows no error while the field has focus',
  play: async ({ canvas }) => {
    const name = canvas.getByRole('textbox', { name: 'Display name' });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.clear(name);
    await expect(name).toHaveFocus();
    await expect(canvas.queryByText('Enter a display name')).toBeNull();
  },
});

export const ExtraEmptyNameAfterEarlierBlur = meta.story({
  name: 'After an earlier blur, an emptied name shows the error only after the next blur',
  play: async ({ canvas }) => {
    const name = canvas.getByRole('textbox', { name: 'Display name' });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.type(name, ' Ирина');
    await userEvent.tab();
    await waitFor(() => expect(name).toHaveValue('Ferry DM Ирина'));
    await userEvent.clear(name);
    await expect(name).toHaveFocus();
    await expect(canvas.queryByText('Enter a display name')).toBeNull();
    await userEvent.tab();
    await expect(await canvas.findByText('Enter a display name')).toBeVisible();
  },
});
