import preview from '#.storybook/preview';
import { IconSearchOff, IconSwords, IconUsers } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './EmptyState.tsx';

type EmptyStateKind = 'noCombats' | 'noResults' | 'emptyCombat';

interface EmptyStateCellProps {
  kind: EmptyStateKind;
  query?: string;
}

const icons: Record<EmptyStateKind, Icon> = {
  noCombats: IconSwords,
  noResults: IconSearchOff,
  emptyCombat: IconUsers,
};

function EmptyStateCell({ kind, query = 'dragon' }: EmptyStateCellProps) {
  const { t } = useTranslation('EmptyState');
  const texts: Record<EmptyStateKind, { title: string; body: string }> = {
    noCombats: { title: t('noCombatsTitle'), body: t('noCombatsBody') },
    noResults: { title: t('noResultsTitle'), body: t('noResultsBody', { query }) },
    emptyCombat: { title: t('noUnitsTitle'), body: t('noUnitsBody') },
  };
  return <EmptyState icon={icons[kind]} title={texts[kind].title} body={texts[kind].body} />;
}

const meta = preview.meta({
  title: 'Molecules/EmptyState',
  component: EmptyStateCell,
  args: { kind: 'emptyCombat' as EmptyStateKind },
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
