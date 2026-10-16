import { IconChevronLeft, IconMenu2 } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { SearchField } from '../../atoms/SearchField/SearchField.tsx';
import { ToolButton } from '../../atoms/ToolButton/ToolButton.tsx';
import classes from './PageHeader.module.css';

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface PageHeaderSearch {
  value: string;
  placeholder: string;
}

export interface PageHeaderTool {
  id: string;
  icon: Icon;
  label?: string;
  'aria-label'?: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
}

export interface PageHeaderFilter {
  id: string;
  label: string;
}

export interface PageHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  onMenu?: () => void;
  onBack?: () => void;
  action?: PageHeaderAction;
  search?: PageHeaderSearch;
  onSearch?: (value: string) => void;
  tools?: readonly PageHeaderTool[];
  onTool?: (id: string) => void;
  filters?: readonly PageHeaderFilter[];
  onRemoveFilter?: (id: string) => void;
  onClearFilters?: () => void;
}

export function PageHeader({
  title,
  onMenu,
  onBack,
  action,
  search,
  onSearch,
  tools = [],
  onTool,
  filters = [],
  onRemoveFilter,
  onClearFilters,
  className,
  ...rest
}: PageHeaderProps) {
  const { t } = useTranslation('PageHeader');
  const back = onBack !== undefined;
  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.statusBar} aria-hidden="true" />
      <div className={classes.nav}>
        {back || onMenu ? (
          <IconButton
            variant="plain"
            size="M"
            icon={back ? IconChevronLeft : IconMenu2}
            aria-label={back ? t('back') : t('openNavigation')}
            onClick={() => (back ? onBack() : onMenu?.())}
          />
        ) : null}
        <h1 className={classes.title}>{title}</h1>
        {action ? (
          <Button variant="primary" size="S" disabled={action.disabled} onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </div>
      {search || tools.length > 0 ? (
        <div className={classes.tools}>
          {search ? (
            <SearchField
              className={classes.search}
              size="M"
              value={search.value}
              placeholder={search.placeholder}
              onChange={(value) => onSearch?.(value)}
            />
          ) : null}
          {tools.map((tool) => (
            <ToolButton
              key={tool.id}
              size="M"
              icon={tool.icon}
              label={tool.label}
              count={tool.count}
              active={tool.active}
              disabled={tool.disabled}
              aria-label={tool['aria-label']}
              onClick={() => onTool?.(tool.id)}
            />
          ))}
        </div>
      ) : null}
      {filters.length > 0 ? (
        <div className={classes.filters}>
          {filters.map((filter) => (
            <Chip
              key={filter.id}
              variant="tag"
              size="L"
              selected
              aria-label={t('removeFilter', { name: filter.label })}
              onRemove={() => onRemoveFilter?.(filter.id)}
            >
              {filter.label}
            </Chip>
          ))}
          <Button variant="ghost" size="S" onClick={() => onClearFilters?.()}>
            {t('clear')}
          </Button>
        </div>
      ) : null}
    </header>
  );
}
