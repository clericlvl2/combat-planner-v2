import type { Locale } from '@combat-planner/api/client';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { RadioList } from '../../molecules/RadioList/RadioList.tsx';
import { Sheet } from '../../organisms/Sheet/Sheet.tsx';
import { locales } from '../../provider.tsx';
import { localeNames } from '../Settings/localeNames.ts';

export interface LanguageSheetProps {
  opened: boolean;
  onClose: () => void;
}

const options = locales.map((locale) => ({ value: locale, label: localeNames[locale] }));

const arrowKeys: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function LanguageSheet({ opened, onClose }: LanguageSheetProps) {
  const { t } = useTranslation('LanguageSheet');
  const { locale, choose } = useLocaleChoice();
  const movedByArrow = useRef(false);

  return (
    <Sheet
      opened={opened}
      title={t('title')}
      onClose={onClose}
      actions={
        <Button variant="primary" fullWidth onClick={onClose} data-sheet-action="">
          {t('done')}
        </Button>
      }
    >
      <RadioList<Locale>
        aria-label={t('title')}
        options={options}
        value={locale}
        onKeyDownCapture={(event) => {
          movedByArrow.current = arrowKeys.has(event.key);
        }}
        onPointerDownCapture={() => {
          movedByArrow.current = false;
        }}
        onChange={(next) => {
          const keepOpen = movedByArrow.current;
          movedByArrow.current = false;
          choose(next);
          if (!keepOpen) onClose();
        }}
      />
    </Sheet>
  );
}
