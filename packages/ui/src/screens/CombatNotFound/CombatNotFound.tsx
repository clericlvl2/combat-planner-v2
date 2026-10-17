import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface CombatNotFoundProps {
  onGoToCombats: () => void;
}

export function CombatNotFound({ onGoToCombats }: CombatNotFoundProps) {
  const { t } = useTranslation('CombatNotFound');
  return (
    <MessageScreen
      icon={IconSwords}
      title={t('title')}
      body={t('body')}
      actionLabel={t('goToCombats')}
      actionVariant="primary"
      onAction={onGoToCombats}
    />
  );
}
