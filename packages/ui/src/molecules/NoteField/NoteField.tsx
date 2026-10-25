import { LIMITS } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { IconNote } from '@tabler/icons-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { TextArea } from '../../atoms/TextArea/TextArea.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './NoteField.module.css';

export interface NoteFieldProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'onChange' | 'onClick'
> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  collapsed?: boolean;
  readOnly?: boolean;
}

export function NoteField({
  value,
  onChange,
  placeholder,
  label,
  collapsed = false,
  readOnly = false,
  className,
  ...rest
}: NoteFieldProps) {
  const { t } = useTranslation('NoteField');
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const fieldLabel = label ?? t('label');
  const emptyText = placeholder ?? t('placeholder');
  const rootClass = (base: string | undefined) => (className ? `${base} ${className}` : base);

  const updateDraft = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  const commit = () => {
    const next = draftRef.current;
    if (next === null) return;
    updateDraft(null);
    if (next !== value) onChange(next);
  };

  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (collapsed) commitRef.current();
  }, [collapsed]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    commit();
  };

  const focusEditor = (event: MouseEvent<HTMLDivElement>) => {
    const editor = event.currentTarget.querySelector('textarea');
    if (!editor || event.target === editor) return;
    event.preventDefault();
    editor.focus();
  };

  if (collapsed) {
    if (!value) return null;
    return (
      <div {...rest} className={rootClass(classes.line)}>
        <IconNote
          className={classes.lineIcon}
          size={iconSizes.S}
          stroke={2}
          role="img"
          aria-label={fieldLabel}
        />
        <span className={classes.lineText} data-note-line="" data-ellipsis="">
          {value}
        </span>
      </div>
    );
  }

  if (draft !== null) {
    return (
      <div
        {...rest}
        className={rootClass(classes.field)}
        data-editing=""
        data-field=""
        onMouseDown={focusEditor}
      >
        <label className={classes.label} htmlFor={inputId}>
          {fieldLabel}
        </label>
        <TextArea
          id={inputId}
          className={classes.editor}
          value={draft}
          onChange={updateDraft}
          maxLength={LIMITS.note}
          counter={false}
          rows={1}
          autoFocus
          enterKeyHint="done"
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  const content = (
    <>
      <span className={classes.label}>{fieldLabel}</span>
      <span className={classes.text} data-empty={value ? undefined : ''}>
        {value || emptyText}
      </span>
    </>
  );

  if (readOnly) {
    return (
      <div {...rest} className={rootClass(classes.field)} data-readonly="">
        {content}
      </div>
    );
  }

  return (
    <UnstyledButton
      {...rest}
      component="button"
      type="button"
      className={rootClass(classes.field)}
      aria-label={value ? `${fieldLabel}: ${value}` : fieldLabel}
      onClick={() => updateDraft(value)}
    >
      {content}
    </UnstyledButton>
  );
}
