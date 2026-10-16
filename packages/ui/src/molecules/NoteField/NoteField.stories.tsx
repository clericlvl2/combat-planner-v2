import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { NoteField } from './NoteField.tsx';
import type { NoteFieldProps } from './NoteField.tsx';

interface NoteFieldCellProps extends NoteFieldProps {
  withCollapse?: boolean;
}

const stage = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 346,
  padding: 12,
  borderRadius: 16,
  background: 'var(--cp-color-background)',
} as const;

const note = 'Hex on Orc Berserker until the end of round 4';

function NoteFieldCell({
  value: initialValue,
  onChange,
  collapsed: initialCollapsed = false,
  withCollapse = false,
  ...props
}: NoteFieldCellProps) {
  const { t } = useTranslation('NoteField');
  const [value, setValue] = useState(initialValue);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  return (
    <div style={stage}>
      <NoteField
        {...props}
        value={value}
        collapsed={collapsed}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
      {withCollapse ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setCollapsed(true)}
        >
          {t('collapseRow')}
        </button>
      ) : null}
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/NoteField',
  component: NoteFieldCell,
  args: { value: '', onChange: fn() },
});

const renderTap = (args: NoteFieldCellProps) => <NoteFieldCell {...args} data-tap="" />;

export const Anatomy = meta.story({
  args: { value: note },
});

export const FieldEmpty = meta.story({
  name: 'Field, empty',
  args: { value: '' },
});

export const FieldWithNote = meta.story({
  name: 'Field, with note',
  args: { value: note },
});

export const FieldTap = meta.story({
  name: 'Field, tap',
  args: { value: note },
  render: renderTap,
});

export const FieldEditing = meta.story({
  name: 'Field, editing',
  args: { value: '' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note' }));
    const input = canvas.getByRole('textbox', { name: 'Note' });
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'Hex on Orc Berserker');
    await expect(input).toHaveValue('Hex on Orc Berserker');
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const Line = meta.story({
  args: { value: 'Concentrating on Hex', collapsed: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Note' })).toBeVisible();
    await expect(canvas.getByText('Concentrating on Hex')).toBeVisible();
  },
});

export const FieldLong = meta.story({
  name: 'Field, long',
  args: {
    value:
      'Concentrating on Hex. If she takes damage, roll a save; on a fail the hex ends and Orc Berserker is no longer vulnerable to her spells.',
  },
});

export const LineWraps = meta.story({
  name: 'Line, wraps',
  args: { value: note, collapsed: true },
});

export const LineJa = meta.story({
  name: 'Line, ja',
  args: { value: 'ラウンド4の終わりまでオークに呪い', collapsed: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('ラウンド4の終わりまでオークに呪い')).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const ExtraSaveOnBlur = meta.story({
  name: 'Saves on blur',
  args: { value: '' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note' }));
    await userEvent.type(canvas.getByRole('textbox', { name: 'Note' }), 'Hex on Orc Berserker');
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(canvas.getByRole('button', { name: 'Note: Hex on Orc Berserker' })).toBeVisible();
  },
});

export const ExtraSaveOnEnter = meta.story({
  name: 'Keyboard: Enter saves',
  args: { value: 'Concentrating on Hex' },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('button', { name: 'Note: Concentrating on Hex' });
    field.focus();
    await userEvent.keyboard('{Enter}');
    const input = canvas.getByRole('textbox', { name: 'Note' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Hex on Orc Berserker{Enter}');
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(canvas.queryByRole('textbox')).toBeNull();
  },
});

export const ExtraUnchangedDoesNotSave = meta.story({
  name: 'Unchanged note does not save',
  args: { value: note },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: `Note: ${note}` }));
    await expect(canvas.getByRole('textbox', { name: 'Note' })).toHaveValue(note);
    await userEvent.tab();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const ExtraLimit = meta.story({
  name: 'Limit 250 characters',
  args: { value: '' },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note' }));
    const input = canvas.getByRole('textbox', { name: 'Note' });
    await expect(input).toHaveAttribute('maxlength', String(LIMITS.note));
    await userEvent.type(input, 'x'.repeat(LIMITS.note + 10));
    await expect(input).toHaveValue('x'.repeat(LIMITS.note));
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenCalledWith('x'.repeat(LIMITS.note));
  },
});

export const ExtraReadOnly = meta.story({
  name: 'Read-only',
  args: { value: note, readOnly: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(note));
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const ExtraCollapsedEmpty = meta.story({
  name: 'Line, no note',
  args: { value: '', collapsed: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Add a note')).toBeNull();
  },
});

export const ExtraFlowCollapseSaves = meta.story({
  name: 'Flow: edit, collapse row saves',
  args: { value: '', withCollapse: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note' }));
    await userEvent.type(canvas.getByRole('textbox', { name: 'Note' }), 'Hex on Orc Berserker');
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse row' }));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.getByText('Hex on Orc Berserker')).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { value: '' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Заметка' })).toBeVisible();
    await expect(canvas.getByText('Добавить заметку')).toBeVisible();
  },
});
