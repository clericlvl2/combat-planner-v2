import { IconMapOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface NotFoundProps {
  onHome: () => void;
}

export function NotFound({ onHome }: NotFoundProps) {
  const { t } = useTranslation(['NotFound', 'MessageScreen']);
  return (
    <MessageScreen
      icon={IconMapOff}
      title={t('title', { ns: 'NotFound' })}
      body={t('body', { ns: 'NotFound' })}
      actionLabel={t('home', { ns: 'MessageScreen' })}
      actionVariant="primary"
      onAction={onHome}
    />
  );
}
