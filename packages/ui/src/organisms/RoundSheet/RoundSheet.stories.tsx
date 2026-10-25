import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { RoundSheet } from './RoundSheet.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface RoundSheetCellProps {
  combatTitle?: string;
  round?: number;
  escalation?: EscalationValue;
  onRoundChange?: (round: number) => void;
  onEscalationChange?: (value: EscalationValue) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function RoundSheetCell({
  combatTitle = 'Ambush at the Ferry',
  round: initialRound = 3,
  escalation: initialEscalation = 2,
  onRoundChange,
  onEscalationChange,
  onClose,
}: RoundSheetCellProps) {
  const [round, setRound] = useState(initialRound);
  const [escalation, setEscalation] = useState(initialEscalation);
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      <RoundSheet
        opened={opened}
        combatTitle={combatTitle}
        round={round}
        escalation={escalation}
        onRoundChange={(next) => {
          setRound(next);
          onRoundChange?.(next);
        }}
        onEscalationChange={(next) => {
          setEscalation(next);
          onEscalationChange?.(next);
        }}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/RoundSheet',
  component: RoundSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onRoundChange: fn(), onEscalationChange: fn(), onClose: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const dialog = await canvas.findByRole('dialog', { name: t('roundSheetTitle') });
    await expect(dialog).toBeVisible();
    await expect(canvas.getByText('Ambush at the Ferry')).toBeVisible();
    await expect(canvas.getByRole('spinbutton')).toHaveValue('3');
    await expect(
      canvas.getByRole('button', { name: t('escalationFace', { value: 2 }) }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByText(t('roundHint', { min: 1, max: 99 }))).toBeVisible();
    await expect(canvas.getByText(t('escalationHint', { max: 6 }))).toBeVisible();
    const faces = canvas.getByRole('group', { name: t('escalationTitle') });
    await expect(faces.querySelectorAll('button[data-face]')).toHaveLength(7);
  },
});

export const RoundAtMaximum = meta.story({
  tags: ['!dev'],
  args: { round: 99 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const increase = await canvas.findByRole('button', { name: t('increase') });
    await expect(increase).toBeDisabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await expect(args.onRoundChange).not.toHaveBeenCalled();
  },
});

export const StepperChangesRound = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    await userEvent.click(await canvas.findByRole('button', { name: t('increase') }));
    await expect(args.onRoundChange).toHaveBeenCalledOnce();
    await expect(args.onRoundChange).toHaveBeenCalledWith(4);
    await expect(canvas.getByRole('spinbutton')).toHaveValue('4');
    await expect(args.onEscalationChange).not.toHaveBeenCalled();
  },
});

export const FacePicksEscalation = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const face = await canvas.findByRole('button', { name: t('escalationFace', { value: 5 }) });
    await userEvent.click(face);
    await expect(args.onEscalationChange).toHaveBeenCalledOnce();
    await expect(args.onEscalationChange).toHaveBeenCalledWith(5);
    await expect(face).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByRole('dialog', { name: t('roundSheetTitle') })).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(args.onRoundChange).not.toHaveBeenCalled();
  },
});

export const FaceArrowsMoveFocus = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const face = (value: number) =>
      canvas.getByRole('button', { name: t('escalationFace', { value }) });
    await canvas.findByRole('dialog', { name: t('roundSheetTitle') });
    face(2).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(face(3)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    await expect(face(6)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(face(0)).toHaveFocus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(face(6)).toHaveFocus());
    await expect(args.onEscalationChange).not.toHaveBeenCalled();
  },
});
