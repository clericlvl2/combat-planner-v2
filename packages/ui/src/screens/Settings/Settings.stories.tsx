import preview from '#.storybook/preview';
import { useLocation } from 'react-router';
import { reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { scenario } from '../../api/scenarios.ts';
import { fakeApiOf } from '../../storybook/withApi.tsx';
import { Settings } from './Settings.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { localeNames, storyLocale } from '../../storybook/withLocale.tsx';

const session = {
  userId: 'dm-ferry',
  email: 'dm@ferry.games',
  displayName: 'Ferry DM',
  language: 'en' as const,
};

const englishScenario = scenario({ session });

function LocationProbe() {
  const { pathname } = useLocation();
  return <span hidden data-location={pathname} />;
}

const locationOf = (canvasElement: HTMLElement): string | null | undefined =>
  canvasElement.querySelector('[data-location]')?.getAttribute('data-location');

const meta = preview.meta({
  title: 'Screens/Settings',
  component: Settings,
  decorators: [withRouter],
  render: () => (
    <>
      <Settings />
      <LocationProbe />
    </>
  ),
  parameters: {
    phoneFrame: { overlay: true },
    scenario: englishScenario,
    reactRouter: reactRouterParameters({
      location: { path: '/settings' },
      routing: { path: '*', useStoryElement: true },
    }),
  },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Settings');
    await expect(canvas.getByRole('heading', { level: 1, name: t('title') })).toBeVisible();
    const current = storyLocale(globals);
    await expect(canvas.getByRole('radio', { name: localeNames[current] })).toBeChecked();
    await expect(canvas.getAllByRole('radio')).toHaveLength(6);
    await expect(
      canvas.getByRole('radio', { name: localeNames[current === 'ja' ? 'en' : 'ja'] }),
    ).not.toBeChecked();
  },
});

export const SwitchToRussian = meta.story({
  tags: ['visual'],
  play: async ({ canvas, loaded }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Русский' }));
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Настройки' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Русский' })).toBeChecked();
    await expect(
      canvas.getByText('Меняет язык интерфейса. Названия юнитов и боёв не переводятся.'),
    ).toBeVisible();
    const updates = fakeApiOf(loaded).calls.filter((call) => call.method === 'settings.update');
    await expect(updates.map((call) => call.args)).toEqual([[{ language: 'ru' }]]);
  },
});

export const KeyboardArrow = meta.story({
  play: async ({ canvas, loaded }) => {
    const english = canvas.getByRole('radio', { name: 'English' });
    english.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(
      await canvas.findByRole('heading', { level: 1, name: 'Einstellungen' }),
    ).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Deutsch' })).toBeChecked();
    await waitFor(() =>
      expect(
        fakeApiOf(loaded).calls.filter((call) => call.method === 'settings.update'),
      ).toHaveLength(1),
    );
  },
});

export const Japanese = meta.story({
  tags: ['visual'],
  globals: { locale: 'ja' },
  parameters: { scenario: scenario({ session, settings: { language: 'ja' } }) },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: '設定' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: '日本語' })).toBeChecked();
  },
});

export const DrawerOpen = meta.story({
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Settings');
    await userEvent.click(canvas.getByRole('button', { name: t('IconButton:openNavigation') }));
    const drawer = await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await expect(within(drawer).getByRole('button', { name: t('title') })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(await within(drawer).findByText('dm@ferry.games')).toBeVisible();
    await expect(locationOf(canvasElement)).toBe('/settings');
  },
});

export const ExtraCheckedFromSettings = meta.story({
  name: 'The checked language comes from the saved settings',
  parameters: { scenario: scenario({ session, settings: { language: 'de' } }) },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('radio', { name: 'Deutsch' })).toBeChecked());
    await expect(canvas.getByRole('radio', { name: 'English' })).not.toBeChecked();
  },
});
