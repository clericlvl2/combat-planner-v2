import preview from '#.storybook/preview';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import type { FakeAccount } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { SignUp } from './SignUp.tsx';

const ferryAccount: FakeAccount = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  password: 'ferry-crossing',
  displayName: 'Ferry DM',
  language: 'en',
};

const signedOut = scenario({ session: null, accounts: [ferryAccount] });

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

type Canvas = ReturnType<typeof within>;

const fill = async (canvas: Canvas, name: string, email: string, password: string) => {
  await userEvent.type(canvas.getByRole('textbox', { name: 'Display name' }), name);
  await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), email);
  await userEvent.type(canvas.getByLabelText('Password'), password);
};

const meta = preview.meta({
  title: 'Screens/SignUp',
  component: SignUp,
  decorators: [withRouter],
  args: { onRedirect: fn() },
  render: (args) => (
    <>
      <SignUp {...args} />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: true,
    scenario: signedOut,
    reactRouter: reactRouterParameters({
      location: { path: '/auth/sign-up' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Create account' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeDisabled();
    await expect(canvas.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    );
    canvas.getByRole('textbox', { name: 'Display name' }).focus();
  },
});

export const ShortPassword = meta.story({
  play: async ({ canvas }) => {
    await fill(canvas, 'Ferry DM', 'new@ferry.games', '12345');
    canvas.getByLabelText('Password').blur();
    await expect(await canvas.findByText('At least 8 characters')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeDisabled();
  },
});

export const SignUpErrors = meta.story({
  play: async ({ canvas, loaded }) => {
    await fill(canvas, 'Ferry DM', 'dm@ferry.games', 'longer-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await expect(await canvas.findByText('This email already has an account')).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeDisabled();
    const password = canvas.getByLabelText('Password');
    await userEvent.clear(password);
    await userEvent.type(password, '12345');
    password.blur();
    await expect(await canvas.findByText('At least 8 characters')).toBeVisible();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'auth.signUp'),
    ).toHaveLength(1);
  },
});

export const ExtraInvalidIsNotTaken = meta.story({
  name: 'A rejected sign-up that is not a taken email shows a generic error',
  play: async ({ canvas, loaded }) => {
    await fill(canvas, 'Ferry DM', 'new@ferry.games', 'longer-password');
    fakeApiOf(loaded).failNext('invalid');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await expect(
      await canvas.findByText('Couldn’t create the account. Check the fields and try again'),
    ).toBeVisible();
    await expect(canvas.queryByText('This email already has an account')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeEnabled();
    await userEvent.type(canvas.getByLabelText('Password'), '!');
    await expect(
      canvas.queryByText('Couldn’t create the account. Check the fields and try again'),
    ).toBeNull();
  },
});

export const Created = meta.story({
  play: async ({ canvas, canvasElement, loaded }) => {
    await fill(canvas, 'Ferry DM', 'new@ferry.games', 'longer-password');
    await userEvent.click(canvas.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(locationOf(canvasElement)).toBe('/combats'));
    const signUps = fakeApiOf(loaded).calls.filter((call) => call.method === 'auth.signUp');
    await expect(signUps.map((call) => call.args)).toEqual([
      [{ displayName: 'Ferry DM', email: 'new@ferry.games', password: 'longer-password' }],
    ]);
  },
});

export const EmptyFields = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: 'Display name' }));
    await userEvent.tab();
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'ferry');
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByText('Enter a display name')).toBeVisible();
    await expect(canvas.getByText('Enter a valid email')).toBeVisible();
    await expect(canvas.getByText('At least 8 characters')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Create account' })).toBeDisabled();
  },
});

export const LongName = meta.story({
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    const name = canvas.getByRole('textbox', { name: 'Отображаемое имя' });
    await userEvent.type(name, 'Капитан стражи переправы у Чёрной воды!!');
    await expect(name).toHaveValue('Капитан стражи переправы у Чёрной воды!!');
    await expect(canvas.getByText('40/40')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Создать аккаунт' })).toBeDisabled();
  },
});

export const Social = meta.story({
  parameters: {
    scenario: scenario({ session: null, accounts: [ferryAccount], providers: ['github'] }),
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Continue with GitHub' }));
    await waitFor(() => expect(args.onRedirect).toHaveBeenCalledOnce());
    await expect(canvas.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  },
});
