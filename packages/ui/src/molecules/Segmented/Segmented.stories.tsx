import preview from '#.storybook/preview';
import type { Role } from '@combat-planner/domain';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { Segmented } from './Segmented.tsx';
import type { SegmentedOption, SegmentedProps } from './Segmented.tsx';
import { storyT } from '../../storybook/storyT.ts';

type Source = 'new' | 'library';

interface SegmentedCellProps extends Omit<
  SegmentedProps<string>,
  'options' | 'aria-label' | 'onChange'
> {
  kind?: 'role' | 'source';
  labels?: readonly string[];
  disabledValues?: readonly string[];
  tap?: number;
  onChange: (value: string) => void;
}

const stage = {
  boxSizing: 'content-box',
  width: 330,
  padding: 16,
  borderRadius: 12,
  background: 'var(--cp-color-surface)',
} as const;

const roleValues: readonly Role[] = ['hero', 'enemy', 'ally'];
const sourceValues: readonly Source[] = ['new', 'library'];

function SegmentedCell({
  kind = 'role',
  labels,
  disabledValues = [],
  tap,
  tone = 'role',
  value: initialValue,
  onChange,
  ...props
}: SegmentedCellProps) {
  const { t } = useTranslation('Segmented');
  const [value, setValue] = useState(initialValue);
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (tap === undefined) return;
    frame.current?.querySelectorAll('[role="radio"]')[tap]?.setAttribute('data-tap', '');
  }, [tap]);
  const values: readonly string[] = kind === 'role' ? roleValues : sourceValues;
  const options: SegmentedOption<string>[] = values.map((option, index) => ({
    value: option,
    label: labels?.[index] ?? t(option),
    disabled: disabledValues.includes(option) || undefined,
  }));
  return (
    <div style={stage} ref={frame}>
      <Segmented
        {...props}
        tone={tone}
        aria-label={kind === 'role' ? t('type') : t('source')}
        options={options}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/Segmented',
  component: SegmentedCell,
  args: { value: 'enemy', onChange: fn() },
});

export const Anatomy = meta.story({});

export const TypeRoleDefault = meta.story({
  name: 'Type · role · default',
});

export const TypeRoleTap = meta.story({
  name: 'Type · role · tap',
  args: { tap: 2 },
});

export const TypeRoleDisabled = meta.story({
  name: 'Type · role · disabled',
  args: { disabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Segmented');
    const ally = canvas.getByRole('radio', { name: t('ally') });
    await expect(ally).toBeDisabled();
    await expect(canvas.getByRole('radio', { name: t('enemy') })).toBeChecked();
    await userEvent.click(ally, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(ally).not.toBeChecked();
  },
});

export const UnitSourceInkDefault = meta.story({
  name: 'Unit source · ink · default',
  args: { kind: 'source', tone: 'ink', value: 'new' },
});

export const UnitSourceInkTap = meta.story({
  name: 'Unit source · ink · tap',
  args: { kind: 'source', tone: 'ink', value: 'new', tap: 1 },
});

export const UnitSourceInkDisabled = meta.story({
  name: 'Unit source · ink · disabled',
  args: { kind: 'source', tone: 'ink', value: 'new', disabled: true },
});

export const SegmentedS = meta.story({
  name: 'Segmented · S',
  args: { size: 'S' },
});

export const SegmentedM = meta.story({
  name: 'Segmented · M',
  args: { size: 'M' },
});

export const SegmentedL = meta.story({
  name: 'Segmented · L',
  args: { size: 'L' },
});

export const RoleDe = meta.story({
  name: 'Role · de',
  args: { labels: ['Held', 'Feind', 'Verbündeter'], value: 'ally' },
});

export const RoleRu = meta.story({
  name: 'Role · ru',
  args: { labels: ['Герой', 'Враг', 'Союзник'], value: 'ally' },
});

export const RoleFr = meta.story({
  name: 'Role · fr',
  args: { labels: ['Héros', 'Ennemi', 'Allié'], value: 'ally' },
});

export const SourceDe = meta.story({
  name: 'Source · de',
  args: { kind: 'source', tone: 'ink', labels: ['Neu', 'Aus Bibliothek'], value: 'library' },
});

export const SourceRu = meta.story({
  name: 'Source · ru',
  args: { kind: 'source', tone: 'ink', labels: ['Новый', 'Из библиотеки'], value: 'library' },
});

export const SourceFr = meta.story({
  name: 'Source · fr',
  args: { kind: 'source', tone: 'ink', labels: ['Nouveau', 'Bibliothèque'], value: 'library' },
});

export const ExtraClick = meta.story({
  name: 'Tap selects at once',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Segmented');
    await userEvent.click(canvas.getByRole('radio', { name: t('ally') }));
    await expect(args.onChange).toHaveBeenCalledWith('ally');
    await expect(canvas.getByRole('radio', { name: t('ally') })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: t('enemy') })).not.toBeChecked();
    await userEvent.click(canvas.getByRole('radio', { name: t('ally') }));
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: arrows move and select',
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Segmented');
    const group = canvas.getByRole('radiogroup', { name: t('type') });
    await expect(group).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: t('enemy') })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenLastCalledWith('ally');
    await expect(canvas.getByRole('radio', { name: t('ally') })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenLastCalledWith('hero');
    await expect(canvas.getByRole('radio', { name: t('hero') })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(args.onChange).toHaveBeenLastCalledWith('ally');
    await userEvent.keyboard('{End}{Home}');
    await expect(args.onChange).toHaveBeenLastCalledWith('hero');
    await expect(args.onChange).toHaveBeenCalledTimes(4);
  },
});

export const ExtraOptionDisabled = meta.story({
  name: 'One option disabled',
  args: { disabledValues: ['hero'] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Segmented');
    const hero = canvas.getByRole('radio', { name: t('hero') });
    await expect(hero).toBeDisabled();
    await userEvent.click(hero, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(hero).not.toBeChecked();
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenLastCalledWith('ally');
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenLastCalledWith('enemy');
    await expect(hero).not.toBeChecked();
  },
});

export const ExtraNoMatch = meta.story({
  name: 'Value matching no option',
  args: { value: 'neutral' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Segmented');
    for (const radio of canvas.getAllByRole('radio')) {
      await expect(radio).not.toBeChecked();
    }
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: t('hero') })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(args.onChange).toHaveBeenLastCalledWith('enemy');
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: 'Typ' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Feind' })).toBeChecked();
  },
});
