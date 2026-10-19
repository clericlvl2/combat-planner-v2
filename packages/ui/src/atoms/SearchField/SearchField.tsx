import { UnstyledButton } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useRef } from 'react';
import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './SearchField.module.css';

export type SearchFieldSize = 'S' | 'M' | 'L';

const iconSize: Record<SearchFieldSize, number> = { S: 16, M: 20, L: 24 };

export interface SearchFieldProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  size?: SearchFieldSize;
}

export function SearchField({
  value,
  onChange,
  onClear,
  placeholder,
  maxLength,
  disabled = false,
  size = 'M',
  className,
  ...rest
}: SearchFieldProps) {
  const { t } = useTranslation('SearchField');
  const inputRef = useRef<HTMLInputElement>(null);
  const shownPlaceholder = placeholder ?? t('search');
  const accessibleName = placeholder || t('search');
  const clearVisible = value !== '' && !disabled;

  const clear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleFrameMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
      data-field=""
      onMouseDown={handleFrameMouseDown}
    >
      <IconSearch className={classes.icon} size={iconSize[size]} stroke={2} aria-hidden="true" />
      <input
        ref={inputRef}
        className={classes.input}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={shownPlaceholder}
        aria-label={accessibleName}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {clearVisible ? (
        <UnstyledButton
          component="button"
          type="button"
          className={classes.clear}
          aria-label={t('clear')}
          onClick={clear}
        >
          <IconX size={20} stroke={2} aria-hidden="true" />
        </UnstyledButton>
      ) : null}
    </div>
  );
}
