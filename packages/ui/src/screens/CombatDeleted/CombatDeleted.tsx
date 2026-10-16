import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface CombatDeletedProps {
  combatTitle: string;
}

export function CombatDeleted({ combatTitle }: CombatDeletedProps) {
  const { t } = useTranslation(['CombatDeleted', 'MessageScreen']);
  return (
    <MessageScreen
      icon={IconTrash}
      title={t('title', { ns: 'CombatDeleted', title: combatTitle })}
      body={t('combatDeletedBody', { ns: 'MessageScreen' })}
    />
  );
}
