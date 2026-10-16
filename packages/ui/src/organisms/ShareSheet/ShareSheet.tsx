import { UnstyledButton } from '@mantine/core';
import { IconCheck, IconCopy, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { Button } from '../../atoms/Button/Button.tsx';
import { palette } from '../../theme.ts';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './ShareSheet.module.css';

export interface ShareSheetProps {
  opened: boolean;
  combatTitle: string;
  url: string;
  onCopy: (url: string) => void;
  onReissue: () => void;
  onClose: () => void;
}

export function ShareSheet({
  opened,
  combatTitle,
  url,
  onCopy,
  onReissue,
  onClose,
}: ShareSheetProps) {
  const { t } = useTranslation('ShareSheet');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [wasOpened, setWasOpened] = useState(opened);
  if (wasOpened !== opened) {
    setWasOpened(opened);
    setCopiedUrl(null);
  }
  const copied = copiedUrl === url;
  const CopyIcon = copied ? IconCheck : IconCopy;

  return (
    <Sheet
      opened={opened}
      title={t('title')}
      subtitle={combatTitle}
      onClose={onClose}
      actions={
        <Button
          variant="secondary"
          icon={IconRefresh}
          fullWidth
          className={classes.reissue}
          onClick={onReissue}
        >
          {t('reissue')}
        </Button>
      }
    >
      <div className={classes.body}>
        <div className={classes.qr}>
          <QRCode
            value={url}
            size={188}
            fgColor={palette.base.ink}
            bgColor={palette.base.surface}
            role="img"
            aria-label={t('qr')}
            data-qr=""
          />
        </div>
        <div className={classes.link}>
          <span className={classes.url} data-url="">
            {url}
          </span>
          <UnstyledButton
            component="button"
            type="button"
            className={classes.copy}
            data-copied={copied || undefined}
            onClick={() => {
              setCopiedUrl(url);
              onCopy(url);
            }}
          >
            <CopyIcon className={classes.copyIcon} size={20} stroke={2} aria-hidden="true" />
            {copied ? t('copied') : t('copy')}
          </UnstyledButton>
        </div>
        <p className={classes.note}>{t('note')}</p>
      </div>
    </Sheet>
  );
}
