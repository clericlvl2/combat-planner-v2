import preview from '#.storybook/preview';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import type { FakeAccount } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { Account } from './Account.tsx';
import { storyT } from '../../storybook/storyT.ts';

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
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Account');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(await canvas.findByText('dm@ferry.games')).toBeVisible();
    await expect(canvas.getByText(t('method_email'))).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: t('displayName') })).toHaveValue('Ferry DM');
    await expect(canvas.getByRole('button', { name: t('signOut') })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: t('deleteAccount') })).toBeEnabled();
  },
});

export const DeleteConfirmation = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Account');
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: t('deleteAccount') }));
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:deleteAccountTitle') });
    await expect(within(dialog).getByRole('button', { name: t('Button:delete') })).toBeVisible();
    await expect(methodsOf(loaded)).not.toContain('account.remove');
    await expect(probeOf(canvasElement).location).toBe('/account');
  },
});

export const CancelDelete = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Account');
    await canvas.findByText('dm@ferry.games');
    await userEvent.click(canvas.getByRole('button', { name: t('deleteAccount') }));
    const dialog = await canvas.findByRole('alertdialog', { name: t('Dialog:deleteAccountTitle') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('Button:cancel') }));
    await waitFor(() => expect(canvas.queryByRole('alertdialog')).toBeNull());
    await expect(methodsOf(loaded)).not.toContain('account.remove');
    await expect(probeOf(canvasElement).location).toBe('/account');
  },
});

export const Rename = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Account');
    const name = canvas.getByRole('textbox', { name: t('displayName') });
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

export const NameEmpty = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Account');
    const name = canvas.getByRole('textbox', { name: t('displayName') });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.clear(name);
    name.blur();
    await expect(await canvas.findByText(t('enterName'))).toBeVisible();
    await expect(methodsOf(loaded)).not.toContain('account.update');
  },
});

export const SignedInWithGitHub = meta.story({
  name: 'Signed In With GitHub',
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
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Account');
    await expect(await canvas.findByText(t('method_github'))).toBeVisible();
    await expect(canvas.queryByText(t('method_email'))).toBeNull();
  },
});

export const EnterThenBlurSavesOnce = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'Account');
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
    const name = canvas.getByRole('textbox', { name: t('displayName') });
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

export const EmptyNameWhileTyping = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Account');
    const name = canvas.getByRole('textbox', { name: t('displayName') });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.clear(name);
    await expect(name).toHaveFocus();
    await expect(canvas.queryByText(t('enterName'))).toBeNull();
  },
});

export const EmptyNameAfterEarlierBlur = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Account');
    const name = canvas.getByRole('textbox', { name: t('displayName') });
    await waitFor(() => expect(name).toHaveValue('Ferry DM'));
    await userEvent.type(name, ' Ирина');
    await userEvent.tab();
    await waitFor(() => expect(name).toHaveValue('Ferry DM Ирина'));
    await userEvent.clear(name);
    await expect(name).toHaveFocus();
    await expect(canvas.queryByText(t('enterName'))).toBeNull();
    await userEvent.tab();
    await expect(await canvas.findByText(t('enterName'))).toBeVisible();
  },
});

export const SignOutFailed = meta.story({
  play: async ({ canvas, canvasElement, globals, loaded }) => {
    const t = storyT(globals, 'Account');
    await canvas.findByText('dm@ferry.games');
    fakeApiOf(loaded).failNext('invalid');
    await userEvent.click(canvas.getByRole('button', { name: t('signOut') }));
    await expect(await canvas.findByText(t('signOutFailed'))).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('Toast:retry') })).toBeNull();
    await expect(probeOf(canvasElement).location).toBe('/account');
    await expect(canvas.getByText('dm@ferry.games')).toBeVisible();
  },
});
