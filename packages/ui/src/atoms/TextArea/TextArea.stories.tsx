import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/TextArea.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { TextArea } from './TextArea.tsx';
import type { TextAreaProps } from './TextArea.tsx';

type TextKey = keyof typeof en;

interface TextAreaCellProps extends Omit<
  TextAreaProps,
  'label' | 'value' | 'placeholder' | 'error'
> {
  labelKey?: TextKey;
  placeholderKey?: TextKey;
  errorKey?: TextKey;
  valueKey?: TextKey;
  value?: string;
  width?: number;
}

function TextAreaCell({
  labelKey,
  placeholderKey,
  errorKey,
  valueKey,
  value: initialValue,
  width = 280,
  onChange,
  ...props
}: TextAreaCellProps) {
  const { t } = useTranslation('TextArea');
  const [value, setValue] = useState(initialValue ?? (valueKey ? t(valueKey) : ''));
  return (
    <div style={{ width }}>
      <TextArea
        {...props}
        label={labelKey ? t(labelKey) : undefined}
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        error={errorKey ? t(errorKey, { max: props.maxLength }) : undefined}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/TextArea',
  component: TextAreaCell,
  args: { onChange: fn() },
});

const description = { labelKey: 'description', maxLength: 500 } as const;
const filled = { ...description, valueKey: 'descriptionValue' } as const;
const sentence = 'Session 12. Goblins hold the crossing, the orc waits on the raft. ';
const overLimit = sentence.repeat(8).slice(0, 512);
const noteOverLimit = sentence.repeat(4).slice(0, 262);
const noteAtTheLimit = sentence.repeat(4).slice(0, 250);
const note =
  'Concentrating on Hex. If she takes damage, roll a save; on a fail the hex ends and Orc Berserker is no longer vulnerable. Ally Tomas holds the bridge until the end of round 4, then falls back to the mill with the archers.';

const states = ['empty', 'focus', 'filled', 'over the limit', 'disabled'] as const;
type State = (typeof states)[number];

const row = (label: string, props: TextAreaCellProps, filledValue: string, over: string) => ({
  label,
  render: (state: State) => (
    <TextAreaCell
      {...props}
      placeholderKey={state === 'empty' ? 'optional' : undefined}
      value={
        state === 'filled' || state === 'disabled'
          ? filledValue
          : state === 'over the limit'
            ? over
            : ''
      }
      errorKey={state === 'over the limit' ? 'upTo' : undefined}
      disabled={state === 'disabled'}
      data-focus={state === 'focus' ? '' : undefined}
    />
  ),
});

function AllStatesGrid() {
  const { t } = useTranslation('TextArea');
  return (
    <StateGrid
      columns={states}
      rows={[
        row('Description', description, t('descriptionValue'), overLimit),
        row('Note', { labelKey: 'note', maxLength: 250 }, note, noteOverLimit),
      ]}
    />
  );
}

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <AllStatesGrid />,
});

export const AtTheLimit = meta.story({
  args: { labelKey: 'note', maxLength: 250, value: noteAtTheLimit },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('250/250')).not.toHaveAttribute('data-over');
  },
});

export const EmptyHeightIsThreeLines = meta.story({
  tags: ['!dev'],
  args: { ...description, placeholderKey: 'optional' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextArea');
    const field = canvas.getByRole('textbox', { name: t('description') });
    await expect(field.getBoundingClientRect().height).toBe(72);
    await expect(canvas.getByText('0/500')).toBeVisible();
  },
});

export const ErrorIsAnnounced = meta.story({
  tags: ['!dev'],
  args: { ...description, value: overLimit, errorKey: 'upTo' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextArea');
    const field = canvas.getByRole('textbox', { name: t('description') });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('512/500')).toHaveAttribute('data-over');
    await expect(canvas.getByText(t('upTo', { max: 500 }))).toBeVisible();
  },
});

export const TypingUpdatesCounter = meta.story({
  tags: ['!dev'],
  args: { ...description, placeholderKey: 'optional', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextArea');
    const field = canvas.getByRole('textbox', { name: t('description') });
    await userEvent.type(field, 'Goblins{Enter}Orc');
    await expect(field).toHaveValue('Goblins\nOrc');
    await expect(args.onChange).toHaveBeenLastCalledWith('Goblins\nOrc');
    await expect(canvas.getByText('11/500')).toBeVisible();
  },
});

export const TypingStopsAtLimit = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'note', maxLength: 250, value: note.padEnd(248, '.'), onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextArea');
    const field = canvas.getByRole('textbox', { name: t('note') });
    await userEvent.type(field, 'abcd');
    await expect(field).toHaveValue(`${note.padEnd(248, '.')}ab`);
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(canvas.getByText('250/250')).not.toHaveAttribute('data-over');
  },
});

export const GrowsWhileTyping = meta.story({
  tags: ['!dev'],
  args: { ...description, onChange: fn() },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextArea');
    const field = canvas.getByRole('textbox', { name: t('description') });
    await expect(field.getBoundingClientRect().height).toBe(72);
    await userEvent.type(field, 'One{Enter}Two{Enter}Three{Enter}Four{Enter}Five');
    await expect(field.getBoundingClientRect().height).toBeGreaterThan(72);
    await expect(field.scrollHeight).toBe(field.clientHeight);
  },
});

export const DisabledIgnoresTyping = meta.story({
  tags: ['!dev'],
  args: { ...filled, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextArea');
    const field = canvas.getByRole('textbox', { name: t('description') });
    await expect(field).toBeDisabled();
    await userEvent.type(field, 'x', { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});
