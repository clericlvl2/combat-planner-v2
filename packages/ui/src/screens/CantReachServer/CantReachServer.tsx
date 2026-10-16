import { IconWifiOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface CantReachServerProps {
  onRetry: () => void;
}

export function CantReachServer({ onRetry }: CantReachServerProps) {
  const { t } = useTranslation('MessageScreen');
  return (
    <MessageScreen
      icon={IconWifiOff}
      title={t('offlineTitle')}
      body={t('offlineBody')}
      actionLabel={t('tryAgain')}
      onAction={onRetry}
    />
  );
}
