import preview from '#.storybook/preview';
import { useTranslation } from 'react-i18next';
import { expect } from 'storybook/test';
import { StatSquare } from './StatSquare.tsx';
import type { StatSquareProps } from './StatSquare.tsx';
import { storyT } from '../../storybook/storyT.ts';

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

export const Anatomy = meta.story({
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

export const AC = meta.story({
  name: 'AC',
  args: { stat: 'ac', value: 18 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('ac'));
    await expect(value).toHaveTextContent('18');
  },
});

export const PD = meta.story({
  name: 'PD',
  args: { stat: 'pd', value: 16 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('pd'));
    await expect(value).toHaveTextContent('16');
  },
});

export const MD = meta.story({
  name: 'MD',
  args: { stat: 'md', value: 12 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('md'));
    await expect(value).toHaveTextContent('12');
  },
});

export const EdgeCases30 = meta.story({
  name: '30',
  args: { stat: 'ac', value: 30 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('ac'));
    await expect(value).toHaveTextContent('30');
  },
});

export const SingleDigit = meta.story({
  name: 'Single digit',
  args: { stat: 'pd', value: 8 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('pd'));
    await expect(value).toHaveTextContent('8');
  },
});

export const Missing = meta.story({
  name: 'Missing',
  args: { stat: 'md', value: null },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('md'));
    await expect(value).toHaveTextContent('—');
  },
});

export const ExtraMaximum = meta.story({
  name: 'Maximum 99',
  args: { stat: 'md', value: 99 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'StatSquare');
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent(t('md'));
    await expect(value).toHaveTextContent('99');
    await expect(value?.scrollWidth).toBeLessThanOrEqual(36);
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { stat: 'pd', value: 16 },
  play: async ({ canvasElement }) => {
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent('KV');
    await expect(value).toHaveTextContent('16');
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { stat: 'md', value: 12 },
  play: async ({ canvasElement }) => {
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent('精防');
    await expect(value).toHaveTextContent('12');
    await expect(label?.scrollWidth).toBeLessThanOrEqual(36);
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { stat: 'ac', value: 18 },
  play: async ({ canvasElement }) => {
    const { label, value } = parts(canvasElement);
    await expect(label).toHaveTextContent('КД');
    await expect(value).toHaveTextContent('18');
  },
});
