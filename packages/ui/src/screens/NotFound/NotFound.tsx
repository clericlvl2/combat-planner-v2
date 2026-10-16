import { IconMapOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface NotFoundProps {
  onGoToCombats: () => void;
}

export function NotFound({ onGoToCombats }: NotFoundProps) {
  const { t } = useTranslation('NotFound');
  return (
    <MessageScreen
      icon={IconMapOff}
      title={t('title')}
      body={t('body')}
      actionLabel={t('goToCombats')}
      onAction={onGoToCombats}
    />
  );
}
