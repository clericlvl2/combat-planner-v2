import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import type { FakeAccount } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { SignUp } from './SignUp.tsx';
import { storyT } from '../../storybook/storyT.ts';

const ferryAccount: FakeAccount = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  password: 'ferry-crossing',
  displayName: 'Ferry DM',
  language: 'en',
};

const signedOut = scenario({ session: null, accounts: [ferryAccount] });

type Canvas = ReturnType<typeof within>;

const fill = async (
  canvas: Canvas,
  name: string,
  email: string,
  password: string,
  t: TFunction,
) => {
  await userEvent.type(canvas.getByRole('textbox', { name: t('displayName') }), name);
  await userEvent.type(canvas.getByRole('textbox', { name: t('email') }), email);
  await userEvent.type(canvas.getByLabelText(t('password')), password);
};

const meta = preview.meta({
  title: 'Screens/SignUp',
  component: SignUp,
  decorators: [withRouter],
  args: { onRedirect: fn() },
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
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SignUp');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
    await expect(canvas.getByRole('link', { name: t('signIn') })).toHaveAttribute(
      'href',
      '/auth/sign-in',
    );
    canvas.getByRole('textbox', { name: t('displayName') }).focus();
  },
});

export const EmailAlreadyTaken = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'SignUp');
    await fill(canvas, 'Ferry DM', 'dm@ferry.games', 'longer-password', t);
    await userEvent.click(canvas.getByRole('button', { name: t('submit') }));
    await expect(await canvas.findByText(t('emailTaken'))).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: t('email') })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
    const password = canvas.getByLabelText(t('password'));
    await userEvent.clear(password);
    await userEvent.type(password, '12345');
    password.blur();
    await expect(await canvas.findByText(t('tooShort'))).toBeVisible();
    await expect(
      fakeApiOf(loaded).calls.filter((call) => call.method === 'auth.signUp'),
    ).toHaveLength(1);
  },
});

export const SignUpFailed = meta.story({
  play: async ({ canvas, globals, loaded }) => {
    const t = storyT(globals, 'SignUp');
    await fill(canvas, 'Ferry DM', 'new@ferry.games', 'longer-password', t);
    fakeApiOf(loaded).failNext('invalid');
    await userEvent.click(canvas.getByRole('button', { name: t('submit') }));
    await expect(await canvas.findByText(t('failed'))).toBeVisible();
    await expect(canvas.queryByText(t('emailTaken'))).toBeNull();
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeEnabled();
    await userEvent.type(canvas.getByLabelText(t('password')), '!');
    await expect(canvas.queryByText(t('failed'))).toBeNull();
  },
});

export const EmptyFields = meta.story({
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SignUp');
    await userEvent.click(canvas.getByRole('textbox', { name: t('displayName') }));
    await userEvent.tab();
    await userEvent.type(canvas.getByRole('textbox', { name: t('email') }), 'ferry');
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByText(t('enterName'))).toBeVisible();
    await expect(canvas.getByText(t('invalidEmail'))).toBeVisible();
    await expect(canvas.getByText(t('tooShort'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
  },
});

export const LongName = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SignUp');
    const name = canvas.getByRole('textbox', { name: t('displayName') });
    await userEvent.type(name, 'Капитан стражи переправы у Чёрной воды!!');
    await expect(name).toHaveValue('Капитан стражи переправы у Чёрной воды!!');
    await expect(canvas.getByText('40/40')).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('submit') })).toBeDisabled();
  },
});

export const GitHubSignUp = meta.story({
  name: 'GitHub Sign Up',
  parameters: {
    scenario: scenario({ session: null, accounts: [ferryAccount], providers: ['github'] }),
  },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SignUp');
    await userEvent.click(await canvas.findByRole('button', { name: t('SignIn:github') }));
    await waitFor(() => expect(args.onRedirect).toHaveBeenCalledOnce());
    await expect(canvas.queryByRole('button', { name: t('SignIn:google') })).toBeNull();
  },
});
