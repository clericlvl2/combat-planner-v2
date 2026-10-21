import preview from '#.storybook/preview';
import { useTranslation } from 'react-i18next';
import { expect } from 'storybook/test';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { StatSquare } from './StatSquare.tsx';
import type { StatName, StatSquareProps } from './StatSquare.tsx';

type StatSquareCellProps = Omit<StatSquareProps, 'label'>;

function StatSquareCell(props: StatSquareCellProps) {
  const { t } = useTranslation('StatSquare');
  return <StatSquare {...props} label={t(props.stat)} />;
}

const meta = preview.meta({
  title: 'Atoms/StatSquare',
  component: StatSquareCell,
});

const parts = (canvasElement: HTMLElement) => {
  const square = canvasElement.querySelector<HTMLElement>('[data-stat]');
  return {
    square,
    label: square?.firstElementChild ?? null,
    value: square?.lastElementChild ?? null,
  };
};

const values = ['8', '18', '30', '99', 'no value'] as const;
type Value = (typeof values)[number];

const row = (label: string, stat: StatName) => ({
  label,
  render: (value: Value) => (
    <StatSquareCell stat={stat} value={value === 'no value' ? null : Number(value)} />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid columns={values} rows={[row('AC', 'ac'), row('PD', 'pd'), row('MD', 'md')]} />
  ),
});

export const SquareIsFortyPixels = meta.story({
  tags: ['!dev'],
  args: { stat: 'ac', value: 18 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { square, label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('ac'));
    await expect(value).toHaveTextContent('18');
    await expect(square?.getBoundingClientRect().width).toBe(40);
    await expect(square?.getBoundingClientRect().height).toBe(40);
  },
});

export const MaximumFits = meta.story({
  tags: ['!dev'],
  args: { stat: 'md', value: 99 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('md'));
    await expect(value).toHaveTextContent('99');
    await expect(value?.scrollWidth).toBeLessThanOrEqual(36);
  },
});
