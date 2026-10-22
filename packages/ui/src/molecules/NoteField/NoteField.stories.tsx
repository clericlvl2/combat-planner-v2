import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { NoteField } from './NoteField.tsx';
import type { NoteFieldProps } from './NoteField.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface NoteFieldCellProps extends NoteFieldProps {
  withCollapse?: boolean;
  withUnmount?: boolean;
  withRemove?: boolean;
}

const stage = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: 346,
  maxWidth: '100%',
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
  withUnmount = false,
  withRemove = false,
  ...props
}: NoteFieldCellProps) {
  const [value, setValue] = useState(initialValue);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mounted, setMounted] = useState(true);
  return (
    <div style={stage}>
      {mounted ? (
        <NoteField
          key="expanded"
          {...props}
          value={value}
          collapsed={collapsed}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
        />
      ) : (
        <NoteField key="collapsed" value={value} onChange={onChange} collapsed />
      )}
      {withUnmount ? (
        <button type="button" data-story-fixture="" onClick={() => setMounted(false)}>
          Swap to the collapsed instance
        </button>
      ) : null}
      {withRemove ? (
        <button
          data-story-fixture=""
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setMounted(false)}
        >
          Remove the row
        </button>
      ) : null}
      {withCollapse ? (
        <button
          data-story-fixture=""
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setCollapsed(true)}
        >
          Collapse row
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

const columns = ['Empty', 'With note', 'Focus', 'Tap', 'Read only'] as const;

type NoteFieldState = (typeof columns)[number];

const gridRows = [
  {
    label: 'Field',
    render: (state: NoteFieldState) => (
      <NoteFieldCell
        value={state === 'Empty' ? '' : note}
        readOnly={state === 'Read only'}
        data-focus={state === 'Focus' ? '' : undefined}
        data-tap={state === 'Tap' ? '' : undefined}
        onChange={() => {}}
      />
    ),
  },
];

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={gridRows} columns={columns} />,
});

export const Editing = meta.story({
  tags: ['visual'],
  args: { value: '' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    const input = canvas.getByRole('textbox', { name: t('label') });
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'Hex on Orc Berserker');
    await expect(input).toHaveValue('Hex on Orc Berserker');
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const CollapsedLineRenders = meta.story({
  tags: ['!dev'],
  args: { value: 'Concentrating on Hex', collapsed: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await expect(canvas.getByRole('img', { name: t('label') })).toBeVisible();
    await expect(canvas.getByText('Concentrating on Hex')).toBeVisible();
  },
});

export const LongNote = meta.story({
  args: {
    value:
      'Concentrating on Hex. If she takes damage, roll a save; on a fail the hex ends and Orc Berserker is no longer vulnerable to her spells.',
  },
});

export const CollapsedLine = meta.story({
  tags: ['visual'],
  args: { value: note, collapsed: true },
});

export const SavesOnBlur = meta.story({
  tags: ['!dev'],
  args: { value: '' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    await userEvent.type(canvas.getByRole('textbox', { name: t('label') }), 'Hex on Orc Berserker');
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(
      canvas.getByRole('button', { name: `${t('label')}: Hex on Orc Berserker` }),
    ).toBeVisible();
  },
});

export const FrameTapFocusesEditor = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    const editor = canvas.getByRole('textbox', { name: t('label') });
    const frame = canvasElement.querySelector<HTMLElement>('[data-editing]');
    if (!frame) throw new Error('note frame not rendered');
    const box = frame.getBoundingClientRect();
    const padding = { clientX: box.left + 4, clientY: box.top + 4 };
    await expect(document.elementFromPoint(padding.clientX, padding.clientY)).toBe(frame);
    await userEvent.pointer({ keys: '[MouseLeft]', target: frame, coords: padding });
    await expect(editor).toHaveFocus();
    await expect(editor).toBeVisible();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const EnterSaves = meta.story({
  tags: ['!dev'],
  args: { value: 'Concentrating on Hex' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    const field = canvas.getByRole('button', { name: `${t('label')}: Concentrating on Hex` });
    field.focus();
    await userEvent.keyboard('{Enter}');
    const input = canvas.getByRole('textbox', { name: t('label') });
    await userEvent.clear(input);
    await userEvent.type(input, 'Hex on Orc Berserker{Enter}');
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(canvas.queryByRole('textbox')).toBeNull();
  },
});

export const UnchangedNoteDoesNotSave = meta.story({
  tags: ['!dev'],
  args: { value: note },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: `${t('label')}: ${note}` }));
    await expect(canvas.getByRole('textbox', { name: t('label') })).toHaveValue(note);
    await userEvent.tab();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const NoteLengthIsLimited = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      wordBreaks: 'the note is one 250-character token that no column keeps on one line',
    },
  },
  args: { value: '' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    const input = canvas.getByRole('textbox', { name: t('label') });
    await expect(input).toHaveAttribute('maxlength', String(LIMITS.note));
    await userEvent.type(input, 'x'.repeat(LIMITS.note + 10));
    await expect(input).toHaveValue('x'.repeat(LIMITS.note));
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenCalledWith('x'.repeat(LIMITS.note));
  },
});

export const ReadOnlyIgnoresTap = meta.story({
  tags: ['!dev'],
  args: { value: note, readOnly: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(note));
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const CollapsedEmptyShowsNothing = meta.story({
  tags: ['!dev'],
  args: { value: '', collapsed: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await expect(canvas.queryByText(t('placeholder'))).toBeNull();
  },
});

export const CollapsingTheRowSaves = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'the story harness button that drives the host is a test fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
  },
  args: { value: '', withCollapse: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    await userEvent.type(canvas.getByRole('textbox', { name: t('label') }), 'Hex on Orc Berserker');
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse row' }));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.getByText('Hex on Orc Berserker')).toBeVisible();
  },
});

export const SwapToCollapsedSaves = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'the story harness button that drives the host is a test fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
  },
  args: { value: '', withUnmount: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    await userEvent.type(canvas.getByRole('textbox', { name: t('label') }), 'Hex on Orc Berserker');
    await expect(args.onChange).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Swap to the collapsed instance' }));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('Hex on Orc Berserker');
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(await canvas.findByText('Hex on Orc Berserker')).toBeVisible();
  },
});

export const HostRemovalDoesNotSave = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'the story harness button that drives the host is a test fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
  },
  args: { value: '', withRemove: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NoteField');
    await userEvent.click(canvas.getByRole('button', { name: t('label') }));
    await userEvent.type(canvas.getByRole('textbox', { name: t('label') }), 'Hex on Orc Berserker');
    await userEvent.click(canvas.getByRole('button', { name: 'Remove the row' }));
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});
