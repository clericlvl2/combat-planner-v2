import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { MessageScreen } from '../../organisms/MessageScreen/MessageScreen.tsx';

export interface UnexpectedErrorProps {
  onReload: () => void;
}

export function UnexpectedError({ onReload }: UnexpectedErrorProps) {
  const { t } = useTranslation('UnexpectedError');
  return (
    <MessageScreen
      icon={IconAlertTriangle}
      title={t('title')}
      body={t('body')}
      actionLabel={t('reload')}
      actionVariant="primary"
      onAction={onReload}
    />
  );
}
