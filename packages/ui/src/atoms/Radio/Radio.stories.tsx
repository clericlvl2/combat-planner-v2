import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Radio.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { Radio } from './Radio.tsx';
import type { RadioProps } from './Radio.tsx';

type LabelKey = keyof typeof en;

interface RadioCellProps extends Omit<RadioProps, 'label' | 'name' | 'value'> {
  labelKey?: LabelKey;
  name?: string;
  value?: string;
}

const stage = {
  display: 'inline-flex',
  flexDirection: 'column',
  padding: 16,
  borderRadius: 12,
  background: 'var(--cp-color-surface)',
} as const;

function RadioCell({
  checked: initialChecked,
  onChange,
  labelKey,
  name = 'sort',
  value = 'newestFirst',
  ...props
}: RadioCellProps) {
  const { t } = useTranslation('Radio');
  const [checked, setChecked] = useState(initialChecked);
  const text = labelKey ? t(labelKey) : undefined;
  return (
    <div style={stage}>
      <Radio
        {...props}
        name={name}
        value={value}
        label={text}
        aria-label={text ? undefined : t('select')}
        checked={checked}
        onChange={(next) => {
          setChecked(true);
          onChange(next);
        }}
      />
    </div>
  );
}

const sortOptions = ['newestFirst', 'lastPlayed'] as const;

function RadioGroupCell({ checked, onChange, disabled }: RadioCellProps) {
  const { t } = useTranslation('Radio');
  const [selected, setSelected] = useState<string>(checked ? 'lastPlayed' : 'newestFirst');
  return (
    <div style={stage} role="radiogroup">
      {sortOptions.map((option) => (
        <Radio
          key={option}
          name="sort"
          value={option}
          label={t(option)}
          disabled={disabled}
          checked={selected === option}
          onChange={(next) => {
            setSelected(next);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/Radio',
  component: RadioCell,
  args: { checked: false, onChange: fn() },
});

const renderGroup = (args: RadioCellProps) => <RadioGroupCell {...args} />;

const states = ['off', 'on', 'disabled', 'disabled on', 'focus'] as const;
type State = (typeof states)[number];

const row = (size: RadioProps['size'] & string) => ({
  label: size,
  render: (state: State) => (
    <RadioCell
      size={size}
      name={`${size}-${state}`}
      onChange={fn()}
      checked={state === 'on' || state === 'disabled on'}
      disabled={state === 'disabled' || state === 'disabled on'}
      data-focus={state === 'focus' ? '' : undefined}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid columns={states} rows={[row('S'), row('M'), row('L')]} />,
});

export const GroupOfOptions = meta.story({
  args: { checked: false, onChange: fn() },
  render: renderGroup,
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { checked: false, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    const radio = canvas.getByRole('radio', { name: t('select') });
    await expect(radio).toBeDisabled();
    await userEvent.click(radio, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(radio).not.toBeChecked();
  },
});

export const ClickSelects = meta.story({
  tags: ['!dev'],
  args: { checked: false, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    const radio = canvas.getByRole('radio', { name: t('select') });
    await userEvent.click(radio);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('newestFirst');
    await expect(radio).toBeChecked();
    await userEvent.click(radio);
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
});

export const LabelClickSelects = meta.story({
  tags: ['!dev'],
  args: { checked: false, onChange: fn() },
  render: renderGroup,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
    await userEvent.click(canvas.getByText(t('lastPlayed')));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).not.toBeChecked();
  },
});

export const SpaceSelects = meta.story({
  tags: ['!dev'],
  args: { checked: false, labelKey: 'lastPlayed', value: 'lastPlayed', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    const radio = canvas.getByRole('radio', { name: t('lastPlayed') });
    await userEvent.tab();
    await expect(radio).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenCalledWith('lastPlayed');
    await expect(radio).toBeChecked();
  },
});

export const ArrowsMoveWithinGroup = meta.story({
  tags: ['!dev'],
  args: { checked: false, onChange: fn() },
  render: renderGroup,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
  },
});

export const DisabledGroupIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { checked: false, disabled: true, onChange: fn() },
  render: renderGroup,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    await userEvent.click(canvas.getByText(t('lastPlayed')), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
  },
});
