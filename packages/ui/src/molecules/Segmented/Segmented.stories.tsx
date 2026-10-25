import preview from '#.storybook/preview';
import type { Role } from '@combat-planner/domain';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { Segmented } from './Segmented.tsx';
import type { SegmentedOption, SegmentedProps } from './Segmented.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';

type Source = 'new' | 'library';

interface SegmentedCellProps extends Omit<
  SegmentedProps<string>,
  'options' | 'aria-label' | 'onChange'
> {
  kind?: 'role' | 'source';
  labels?: readonly string[];
  disabledValues?: readonly string[];
  width?: number;
  mark?: { index: number; attribute: 'data-pressed' | 'data-focus' };
  onChange: (value: string) => void;
}

const stage = {
  boxSizing: 'border-box',
  maxWidth: '100%',
  padding: 8,
  borderRadius: 12,
  background: 'var(--cp-color-surface)',
} as const;

const roleValues: readonly Role[] = ['hero', 'enemy', 'ally'];
const sourceValues: readonly Source[] = ['new', 'library'];

function SegmentedCell({
  kind = 'role',
  labels,
  disabledValues = [],
  width = 330,
  mark,
  tone = 'role',
  value: initialValue,
  onChange,
  ...props
}: SegmentedCellProps) {
  const { t } = useTranslation('Segmented');
  const [value, setValue] = useState(initialValue);
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (mark === undefined) return;
    frame.current?.querySelectorAll('[role="radio"]')[mark.index]?.setAttribute(mark.attribute, '');
  }, [mark]);
  const values: readonly string[] = kind === 'role' ? roleValues : sourceValues;
  const options: SegmentedOption<string>[] = values.map((option, index) => ({
    value: option,
    label: labels?.[index] ?? t(option),
    disabled: disabledValues.includes(option) || undefined,
  }));
  return (
    <div style={{ ...stage, width: width + 16 }} ref={frame}>
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

const columns = ['Default', 'Pressed', 'Disabled', 'Focus'] as const;

type SegmentedState = (typeof columns)[number];

const markOf = (state: SegmentedState, index: number): SegmentedCellProps['mark'] => {
  if (state === 'Pressed') return { index, attribute: 'data-pressed' };
  if (state === 'Focus') return { index, attribute: 'data-focus' };
  return undefined;
};

const gridRows = (
  [
    { label: 'Role M', kind: 'role', tone: 'role', size: 'M' },
    { label: 'Ink M', kind: 'source', tone: 'ink', size: 'M' },
    { label: 'Role S', kind: 'role', tone: 'role', size: 'S' },
    { label: 'Role L', kind: 'role', tone: 'role', size: 'L' },
  ] as const
).map(({ label, kind, tone, size }) => ({
  label,
  render: (state: SegmentedState) => (
    <SegmentedCell
      kind={kind}
      tone={tone}
      size={size}
      value={kind === 'role' ? 'enemy' : 'new'}
      width={302}
      disabled={state === 'Disabled'}
      mark={markOf(state, kind === 'role' ? 2 : 1)}
      onChange={() => {}}
    />
  ),
}));

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={gridRows} columns={columns} />,
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
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

export const LongLabels = meta.story({
  tags: ['visual'],
  args: { labels: ['Персонаж', 'Противник', 'Союзник'], value: 'ally' },
});

export const TapSelectsAtOnce = meta.story({
  tags: ['!dev'],
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

export const ArrowsMoveAndSelect = meta.story({
  tags: ['!dev'],
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

export const DisabledOptionIsSkipped = meta.story({
  tags: ['!dev'],
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

export const ValueMatchingNoOption = meta.story({
  tags: ['!dev'],
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
