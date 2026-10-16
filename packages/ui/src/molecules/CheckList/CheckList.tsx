import { UnstyledButton } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '../../atoms/Checkbox/Checkbox.tsx';
import classes from './CheckList.module.css';

export type CheckListSize = 'S' | 'M' | 'L';

export interface CheckListOption {
  value: string;
  label: string;
  count?: number;
}

export interface CheckListProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  options: readonly CheckListOption[];
  values: readonly string[];
  onChange: (values: string[]) => void;
  query?: string;
  onCreate?: (label: string) => void;
  createLabel?: string;
  emptyLabel?: string;
  size?: CheckListSize;
  disabled?: boolean;
}

const normalize = (text: string) => text.trim().toLocaleLowerCase();

export function CheckList({
  options,
  values,
  onChange,
  query = '',
  onCreate,
  createLabel,
  emptyLabel,
  size = 'M',
  disabled = false,
  className,
  ...rest
}: CheckListProps) {
  const { t } = useTranslation('CheckList');
  const needle = normalize(query);
  const searching = needle !== '';
  const shown = searching
    ? options.filter((option) => normalize(option.label).includes(needle))
    : options;
  const exactMatch = options.some((option) => normalize(option.label) === needle);
  const canCreate = searching && !exactMatch && onCreate !== undefined;
  const createOnTop = canCreate && shown.length === 0;
  const selected = new Set(values);

  const toggle = (value: string, checked: boolean) => {
    if (disabled) return;
    onChange(
      checked ? [...values.filter((v) => v !== value), value] : values.filter((v) => v !== value),
    );
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLLabelElement>, value: string) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    toggle(value, !selected.has(value));
  };

  const createRow = (active: boolean) => (
    <UnstyledButton
      component="button"
      type="button"
      className={classes.create}
      data-active={active || undefined}
      disabled={disabled}
      onClick={() => onCreate?.(query.trim())}
    >
      <span className={classes.createIcon}>
        <IconPlus size={20} stroke={2} aria-hidden="true" />
      </span>
      <span className={classes.createLabel}>
        {createLabel ?? t('create', { query: query.trim() })}
      </span>
    </UnstyledButton>
  );

  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
      role="group"
    >
      {createOnTop ? createRow(true) : null}
      {shown.map((option, index) => {
        const checked = selected.has(option.value);
        return (
          <Checkbox
            key={option.value}
            className={classes.row}
            data-active={(searching && !createOnTop && index === 0) || undefined}
            checked={checked}
            disabled={disabled}
            onChange={(next) => toggle(option.value, next)}
            onKeyDown={(event) => handleRowKeyDown(event, option.value)}
            label={
              <>
                <span className={classes.name}>{option.label}</span>
                {option.count === undefined ? null : (
                  <span className={classes.count}>{option.count}</span>
                )}
              </>
            }
          />
        );
      })}
      {canCreate && !createOnTop ? createRow(false) : null}
      {searching && shown.length === 0 ? (
        <span className={classes.empty}>{emptyLabel ?? t('noMatch')}</span>
      ) : null}
    </div>
  );
}
