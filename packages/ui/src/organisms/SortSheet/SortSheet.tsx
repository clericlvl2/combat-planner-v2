import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { RadioList } from '../../molecules/RadioList/RadioList.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';

export const combatSorts = ['newestFirst', 'lastPlayed', 'alphabetical'] as const;

export const presetSorts = ['newestFirst', 'alphabetical', 'byType'] as const;

export type CombatSort = (typeof combatSorts)[number];

export type PresetSort = (typeof presetSorts)[number];

export type SortContext = 'combats' | 'presets';

interface SortSheetBaseProps {
  opened: boolean;
  onClose: () => void;
}

interface CombatSortSheetProps extends SortSheetBaseProps {
  context: 'combats';
  value: CombatSort;
  onChange: (value: CombatSort) => void;
}

interface PresetSortSheetProps extends SortSheetBaseProps {
  context: 'presets';
  value: PresetSort;
  onChange: (value: PresetSort) => void;
}

export type SortSheetProps = CombatSortSheetProps | PresetSortSheetProps;

const arrowKeys: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export function SortSheet(props: SortSheetProps) {
  const { t } = useTranslation('SortSheet');
  const movedByArrow = useRef(false);
  const values: readonly string[] = props.context === 'combats' ? combatSorts : presetSorts;
  const title = props.context === 'combats' ? t('sortCombats') : t('sortPresets');

  const emit = (next: string) => {
    if (props.context === 'combats') {
      const sort = combatSorts.find((option) => option === next);
      if (sort) props.onChange(sort);
    } else {
      const sort = presetSorts.find((option) => option === next);
      if (sort) props.onChange(sort);
    }
  };

  return (
    <Sheet
      opened={props.opened}
      title={title}
      onClose={props.onClose}
      actions={
        <Button variant="primary" fullWidth onClick={props.onClose}>
          {t('done')}
        </Button>
      }
    >
      <RadioList
        aria-label={title}
        options={values.map((option) => ({ value: option, label: t(option) }))}
        value={props.value}
        onKeyDownCapture={(event) => {
          movedByArrow.current = arrowKeys.has(event.key);
        }}
        onPointerDownCapture={() => {
          movedByArrow.current = false;
        }}
        onChange={(next) => {
          const keepOpen = movedByArrow.current;
          movedByArrow.current = false;
          emit(next);
          if (!keepOpen) props.onClose();
        }}
      />
    </Sheet>
  );
}
