import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Checkbox.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { conditionNames } from '../../theme.ts';
import { Checkbox } from './Checkbox.tsx';
import type { CheckboxProps } from './Checkbox.tsx';

type LabelKey = keyof typeof en;

interface CheckboxCellProps extends Omit<CheckboxProps, 'label'> {
  labelKey?: LabelKey;
}

function CheckboxCell({
  checked: initialChecked,
  onChange,
  labelKey,
  ...props
}: CheckboxCellProps) {
  const { t } = useTranslation('Checkbox');
  const [checked, setChecked] = useState(initialChecked);
  const text = labelKey ? t(labelKey) : undefined;
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 16,
        borderRadius: 12,
        background: 'var(--cp-color-surface)',
      }}
    >
      <Checkbox
        {...props}
        label={text}
        aria-label={text ? undefined : t('select')}
        checked={checked}
        onChange={(next) => {
          setChecked(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/Checkbox',
  component: CheckboxCell,
  args: { checked: false, onChange: fn() },
});

const states = ['off', 'on', 'disabled off', 'disabled on', 'focus'] as const;
type State = (typeof states)[number];

const row = (label: string, props: Partial<CheckboxCellProps>) => ({
  label,
  render: (state: State) => (
    <CheckboxCell
      {...props}
      onChange={fn()}
      checked={state === 'on' || state === 'disabled on'}
      disabled={state === 'disabled off' || state === 'disabled on'}
      data-focus={state === 'focus' ? '' : undefined}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={states}
      rows={[
        row('Square S', { shape: 'square', size: 'S' }),
        row('Square M', { shape: 'square', size: 'M' }),
        row('Square L', { shape: 'square', size: 'L' }),
        row('Round S', { shape: 'round', size: 'S' }),
        row('Round M', { shape: 'round', size: 'M' }),
        row('Round L', { shape: 'round', size: 'L' }),
      ]}
    />
  ),
});

export const AllConditions = meta.story({
  render: () => (
    <StateGrid
      columns={conditionNames}
      rows={[
        {
          label: 'Round on',
          render: (condition) => (
            <CheckboxCell shape="round" checked condition={condition} onChange={fn()} />
          ),
        },
      ]}
    />
  ),
});

export const WithLabel = meta.story({
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <CheckboxCell checked={false} labelKey="tagUndead" onChange={fn()} />
      <CheckboxCell checked labelKey="tagUndead" onChange={fn()} />
    </div>
  ),
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { shape: 'square', checked: false, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    const box = canvas.getByRole('checkbox', { name: t('select') });
    await expect(box).toBeDisabled();
    await userEvent.click(box, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(box).not.toBeChecked();
  },
});

export const ClickToggles = meta.story({
  tags: ['!dev'],
  args: { checked: false, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    const box = canvas.getByRole('checkbox', { name: t('select') });
    await userEvent.click(box);
    await expect(args.onChange).toHaveBeenLastCalledWith(true);
    await expect(box).toBeChecked();
    await userEvent.click(box);
    await expect(args.onChange).toHaveBeenLastCalledWith(false);
    await expect(box).not.toBeChecked();
  },
});

export const LabelClickToggles = meta.story({
  tags: ['!dev'],
  args: { checked: false, labelKey: 'tagUndead', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    await userEvent.click(canvas.getByText(t('tagUndead')));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole('checkbox', { name: t('tagUndead') })).toBeChecked();
  },
});

export const SpaceToggles = meta.story({
  tags: ['!dev'],
  args: { checked: false, labelKey: 'tagUndead', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    const box = canvas.getByRole('checkbox', { name: t('tagUndead') });
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenLastCalledWith(true);
    await expect(box).toBeChecked();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenLastCalledWith(false);
    await expect(box).not.toBeChecked();
  },
});

export const DisabledLabelIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { checked: true, labelKey: 'tagUndead', disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    await userEvent.click(canvas.getByText(t('tagUndead')), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('checkbox', { name: t('tagUndead') })).toBeChecked();
  },
});
