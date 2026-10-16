import { IconLinkOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export function LinkExpired() {
  const { t } = useTranslation('MessageScreen');
  return (
    <MessageScreen icon={IconLinkOff} title={t('linkRevokedTitle')} body={t('linkRevokedBody')} />
  );
}
