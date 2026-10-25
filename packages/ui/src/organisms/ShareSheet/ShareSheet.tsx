import { UnstyledButton } from '@mantine/core';
import { IconCheck, IconCopy, IconEyeOff, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { Button } from '../../atoms/Button/Button.tsx';
import { iconSizes, palette } from '../../theme.ts';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './ShareSheet.module.css';

export interface ShareSheetProps {
  opened: boolean;
  combatTitle: string;
  url: string;
  onCopy: (url: string) => Promise<boolean> | void;
  onReissue: () => void;
  onStop: () => void;
  onClose: () => void;
}

export function ShareSheet({
  opened,
  combatTitle,
  url,
  onCopy,
  onReissue,
  onStop,
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
        <div className={classes.actions}>
          <Button
            variant="secondary"
            icon={IconRefresh}
            fullWidth
            className={classes.destructive}
            onClick={onReissue}
          >
            {t('reissue')}
          </Button>
          <Button
            variant="secondary"
            icon={IconEyeOff}
            fullWidth
            className={classes.destructive}
            onClick={onStop}
          >
            {t('stop')}
          </Button>
        </div>
      }
    >
      <div className={classes.body}>
        <div className={classes.qr} data-tour="share-qr">
          <QRCode
            value={url}
            size={168}
            fgColor={palette.seeds.ink}
            bgColor={palette.seeds.paper}
            role="img"
            aria-label={t('qr')}
            data-qr=""
          />
        </div>
        <div className={classes.link}>
          <span className={classes.url} data-url="" data-ellipsis="">
            {url}
          </span>
          <UnstyledButton
            component="button"
            type="button"
            className={classes.copy}
            data-sheet-action=""
            aria-label={copied ? t('copied') : t('copy')}
            data-copied={copied || undefined}
            onClick={() => {
              const result = onCopy(url);
              if (!(result instanceof Promise)) {
                setCopiedUrl(url);
                return;
              }
              result.then(
                (ok) => {
                  if (ok) setCopiedUrl(url);
                },
                () => undefined,
              );
            }}
          >
            <CopyIcon
              className={classes.copyIcon}
              size={iconSizes.L}
              stroke={2}
              aria-hidden="true"
            />
          </UnstyledButton>
        </div>
        <p className={classes.note}>{t('note')}</p>
      </div>
    </Sheet>
  );
}
