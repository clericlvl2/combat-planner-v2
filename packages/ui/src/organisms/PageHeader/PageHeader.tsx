import { Loader, UnstyledButton } from '@mantine/core';
import { IconChevronLeft, IconDots, IconMenu2 } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { SearchField } from '../../atoms/SearchField/SearchField.tsx';
import { ToolButton } from '../../atoms/ToolButton/ToolButton.tsx';
import { Menu } from '../Menu/Menu.tsx';
import type { MenuItem } from '../Menu/Menu.tsx';
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
  loading?: boolean;
}

export interface PageHeaderFilter {
  id: string;
  label: string;
}

export interface PageHeaderMenu {
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
  busy?: boolean;
}

export interface PageHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  onMenu?: () => void;
  onBack?: () => void;
  action?: PageHeaderAction;
  menu?: PageHeaderMenu;
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
  menu,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBusy = menu?.busy === true;
  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.statusBar} aria-hidden="true" />
      <div className={classes.nav}>
        {back || onMenu ? (
          <IconButton
            className={back ? classes.back : classes.menu}
            variant="plain"
            size="M"
            icon={back ? IconChevronLeft : IconMenu2}
            aria-label={back ? t('back') : t('openNavigation')}
            onClick={() => (back ? onBack() : onMenu?.())}
          />
        ) : null}
        <h1 className={classes.title}>{title}</h1>
        {action ? (
          <Button
            className={classes.action}
            variant="secondary"
            size="S"
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
        {menu ? (
          <Menu
            opened={menuOpen}
            width={240}
            aria-label={t('actions')}
            items={menu.items}
            onSelect={(id) => {
              setMenuOpen(false);
              menu.onSelect(id);
            }}
            onClose={() => setMenuOpen(false)}
            target={
              <UnstyledButton
                component="button"
                type="button"
                className={classes.more}
                aria-label={t('actions')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-busy={menuBusy || undefined}
                disabled={menuBusy}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuBusy ? (
                  <Loader size={24} color="currentColor" />
                ) : (
                  <IconDots size={24} stroke={2} aria-hidden="true" />
                )}
              </UnstyledButton>
            }
          />
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
              loading={tool.loading}
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
          <Button
            className={classes.clear}
            variant="ghost"
            size="S"
            onClick={() => onClearFilters?.()}
          >
            {t('clear')}
          </Button>
        </div>
      ) : null}
    </header>
  );
}
