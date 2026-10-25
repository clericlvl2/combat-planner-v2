import preview from '#.storybook/preview';
import { IconLinkOff, IconTrash, IconWifiOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { layout } from '../../layout.ts';
import { MessageScreen } from './MessageScreen.tsx';
import { storyT } from '../../storybook/storyT.ts';

type MessageScreenKind = 'linkRevoked' | 'combatDeleted' | 'offline';

interface MessageScreenCellProps {
  kind: MessageScreenKind;
  title?: string;
  body?: string;
  actionLabel?: string;
  actionVariant?: 'primary' | 'secondary';
  withAction?: boolean;
  onAction: () => void;
  onHome?: () => void;
}

const icons: Record<MessageScreenKind, Icon> = {
  linkRevoked: IconLinkOff,
  combatDeleted: IconTrash,
  offline: IconWifiOff,
};

function MessageScreenCell({
  kind,
  title,
  body,
  actionLabel,
  actionVariant,
  withAction = kind !== 'combatDeleted',
  onAction,
  onHome,
}: MessageScreenCellProps) {
  const { t } = useTranslation('MessageScreen');
  return (
    <MessageScreen
      icon={icons[kind]}
      title={title ?? t(`${kind}Title`)}
      body={body ?? t(`${kind}Body`)}
      actionLabel={withAction ? (actionLabel ?? t('tryAgain')) : undefined}
      actionVariant={actionVariant}
      onAction={onAction}
      onHome={onHome}
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/MessageScreen',
  component: MessageScreenCell,
  parameters: { phoneFrame: true },
  args: { kind: 'linkRevoked' as MessageScreenKind, onAction: fn(), onHome: fn() },
});

export const LinkRevoked = meta.story({
  tags: ['visual'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await expect(
      canvas.getByRole('heading', { level: 1 }).closest('[data-system-screen]'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('linkRevokedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('linkRevokedBody'))).toBeVisible();
    const button = canvas.getByRole('button', { name: t('tryAgain') });
    await expect(button).toHaveAttribute('data-variant', 'secondary');
    await expect(button).not.toHaveFocus();
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
    const home = canvas.getByRole('button', { name: t('home') });
    await expect(home).toHaveAttribute('data-variant', 'secondary');
    await expect(home.getBoundingClientRect().top).toBeGreaterThan(
      button.getBoundingClientRect().bottom,
    );
    await expect(args.onAction).not.toHaveBeenCalled();
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});

export const CombatDeletedHomeOnly = meta.story({
  args: { kind: 'combatDeleted' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('combatDeletedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('combatDeletedBody'))).toBeVisible();
    const buttons = canvas.getAllByRole('button');
    await expect(buttons).toHaveLength(1);
    await expect(buttons[0]).toHaveAccessibleName(t('home'));
    await userEvent.click(canvas.getByRole('heading', { level: 1 }));
    await expect(args.onAction).not.toHaveBeenCalled();
    await expect(args.onHome).not.toHaveBeenCalled();
  },
});

export const PrimaryAction = meta.story({
  args: { kind: 'offline', actionVariant: 'primary' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    const button = canvas.getByRole('button', { name: t('tryAgain') });
    await expect(button).toHaveAttribute('data-variant', 'primary');
    await userEvent.click(button);
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const LongTitleAndBody = meta.story({
  args: {
    kind: 'offline',
    title: 'Не удаётся установить соединение с сервером боевого планировщика',
    body: 'Проверьте подключение к интернету, убедитесь, что мастер не остановил сервер, и попробуйте открыть ссылку ещё раз через несколько минут.',
    actionLabel: 'Подключиться снова',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', {
        level: 1,
        name: 'Не удаётся установить соединение с сервером боевого планировщика',
      }),
    ).toBeVisible();
    const button = canvas.getByRole('button', { name: 'Подключиться снова' });
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
  },
});

export const TapCallsOnAction = meta.story({
  tags: ['!dev'],
  args: { kind: 'linkRevoked' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await userEvent.click(canvas.getByRole('button', { name: t('tryAgain') }));
    await expect(args.onAction).toHaveBeenCalledOnce();
    await expect(args.onAction).toHaveBeenCalledWith();
  },
});

export const TapHomeCallsOnHome = meta.story({
  tags: ['!dev'],
  args: { kind: 'offline' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await userEvent.click(canvas.getByRole('button', { name: t('home') }));
    await expect(args.onHome).toHaveBeenCalledOnce();
    await expect(args.onHome).toHaveBeenCalledWith();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const LabelWithoutHandlerHasNoButton = meta.story({
  tags: ['!dev'],
  render: () => (
    <MessageScreen
      icon={IconTrash}
      title="This combat was deleted"
      body="The DM deleted it. Ask them for a new link."
      actionLabel="Try again"
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const CentredOnTallPhone = meta.story({
  tags: ['!dev'],
  globals: { frame: 'large' },
  play: async ({ canvasElement }) => {
    const { height } = layout.viewports.large;
    await waitFor(() => expect(window.innerHeight).toBe(height));
    const screen = canvasElement.querySelector<HTMLElement>('[data-system-screen]');
    const tile = screen?.querySelector<HTMLElement>('[aria-hidden="true"]');
    const buttons = screen?.querySelectorAll<HTMLElement>('button');
    const last = buttons?.[buttons.length - 1];
    await expect(screen?.getBoundingClientRect().height).toBeGreaterThan(
      layout.ranges.tallMinHeight,
    );
    const box = (screen as HTMLElement).getBoundingClientRect();
    const above = (tile as HTMLElement).getBoundingClientRect().top - box.top;
    const below = box.bottom - (last as HTMLElement).getBoundingClientRect().bottom;
    await expect(Math.abs(above - below)).toBeLessThanOrEqual(1);
  },
});
