import preview from '#.storybook/preview';
import { IconLinkOff, IconTrash, IconWifiOff } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
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
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/MessageScreen',
  component: MessageScreenCell,
  parameters: { phoneFrame: true },
  args: { kind: 'linkRevoked' as MessageScreenKind, onAction: fn() },
});

export const Anatomy = meta.story({
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await expect(
      canvas.getByRole('heading', { level: 1 }).closest('[data-system-screen]'),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('linkRevokedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('linkRevokedBody'))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('tryAgain') })).toHaveAttribute(
      'data-variant',
      'secondary',
    );
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const LinkRevoked = meta.story({
  name: 'Link revoked',
  args: { kind: 'linkRevoked' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    const button = canvas.getByRole('button', { name: t('tryAgain') });
    await expect(button).toBeVisible();
    await expect(button).not.toHaveFocus();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const CombatDeleted = meta.story({
  name: 'Combat deleted',
  args: { kind: 'combatDeleted' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('combatDeletedTitle') }),
    ).toBeVisible();
    await expect(canvas.getByText(t('combatDeletedBody'))).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByRole('heading', { level: 1 }));
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const Ru = meta.story({
  name: 'ru',
  args: {
    kind: 'linkRevoked',
    title: 'Эта ссылка больше не работает',
    body: 'Мастер выпустил новую ссылку. Попросите его поделиться ей снова.',
    actionLabel: 'Повторить',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Эта ссылка больше не работает' }),
    ).toBeVisible();
    const button = canvas.getByRole('button', { name: 'Повторить' });
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
  },
});

export const De = meta.story({
  name: 'de',
  args: {
    kind: 'offline',
    title: 'Keine Verbindung zum Server',
    body: 'Prüfe die Verbindung und versuche es erneut.',
    actionLabel: 'Erneut versuchen',
  },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Erneut versuchen' });
    await expect(button.getBoundingClientRect().height).toBe(58);
    await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth);
    await expect(button).not.toHaveFocus();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const ExtraTapAction = meta.story({
  name: 'Tap on the action calls onAction',
  args: { kind: 'linkRevoked' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await userEvent.click(canvas.getByRole('button', { name: t('tryAgain') }));
    await expect(args.onAction).toHaveBeenCalledOnce();
    await expect(args.onAction).toHaveBeenCalledWith();
  },
});

export const ExtraTapActionDe = meta.story({
  name: 'Tap on the de action calls onAction',
  args: {
    kind: 'offline',
    title: 'Keine Verbindung zum Server',
    body: 'Prüfe die Verbindung und versuche es erneut.',
    actionLabel: 'Erneut versuchen',
  },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Erneut versuchen' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space on the action',
  args: { kind: 'offline' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('tryAgain') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await userEvent.keyboard(' ');
    await expect(args.onAction).toHaveBeenCalledTimes(2);
  },
});

export const ExtraLabelWithoutHandler = meta.story({
  name: 'Label without onAction renders no button',
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

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja, cannot reach the server',
  globals: { locale: 'ja' },
  args: { kind: 'offline' },
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'サーバーに接続できません' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: '再試行' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const ExtraPrimaryAction = meta.story({
  name: 'Primary action variant',
  args: { kind: 'offline', actionVariant: 'primary' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'MessageScreen');
    const button = canvas.getByRole('button', { name: t('tryAgain') });
    await expect(button).toHaveAttribute('data-variant', 'primary');
    await userEvent.click(button);
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});
