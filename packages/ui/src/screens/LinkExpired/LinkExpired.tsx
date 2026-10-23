import { IconLinkOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface LinkExpiredProps {
  onHome: () => void;
}

export function LinkExpired({ onHome }: LinkExpiredProps) {
  const { t } = useTranslation('MessageScreen');
  return (
    <MessageScreen
      icon={IconLinkOff}
      title={t('linkRevokedTitle')}
      body={t('linkRevokedBody')}
      onHome={onHome}
    />
  );
}
