import preview from '#.storybook/preview';
import { IconPlus, IconSearchOff, IconSwords, IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { EmptyState } from './EmptyState.tsx';
import type { EmptyStateAction } from './EmptyState.tsx';

type EmptyStateKind = 'noCombats' | 'noResults' | 'emptyCombat';

interface EmptyStateCellProps {
  kind: EmptyStateKind;
  title?: string;
  body?: string;
  actionLabel?: string;
  actionIcon?: Icon;
  actionVariant?: EmptyStateAction['variant'];
  onAction: () => void;
}

const icons: Record<EmptyStateKind, Icon> = {
  noCombats: IconSwords,
  noResults: IconSearchOff,
  emptyCombat: IconUsers,
};

function EmptyStateCell({
  kind,
  title,
  body,
  actionLabel,
  actionIcon,
  actionVariant,
  onAction,
}: EmptyStateCellProps) {
  const { t } = useTranslation('EmptyState');
  const texts: Record<EmptyStateKind, { title: string; body: string }> = {
    noCombats: { title: t('noCombatsTitle'), body: t('noCombatsBody') },
    noResults: { title: t('noResultsTitle'), body: t('noResultsBody', { query: 'dragon' }) },
    emptyCombat: { title: t('noUnitsTitle'), body: t('noUnitsBody') },
  };
  const label = actionLabel ?? (kind === 'emptyCombat' ? t('addUnit') : undefined);
  return (
    <EmptyState
      icon={icons[kind]}
      title={title ?? texts[kind].title}
      body={body ?? texts[kind].body}
      action={
        label === undefined
          ? undefined
          : {
              label,
              onAction,
              icon: actionIcon ?? IconUserPlus,
              variant: actionVariant,
            }
      }
    />
  );
}

const meta = preview.meta({
  title: 'Molecules/EmptyState',
  component: EmptyStateCell,
  args: { kind: 'emptyCombat' as EmptyStateKind, onAction: fn() },
});

export const Anatomy = meta.story({});

export const NoCombats = meta.story({
  name: 'No combats',
  args: { kind: 'noCombats' },
});

export const NoResults = meta.story({
  name: 'No results',
  args: { kind: 'noResults' },
});

export const EmptyCombat = meta.story({
  name: 'Empty combat',
  args: { kind: 'emptyCombat' },
});

export const RuLongQuery = meta.story({
  name: 'ru, long query',
  args: {
    kind: 'noResults',
    title: 'Ничего не найдено',
    body: 'Нет сражений по запросу «капитан стражи переправы».',
  },
});

export const DeAction = meta.story({
  name: 'de, action',
  args: {
    kind: 'noCombats',
    title: 'Noch keine Kämpfe',
    body: 'Erstelle einen Kampf, füge Einheiten hinzu und teile den Link.',
    actionLabel: 'Kampf erstellen',
    actionIcon: IconPlus,
  },
});

export const ExtraAction = meta.story({
  name: 'Action fires onAction',
  args: { kind: 'emptyCombat', onAction: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'No units yet' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Add unit' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter on the action',
  args: { kind: 'emptyCombat', onAction: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Add unit' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const ExtraWithoutAction = meta.story({
  name: 'Without an action',
  args: { kind: 'noResults', onAction: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Nothing found' })).toBeVisible();
    await expect(canvas.getByText('No combat matches “dragon”.')).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const ExtraSecondaryAction = meta.story({
  name: 'Secondary action',
  args: { kind: 'emptyCombat', actionVariant: 'secondary', onAction: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Add unit' });
    await expect(button).toHaveAttribute('data-variant', 'secondary');
    await userEvent.click(button);
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { kind: 'emptyCombat' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Noch keine Einheiten' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Einheit hinzufügen' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { kind: 'noResults' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: '見つかりません' })).toBeVisible();
  },
});
