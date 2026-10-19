import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import { SearchField } from '../../atoms/SearchField/SearchField.tsx';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';
import { TextArea } from '../../atoms/TextArea/TextArea.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import { CheckList } from '../../molecules/CheckList/CheckList.tsx';
import { RadioList } from '../../molecules/RadioList/RadioList.tsx';
import { SwatchRow } from '../../molecules/SwatchRow/SwatchRow.tsx';
import { layout } from '../../layout.ts';
import { Sheet } from './Sheet.tsx';

type Sample = 'sort' | 'tags' | 'form' | 'long';

interface SheetCellProps {
  sample?: Sample;
  title?: string;
  subtitle?: string;
  primary?: string;
  secondary?: boolean;
  primaryDisabled?: boolean;
  back?: boolean;
  opened?: boolean;
  withOpener?: boolean;
  focusPrimary?: boolean;
  header?: boolean;
  actionsAs?: 'list' | 'fragment' | 'none';
  onClose?: () => void;
  onBack?: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const sortValues = ['newestFirst', 'lastPlayed', 'alphabetical'] as const;

type SortValue = (typeof sortValues)[number];

const tagKeys = ['orcs', 'ferry', 'goblins', 'undead'] as const;

const tagCounts = [2, 6, 3, 4] as const;

function SortSample() {
  const { t } = useTranslation('RadioList');
  const [value, setValue] = useState<SortValue>('newestFirst');
  return (
    <RadioList
      aria-label={t('sortCombats')}
      options={sortValues.map((option) => ({ value: option, label: t(option) }))}
      value={value}
      onChange={setValue}
    />
  );
}

function TagsSample() {
  const { t } = useTranslation('CheckList');
  const sheet = useTranslation('Sheet');
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<string[]>(['orcs', 'ferry']);
  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder={sheet.t('searchOrCreate')} />
      <CheckList
        options={tagKeys.map((key, index) => ({
          value: key,
          label: t(key),
          count: tagCounts[index],
        }))}
        values={values}
        onChange={setValues}
        query={query}
      />
    </>
  );
}

function FormSample() {
  const field = useTranslation('TextField');
  const area = useTranslation('TextArea');
  const sheet = useTranslation('Sheet');
  const [title, setTitle] = useState(field.t('titleValue'));
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<CombatColor>(LIMITS.color.min as CombatColor);
  return (
    <>
      <TextField
        label={field.t('title')}
        value={title}
        onChange={setTitle}
        maxLength={LIMITS.combatTitle}
        data-focus=""
      />
      <TextArea
        label={area.t('description')}
        value={description}
        onChange={setDescription}
        placeholder={area.t('optional')}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            fontSize: 'var(--mantine-font-size-meta)',
            fontWeight: 600,
            color: 'var(--cp-color-secondary)',
          }}
        >
          {sheet.t('color')}
        </span>
        <SwatchRow value={color} onChange={setColor} />
      </div>
    </>
  );
}

function LongSample() {
  const { t } = useTranslation('Sheet');
  const [values, setValues] = useState<string[]>([]);
  const options = Array.from({ length: 24 }, (_, index) => ({
    value: `tag-${index + 1}`,
    label: t('tag', { n: index + 1 }),
    count: index + 1,
  }));
  return <CheckList options={options} values={values} onChange={setValues} />;
}

const samples: Record<Sample, () => JSX.Element> = {
  sort: SortSample,
  tags: TagsSample,
  form: FormSample,
  long: LongSample,
};

function SheetCell({
  sample = 'sort',
  title,
  subtitle,
  primary,
  secondary = false,
  primaryDisabled = false,
  back = false,
  opened: initiallyOpened = true,
  withOpener = false,
  focusPrimary = false,
  header = false,
  actionsAs = 'list',
  onClose,
  onBack,
  onPrimary,
  onSecondary,
}: SheetCellProps) {
  const { t } = useTranslation('Sheet');
  const [opened, setOpened] = useState(initiallyOpened);
  const stageRef = useRef<HTMLDivElement>(null);
  const primaryRef = useMemo<RefObject<HTMLElement | null>>(
    () => ({
      get current() {
        return stageRef.current?.querySelector<HTMLElement>('[data-variant="primary"]') ?? null;
      },
    }),
    [],
  );
  const Content = samples[sample];
  const secondaryButton = secondary ? (
    <Button key="secondary" variant="secondary" size="M" fullWidth onClick={onSecondary}>
      {t('cancel')}
    </Button>
  ) : null;
  const primaryButton = (
    <Button
      key="primary"
      variant="primary"
      size="M"
      fullWidth
      disabled={primaryDisabled}
      onClick={onPrimary}
    >
      {primary ?? t('done')}
    </Button>
  );
  const actions = {
    list: [secondaryButton, primaryButton],
    fragment: (
      <>
        {secondaryButton}
        {primaryButton}
      </>
    ),
    none: undefined,
  }[actionsAs];
  return (
    <div style={stage} ref={stageRef}>
      {withOpener ? (
        <div style={{ padding: 'calc(var(--cp-layout-status-bar) + 12px) 12px 12px' }}>
          <Button variant="secondary" size="S" onClick={() => setOpened(true)}>
            Sort
          </Button>
        </div>
      ) : null}
      <Sheet
        opened={opened}
        initialFocus={focusPrimary ? primaryRef : undefined}
        title={title ?? t('sortCombats')}
        header={
          header ? (
            <span data-testid="custom-header" style={{ fontWeight: 700 }}>
              {title ?? t('sortCombats')}
            </span>
          ) : undefined
        }
        subtitle={subtitle}
        onBack={back ? onBack : undefined}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
        actions={actions}
      >
        <Content />
      </Sheet>
    </div>
  );
}

function TitledCell({
  titleKey = 'sortCombats',
  primaryKey,
  tagCount = 2,
  ...props
}: Omit<SheetCellProps, 'title' | 'primary' | 'subtitle'> & {
  titleKey?: 'sortCombats' | 'tags' | 'editCombat' | 'newCombat';
  primaryKey?: 'done' | 'doneTags' | 'save' | 'create';
  tagCount?: number;
}) {
  const { t } = useTranslation('Sheet');
  const title = titleKey === 'tags' ? t('tagsTitle', { name: 'Orc Berserker' }) : t(titleKey);
  const primary =
    primaryKey === 'doneTags' ? t('doneTags', { count: tagCount }) : primaryKey && t(primaryKey);
  const subtitle = titleKey === 'newCombat' ? t('titleRequired') : undefined;
  return <SheetCell {...props} title={title} primary={primary} subtitle={subtitle} />;
}

const meta = preview.meta({
  title: 'Organisms/Sheet',
  component: TitledCell,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    sample: 'sort',
    titleKey: 'sortCombats',
    onClose: fn(),
    onBack: fn(),
    onPrimary: fn(),
    onSecondary: fn(),
  },
});

export const Anatomy = meta.story({});

export const RadioSortCombats = meta.story({
  name: 'Radio: Sort combats',
});

export const ChecklistWithSearchTags = meta.story({
  name: 'Checklist with search: Tags',
  args: { sample: 'tags', titleKey: 'tags', primaryKey: 'doneTags' },
});

export const FormEditCombat = meta.story({
  name: 'Form: Edit combat',
  args: { sample: 'form', titleKey: 'editCombat', primaryKey: 'save' },
});

export const TwoButtonsPrimaryDisabled = meta.story({
  name: 'Two buttons, primary disabled',
  args: {
    sample: 'form',
    titleKey: 'newCombat',
    primaryKey: 'create',
    secondary: true,
    primaryDisabled: true,
  },
  play: async ({ args, canvas }) => {
    const create = canvas.getByRole('button', { name: 'Create' });
    await expect(create).toBeDisabled();
    await userEvent.click(create, { pointerEventsCheck: 0 });
    await expect(args.onPrimary).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('dialog', { name: 'New combat' })).toHaveAccessibleDescription(
      'Title is required',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onSecondary).toHaveBeenCalledOnce();
  },
});

export const LongTitleBack = meta.story({
  name: 'Long title, back',
  render: (args) => (
    <SheetCell
      {...args}
      sample="tags"
      title="Tags · Brother Tomas of the Silver Lantern Order"
      primary="Done"
      back
    />
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('dialog')).toBeVisible();
  },
});

export const Ru = meta.story({
  name: 'ru',
  render: (args) => (
    <SheetCell {...args} sample="sort" title="Сортировка сражений" primary="Готово" />
  ),
});

export const ExtraCloseButton = meta.story({
  name: 'Close button calls onClose only',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onBack).not.toHaveBeenCalled();
    await expect(args.onPrimary).not.toHaveBeenCalled();
    await expect(args.onSecondary).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraScrimTap = meta.story({
  name: 'Scrim tap calls onClose only',
  play: async ({ args, canvasElement }) => {
    const scrim = canvasElement.querySelector<HTMLElement>('[data-scrim]');
    await expect(scrim).not.toBeNull();
    if (scrim) await userEvent.click(scrim);
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onBack).not.toHaveBeenCalled();
    await expect(args.onPrimary).not.toHaveBeenCalled();
  },
});

export const ExtraEscape = meta.story({
  name: 'Escape closes',
  play: async ({ args, canvas }) => {
    await waitFor(() =>
      expect(canvas.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement),
    );
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onPrimary).not.toHaveBeenCalled();
  },
});

export const ExtraFocus = meta.story({
  name: 'Focus moves in on open and back to the opener on close',
  args: { opened: false, withOpener: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('dialog')).toBeNull();
    const opener = canvas.getByRole('button', { name: 'Sort' });
    await userEvent.click(opener);
    const sheet = await canvas.findByRole('dialog', { name: 'Sort combats' });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab();
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  },
});

export const ExtraMotionOnFocus = meta.story({
  name: 'Motion on: opening from closed focuses the section',
  args: { opened: false, withOpener: true },
  parameters: { motion: 'on' },
  play: async ({ canvas }) => {
    await expect(document.documentElement.dataset.motion).toBe('on');
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Sort combats' });
    await waitFor(() => expect(sheet).toHaveFocus());
    await userEvent.tab({ shift: true });
    await expect(canvas.getByRole('button', { name: 'Done' })).toHaveFocus();
  },
});

export const ExtraHeaderSlot = meta.story({
  name: 'A header slot replaces the title',
  args: { header: true },
  play: async ({ canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Sort combats' });
    await expect(canvas.getByTestId('custom-header')).toBeVisible();
    await expect(canvas.queryByRole('heading')).toBeNull();
    await expect(sheet).toContainElement(canvas.getByRole('button', { name: 'Close' }));
  },
});

export const ExtraLongContent = meta.story({
  name: 'Long content scrolls inside',
  args: { sample: 'long', titleKey: 'tags' },
  play: async ({ canvas, canvasElement }) => {
    const sheet = canvas.getByRole('dialog');
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const frameBox = frame?.getBoundingClientRect();
    const sheetBox = sheet.getBoundingClientRect();
    await expect(sheetBox.bottom).toBeLessThanOrEqual((frameBox?.bottom ?? 0) - 12);
    await expect(sheetBox.top).toBe((frameBox?.top ?? 0) + layout.statusBar + layout.sheet.inset);
    const body = sheet.querySelector<HTMLElement>('[data-sheet-content]');
    await expect(body).not.toBeNull();
    if (!body) return;
    await expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    const close = canvas.getByRole('button', { name: 'Close' });
    const done = canvas.getByRole('button', { name: 'Done' });
    const closeTop = close.getBoundingClientRect().top;
    const doneTop = done.getBoundingClientRect().top;
    body.scrollTop = body.scrollHeight;
    await waitFor(() => expect(body.scrollTop).toBeGreaterThan(0));
    await expect(close.getBoundingClientRect().top).toBe(closeTop);
    await expect(done.getBoundingClientRect().top).toBe(doneTop);
    await expect(done.getBoundingClientRect().bottom).toBeLessThanOrEqual(sheetBox.bottom);
    body.scrollTop = 0;
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { back: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Сортировка сражений' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Закрыть' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Назад' })).toBeVisible();
  },
});

export const ExtraShiftTab = meta.story({
  name: 'Shift+Tab right after opening stays inside',
  play: async ({ canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Sort combats' });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab({ shift: true });
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await expect(canvas.getByRole('button', { name: 'Done' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
  },
});

export const ExtraDescriptionIsSubtitle = meta.story({
  name: 'The description is the subtitle only',
  args: { sample: 'form', titleKey: 'editCombat', primaryKey: 'save' },
  play: async ({ canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Edit combat' });
    await expect(sheet).not.toHaveAttribute('aria-describedby');
    await expect(sheet).toHaveAccessibleDescription('');
  },
});

const FOCUS_RING_REACH = 5;

export const ExtraFocusRingInside = meta.story({
  name: 'Keyboard focus ring fits inside the scroll area',
  args: { sample: 'form', titleKey: 'editCombat', primaryKey: 'save' },
  play: async ({ canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Edit combat' });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    const field = canvas.getByRole('textbox', { name: 'Title' });
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    await expect(field).toHaveFocus();
    const frame = field.closest('[data-field]');
    const content = sheet.querySelector('[data-sheet-content]');
    await expect(frame).toBeInstanceOf(HTMLElement);
    await expect(content).toBeInstanceOf(HTMLElement);
    const ring = (frame as HTMLElement).getBoundingClientRect();
    const scroller = content as HTMLElement;
    const area = scroller.getBoundingClientRect();
    const left = area.left + scroller.clientLeft;
    const top = area.top + scroller.clientTop;
    await expect(ring.left - FOCUS_RING_REACH).toBeGreaterThanOrEqual(left);
    await expect(ring.top - FOCUS_RING_REACH).toBeGreaterThanOrEqual(top);
    await expect(ring.right + FOCUS_RING_REACH).toBeLessThanOrEqual(left + scroller.clientWidth);
    await expect(ring.bottom + FOCUS_RING_REACH).toBeLessThanOrEqual(top + scroller.clientHeight);
  },
});

export const ExtraNoActions = meta.story({
  name: 'No actions row without actions',
  args: { actionsAs: 'none' },
  play: async ({ canvas }) => {
    const sheet = canvas.getByRole('dialog', { name: 'Sort combats' });
    await expect(canvas.queryByRole('button', { name: 'Done' })).toBeNull();
    const last = sheet.lastElementChild;
    await expect(last).toHaveAttribute('data-sheet-content');
  },
});

export const ExtraFragmentActions = meta.story({
  name: 'Two actions in a Fragment sit side by side',
  args: {
    sample: 'form',
    titleKey: 'newCombat',
    primaryKey: 'create',
    secondary: true,
    actionsAs: 'fragment',
  },
  play: async ({ canvas }) => {
    const cancel = canvas.getByRole('button', { name: 'Cancel' }).getBoundingClientRect();
    const create = canvas.getByRole('button', { name: 'Create' }).getBoundingClientRect();
    await expect(cancel.top).toBe(create.top);
    await expect(cancel.right).toBeLessThan(create.left);
    await expect(cancel.width).toBe(create.width);
  },
});

export const ExtraOneTag = meta.story({
  name: 'Done with one tag',
  args: { sample: 'tags', titleKey: 'tags', primaryKey: 'doneTags', tagCount: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Done · 1 tag' })).toBeVisible();
  },
});

export const ExtraDoneTagsRu = meta.story({
  name: 'Done with tags, ru plurals',
  globals: { locale: 'ru' },
  args: { sample: 'tags', titleKey: 'tags', primaryKey: 'doneTags', tagCount: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Готово · 3 тега' })).toBeVisible();
  },
});

const recordFocus = () => {
  const targets: string[] = [];
  const record = (event: FocusEvent) => {
    const target = event.target as HTMLElement;
    targets.push(
      target.getAttribute('aria-label') ?? target.getAttribute('role') ?? target.textContent ?? '',
    );
  };
  document.addEventListener('focusin', record);
  return { targets, stop: () => document.removeEventListener('focusin', record) };
};

export const ExtraMotionOnNoCloseFocus = meta.story({
  name: 'Motion on: focus never rests on Close while the sheet enters',
  args: { opened: false, withOpener: true },
  parameters: { motion: 'on' },
  play: async ({ canvas }) => {
    const focus = recordFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Sort combats' });
    await waitFor(() => expect(sheet).toHaveFocus());
    await new Promise((resolve) => setTimeout(resolve, 300));
    focus.stop();
    await expect(sheet).toHaveFocus();
    await expect(focus.targets).not.toContain('Close');
    await expect(focus.targets).toEqual(['Sort', 'dialog']);
  },
});

export const ExtraInitialFocus = meta.story({
  name: 'initialFocus wins over the section',
  args: { opened: false, withOpener: true, focusPrimary: true },
  parameters: { motion: 'on' },
  play: async ({ canvas }) => {
    const focus = recordFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    const done = await canvas.findByRole('button', { name: 'Done' });
    await waitFor(() => expect(done).toHaveFocus());
    await new Promise((resolve) => setTimeout(resolve, 300));
    focus.stop();
    await expect(done).toHaveFocus();
    await expect(focus.targets).toEqual(['Sort', 'Done']);
  },
});

export const ExtraMotionOffNoTransition = meta.story({
  name: 'Motion off: the sheet opens without a transition',
  args: { opened: false, withOpener: true },
  play: async ({ canvas }) => {
    await expect(document.documentElement.dataset.motion).toBe('off');
    await userEvent.click(canvas.getByRole('button', { name: 'Sort' }));
    const sheet = await canvas.findByRole('dialog', { name: 'Sort combats' });
    await expect(sheet.style.transitionDuration).not.toBe('200ms');
    await waitFor(() => expect(sheet).toHaveFocus());
  },
});

export const ExtraClosedDoesNotBlock = meta.story({
  name: 'A closed sheet does not block the page beneath',
  args: { opened: false, withOpener: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('dialog')).toBeNull();
    const opener = canvas.getByRole('button', { name: 'Sort' });
    const box = opener.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    await expect(hit).not.toBeNull();
    await expect(opener).toContainElement(hit as HTMLElement);
  },
});
