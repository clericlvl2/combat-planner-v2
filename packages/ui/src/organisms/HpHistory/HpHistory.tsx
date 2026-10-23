import type { HpHistoryEntry } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useId } from 'react';
import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { HistoryRow } from '../../molecules/HistoryRow/HistoryRow.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './HpHistory.module.css';

export const HP_HISTORY_VISIBLE_ROWS = 6;

interface HpHistoryBaseProps {
  entries: readonly HpHistoryEntry[];
  maxHp: number;
}

export interface HpHistoryInlineProps
  extends HpHistoryBaseProps, Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  variant: 'inline';
  expanded: boolean;
  onToggle: () => void;
}

export interface HpHistorySheetProps extends HpHistoryBaseProps {
  variant: 'sheet';
  unitName: string;
  opened: boolean;
  onClose: () => void;
}

export type HpHistoryProps = HpHistoryInlineProps | HpHistorySheetProps;

interface HpHistoryListProps extends HpHistoryBaseProps {
  id?: string;
  label: string;
  inset: boolean;
}

const KEY_SCROLL_STEP = 40;

function pageStep(node: HTMLElement): number {
  const row = node.querySelector<HTMLElement>('[role="listitem"]');
  return node.clientHeight - (row?.offsetHeight ?? 0);
}

function scrollDelta(key: string, node: HTMLElement): number | null {
  if (key === 'ArrowDown') return KEY_SCROLL_STEP;
  if (key === 'ArrowUp') return -KEY_SCROLL_STEP;
  if (key === 'PageDown') return pageStep(node);
  if (key === 'PageUp') return -pageStep(node);
  if (key === 'End') return node.scrollHeight;
  if (key === 'Home') return -node.scrollHeight;
  return null;
}

function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  const node = event.currentTarget;
  const delta = scrollDelta(event.key, node);
  if (delta === null) return;
  event.preventDefault();
  node.scrollTop += delta;
}

function HpHistoryList({ entries, maxHp, id, label, inset }: HpHistoryListProps) {
  const { t } = useTranslation('HpHistory');
  const long = entries.length > HP_HISTORY_VISIBLE_ROWS;
  return (
    <div id={id} className={classes.listFrame} data-inset={inset || undefined}>
      {entries.length === 0 ? (
        <p className={classes.empty}>{t('empty')}</p>
      ) : (
        <ScrollList
          className={classes.list}
          contentClassName={classes.listContent}
          data-long={long || undefined}
          viewportProps={{
            role: 'list',
            'aria-label': label,
            tabIndex: long ? 0 : undefined,
            onKeyDown: long ? handleListKeyDown : undefined,
          }}
        >
          {entries.map((entry, index) => (
            <HistoryRow key={`${entry.at}-${index}`} role="listitem" entry={entry} maxHp={maxHp} />
          ))}
        </ScrollList>
      )}
    </div>
  );
}

function HpHistoryInline({
  entries,
  maxHp,
  expanded,
  onToggle,
  className,
  variant,
  ...rest
}: HpHistoryInlineProps) {
  const { t } = useTranslation('HpHistory');
  const listId = useId();
  const Chevron = expanded ? IconChevronUp : IconChevronDown;
  return (
    <section
      {...rest}
      className={className ? `${classes.inline} ${className}` : classes.inline}
      data-variant={variant}
      data-expanded={expanded || undefined}
    >
      <UnstyledButton
        component="button"
        type="button"
        className={classes.header}
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        onClick={() => onToggle()}
      >
        <span className={classes.heading}>{t('title')}</span>
        {!expanded && entries.length > 0 ? (
          <span className={classes.count}>{t('count', { count: entries.length })}</span>
        ) : null}
        <Chevron size={20} stroke={2} aria-hidden="true" />
      </UnstyledButton>
      {expanded ? (
        <HpHistoryList
          id={listId}
          entries={entries}
          maxHp={maxHp}
          label={t('title')}
          inset={true}
        />
      ) : null}
    </section>
  );
}

function HpHistorySheet({ entries, maxHp, unitName, opened, onClose }: HpHistorySheetProps) {
  const { t } = useTranslation('HpHistory');
  const summary = entries.length > 0 ? t('count', { count: entries.length }) : t('empty');
  return (
    <Sheet
      opened={opened}
      title={t('title')}
      subtitle={`${unitName} · ${summary}`}
      onClose={onClose}
    >
      <HpHistoryList entries={entries} maxHp={maxHp} label={t('title')} inset={false} />
    </Sheet>
  );
}

export function HpHistory(props: HpHistoryProps) {
  return props.variant === 'inline' ? (
    <HpHistoryInline {...props} />
  ) : (
    <HpHistorySheet {...props} />
  );
}
