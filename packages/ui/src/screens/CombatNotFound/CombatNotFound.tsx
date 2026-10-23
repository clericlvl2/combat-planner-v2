import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface CombatNotFoundProps {
  onHome: () => void;
}

export function CombatNotFound({ onHome }: CombatNotFoundProps) {
  const { t } = useTranslation(['CombatNotFound', 'MessageScreen']);
  return (
    <MessageScreen
      icon={IconSwords}
      title={t('title', { ns: 'CombatNotFound' })}
      body={t('body', { ns: 'CombatNotFound' })}
      actionLabel={t('home', { ns: 'MessageScreen' })}
      actionVariant="primary"
      onAction={onHome}
    />
  );
}
