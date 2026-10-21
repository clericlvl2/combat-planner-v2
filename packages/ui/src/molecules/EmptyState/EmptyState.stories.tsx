import preview from '#.storybook/preview';
import { IconPlus, IconSearchOff, IconSwords, IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { EmptyState } from './EmptyState.tsx';
import type { EmptyStateAction } from './EmptyState.tsx';
import { storyT } from '../../storybook/storyT.ts';

type EmptyStateKind = 'noCombats' | 'noResults' | 'emptyCombat';

interface EmptyStateCellProps {
  kind: EmptyStateKind;
  query?: string;
  newCombatAction?: boolean;
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
  query = 'dragon',
  newCombatAction = false,
  actionIcon,
  actionVariant,
  onAction,
}: EmptyStateCellProps) {
  const { t } = useTranslation('EmptyState');
  const texts: Record<EmptyStateKind, { title: string; body: string }> = {
    noCombats: { title: t('noCombatsTitle'), body: t('noCombatsBody') },
    noResults: { title: t('noResultsTitle'), body: t('noResultsBody', { query }) },
    emptyCombat: { title: t('noUnitsTitle'), body: t('noUnitsBody') },
  };
  const label = newCombatAction
    ? t('newCombat', { ns: 'BottomBar' })
    : kind === 'emptyCombat'
      ? t('addUnit')
      : undefined;
  return (
    <EmptyState
      icon={icons[kind]}
      title={texts[kind].title}
      body={texts[kind].body}
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

export const Default = meta.story({ tags: ['visual'] });

export const NoCombats = meta.story({
  args: { kind: 'noCombats' },
});

export const NoResults = meta.story({
  args: { kind: 'noResults' },
});

export const LongSearchQuery = meta.story({
  args: { kind: 'noResults', query: 'капитан стражи переправы у старой мельницы' },
});

export const NoCombatsWithAction = meta.story({
  tags: ['visual'],
  args: { kind: 'noCombats', newCombatAction: true, actionIcon: IconPlus },
});

export const ActionFiresOnAction = meta.story({
  tags: ['!dev'],
  args: { kind: 'emptyCombat', onAction: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EmptyState');
    await expect(canvas.getByRole('heading', { name: t('noUnitsTitle') })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: t('addUnit') }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const SecondaryAction = meta.story({
  args: { kind: 'emptyCombat', actionVariant: 'secondary', onAction: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EmptyState');
    const button = canvas.getByRole('button', { name: t('addUnit') });
    await expect(button).toHaveAttribute('data-variant', 'secondary');
    await userEvent.click(button);
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});
