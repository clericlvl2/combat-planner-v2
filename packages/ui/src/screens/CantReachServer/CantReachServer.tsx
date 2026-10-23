import { IconWifiOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface CantReachServerProps {
  onRetry: () => void;
  onHome?: () => void;
}

export function CantReachServer({ onRetry, onHome }: CantReachServerProps) {
  const { t } = useTranslation('MessageScreen');
  return (
    <MessageScreen
      icon={IconWifiOff}
      title={t('offlineTitle')}
      body={t('offlineBody')}
      actionLabel={t('tryAgain')}
      actionVariant="primary"
      onAction={onRetry}
      onHome={onHome}
    />
  );
}
