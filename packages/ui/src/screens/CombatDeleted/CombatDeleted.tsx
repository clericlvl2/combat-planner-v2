import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface CombatDeletedProps {
  combatTitle: string | null;
  onHome: () => void;
}

export function CombatDeleted({ combatTitle, onHome }: CombatDeletedProps) {
  const { t } = useTranslation(['CombatDeleted', 'MessageScreen']);
  return (
    <MessageScreen
      icon={IconTrash}
      title={
        combatTitle
          ? t('title', { ns: 'CombatDeleted', title: combatTitle })
          : t('combatDeletedTitle', { ns: 'MessageScreen' })
      }
      body={t('combatDeletedBody', { ns: 'MessageScreen' })}
      onHome={onHome}
    />
  );
}
