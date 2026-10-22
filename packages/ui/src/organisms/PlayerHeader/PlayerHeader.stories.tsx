import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { PlayerHeader } from './PlayerHeader.tsx';
import type { PlayerHeaderProps } from './PlayerHeader.tsx';
import { anyValue, storyT } from '../../storybook/storyT.ts';

interface PlayerHeaderCellProps extends Omit<PlayerHeaderProps, 'title' | 'round' | 'escalation'> {
  title?: string;
  round?: number | null;
  escalation?: PlayerHeaderProps['escalation'];
}

function PlayerHeaderCell({
  title = 'Ambush at the Ferry',
  round = 3,
  escalation = 2,
  ...props
}: PlayerHeaderCellProps) {
  return <PlayerHeader {...props} title={title} round={round} escalation={escalation} />;
}

const meta = preview.meta({
  title: 'Organisms/PlayerHeader',
  component: PlayerHeaderCell,
  parameters: { phoneFrame: { overlay: true } },
});

export const CombatInProgress = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 3 }) }),
    ).toBeVisible();
    await expect(canvas.getByText('Ambush at the Ferry')).toBeVisible();
    await expect(canvas.getByText(t('EscalationDie:value', { value: 2 }))).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
});

export const Setup = meta.story({
  tags: ['visual'],
  args: { round: null, escalation: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(canvas.getByRole('heading', { level: 1, name: t('setup') })).toBeVisible();
    await expect(canvas.queryByText(anyValue(t, 'EscalationDie:value', 'value'))).toBeNull();
    await expect(canvas.queryByText(t('EscalationDie:none'))).toBeNull();
  },
});

export const LongTitle = meta.story({
  parameters: {
    geometry: {
      truncation: {
        reason: 'the long combat title ends with an ellipsis by design',
        except: 'span:has(+ h1)',
      },
    },
  },
  args: { title: 'Капитан стражи переправы: засада у моста', round: 12, escalation: 6 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    const title = canvas.getByText('Капитан стражи переправы: засада у моста');
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 12 }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('EscalationDie:value', { value: 6 }))).toBeVisible();
  },
});

export const RoundOneDieAtZero = meta.story({
  args: { round: 1, escalation: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 1 }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('EscalationDie:none'))).toBeVisible();
    await expect(canvas.queryByText(anyValue(t, 'EscalationDie:value', 'value'))).toBeNull();
  },
});
